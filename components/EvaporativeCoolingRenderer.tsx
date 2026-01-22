'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const EvaporativeCoolingRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Game-specific state
  const [skinWet, setSkinWet] = useState(false);
  const [humidity, setHumidity] = useState(30);
  const [skinTemp, setSkinTemp] = useState(37);
  const [waterDroplets, setWaterDroplets] = useState<{ x: number; y: number; id: number }[]>([]);
  const [evaporatingDroplets, setEvaporatingDroplets] = useState<number[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const dropletIdRef = useRef(0);

  // Twist state - wind effect
  const [windSpeed, setWindSpeed] = useState(0);
  const [twistSkinWet, setTwistSkinWet] = useState(true);
  const [twistSkinTemp, setTwistSkinTemp] = useState(37);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Constants
  const bodyTempNormal = 37;

  // Mobile detection
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Calculate evaporation rate
  const calculateEvaporationRate = useCallback((humid: number, wind: number = 0): number => {
    const baseRate = (100 - humid) / 100;
    const windFactor = 1 + wind / 10;
    return baseRate * windFactor;
  }, []);

  // Calculate cooling effect
  const calculateCooling = useCallback((evapRate: number): number => {
    return evapRate * 3;
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Evaporation simulation
  useEffect(() => {
    if (!skinWet || waterDroplets.length === 0) return;

    const evapRate = calculateEvaporationRate(humidity);
    const interval = setInterval(() => {
      if (Math.random() < evapRate * 0.3) {
        const droplet = waterDroplets[Math.floor(Math.random() * waterDroplets.length)];
        if (droplet && !evaporatingDroplets.includes(droplet.id)) {
          setEvaporatingDroplets((prev) => [...prev, droplet.id]);
          setTimeout(() => {
            setWaterDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
            setEvaporatingDroplets((prev) => prev.filter((id) => id !== droplet.id));
          }, 500);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [skinWet, waterDroplets, humidity, evaporatingDroplets, calculateEvaporationRate]);

  // Update skin temperature
  useEffect(() => {
    if (!skinWet) {
      setSkinTemp(bodyTempNormal);
      return;
    }
    const evapRate = calculateEvaporationRate(humidity);
    const cooling = calculateCooling(evapRate);
    setSkinTemp(bodyTempNormal - cooling);
  }, [skinWet, humidity, calculateEvaporationRate, calculateCooling]);

  // Twist: Update temperature with wind
  useEffect(() => {
    if (!twistSkinWet) {
      setTwistSkinTemp(bodyTempNormal);
      return;
    }
    const evapRate = calculateEvaporationRate(humidity, windSpeed);
    const cooling = calculateCooling(evapRate);
    setTwistSkinTemp(bodyTempNormal - cooling);
  }, [twistSkinWet, humidity, windSpeed, calculateEvaporationRate, calculateCooling]);

  // Add water droplets
  const wetTheSkin = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSkinWet(true);
    const newDroplets: { x: number; y: number; id: number }[] = [];
    for (let i = 0; i < 20; i++) {
      newDroplets.push({
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 150,
        id: dropletIdRef.current++,
      });
    }
    setWaterDroplets(newDroplets);
    playSound('click');
  };

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
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

  // Get skin color based on temperature
  const getSkinColor = (temp: number): string => {
    if (temp >= 37) return "#e8b4a0";
    if (temp >= 35) return "#d4a090";
    if (temp >= 33) return "#c09080";
    return "#b08878";
  };

  const testQuestions = [
    { question: "What provides the energy for water to evaporate from your skin?", options: ["The air around you", "Heat from your skin (body)", "The water itself", "Sunlight only"], correct: 1 },
    { question: "Why doesn't sweating cool you down as well in humid weather?", options: ["Sweat is different in humid weather", "Your body produces less sweat", "Air saturated with water can't accept more evaporation", "Humidity makes sweat hotter"], correct: 2 },
    { question: "The latent heat of vaporization for water is about:", options: ["226 J/g", "2,260 J/g", "22,600 J/g", "4.18 J/g"], correct: 1 },
    { question: "Why does blowing on wet skin cool it faster?", options: ["Your breath is cold", "Moving air carries away humid air, allowing faster evaporation", "Blowing adds water to your skin", "It doesn't actually cool faster"], correct: 1 },
    { question: "Why do dogs pant instead of sweating?", options: ["Dogs can't produce sweat", "Fur traps sweat; panting evaporates water from tongue and lungs", "Panting is just for breathing", "Dogs don't need to cool down"], correct: 1 },
    { question: "Rubbing alcohol evaporates faster than water and feels colder because:", options: ["Alcohol is colder than water", "Alcohol evaporates faster, removing heat more quickly", "Alcohol absorbs heat from the air", "Alcohol reflects body heat"], correct: 1 },
    { question: "In a desert with 10% humidity vs a jungle with 90%, which cools better by sweating?", options: ["Jungle (more moisture)", "Desert (lower humidity allows more evaporation)", "They're the same", "Neither - too hot to sweat"], correct: 1 },
    { question: "Why does getting out of a swimming pool make you feel cold?", options: ["Pool water is always cold", "Air temperature drops near pools", "Water on skin evaporates rapidly, pulling heat from your body", "Chlorine makes water feel colder"], correct: 2 },
    { question: "Evaporative coolers (swamp coolers) work best in:", options: ["Humid climates", "Dry climates", "Cold climates", "Any climate equally"], correct: 1 },
    { question: "Which takes more energy: heating 1g of water by 1C, or evaporating 1g of water?", options: ["Heating by 1C (specific heat)", "Evaporating (latent heat)", "They're the same", "Depends on the temperature"], correct: 1 }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === testQuestions[index].correct ? 1 : 0), 0);

  const applications = [
    {
      title: "Sweating in Humans",
      icon: "💪",
      description: "Humans can produce 2-4 liters of sweat per hour during intense exercise. At 2,260 J/g, evaporating 1 liter removes 2.26 MJ of heat!",
      details: "That's equivalent to a 1,000W heater running for 40 minutes."
    },
    {
      title: "Evaporative Coolers",
      icon: "❄️",
      description: "Desert coolers (swamp coolers) blow air through wet pads. Water evaporates, cooling the air by 10-15C.",
      details: "They use 75% less electricity than AC but only work in low humidity (<30%)."
    },
    {
      title: "Wet Bulb Temperature",
      icon: "🌡️",
      description: "Meteorologists use wet bulb temperature to measure humidity's effect on cooling.",
      details: "A thermometer wrapped in wet cloth shows how much evaporation can cool - critical for heat wave warnings."
    },
    {
      title: "Cooling Towers",
      icon: "🏭",
      description: "Power plants and factories use massive cooling towers. Hot water sprays through the air, evaporating partially.",
      details: "The remaining water cools by 10-20C and recirculates."
    }
  ];

  // Render skin visualization
  const renderSkinVisualization = (wet: boolean, temp: number, wind: number = 0) => {
    const evapRate = calculateEvaporationRate(humidity, wind);

    return (
      <svg viewBox="0 0 400 350" className="w-full max-w-md mx-auto">
        <defs>
          <linearGradient id="airGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#2d4a6f" />
          </linearGradient>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={getSkinColor(temp)} />
            <stop offset="100%" stopColor="#d4a088" />
          </linearGradient>
        </defs>

        <rect width="400" height="100" fill="url(#airGradient)" />

        {[...Array(Math.round(humidity / 10))].map((_, i) => (
          <circle
            key={i}
            cx={50 + i * 35 + Math.sin(animationFrame / 10 + i) * 10}
            cy={30 + Math.cos(animationFrame / 15 + i) * 15}
            r={3}
            fill="rgba(100, 149, 237, 0.5)"
          />
        ))}

        {wind > 0 && (
          <g>
            {[...Array(Math.round(wind / 2))].map((_, i) => {
              const x = 30 + ((animationFrame * 2 + i * 50) % 340);
              return (
                <g key={i} transform={`translate(${x}, ${40 + i * 15})`}>
                  <path d="M 0 0 L 20 0 L 15 -5 M 20 0 L 15 5" fill="none" stroke="#60a5fa" strokeWidth={2} />
                </g>
              );
            })}
          </g>
        )}

        <rect y="100" width="400" height="250" fill="url(#skinGradient)" />

        {[...Array(8)].map((_, i) => (
          <path
            key={i}
            d={`M ${i * 50 + 25} 100 Q ${i * 50 + 40} 150 ${i * 50 + 25} 200`}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={1}
          />
        ))}

        {wet && waterDroplets.map((droplet) => {
          const isEvaporating = evaporatingDroplets.includes(droplet.id);
          return (
            <g key={droplet.id}>
              <ellipse
                cx={droplet.x}
                cy={droplet.y}
                rx={isEvaporating ? 4 : 6}
                ry={isEvaporating ? 2 : 4}
                fill="rgba(100, 149, 237, 0.7)"
                className={isEvaporating ? "animate-pulse" : ""}
              />
              {isEvaporating && (
                <g>
                  {[0, 1, 2].map((i) => (
                    <circle
                      key={i}
                      cx={droplet.x + (i - 1) * 8}
                      cy={droplet.y - 10 - animationFrame % 20}
                      r={3}
                      fill="rgba(100, 149, 237, 0.3)"
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {wet && evapRate > 0 && (
          <g>
            {[...Array(Math.round(evapRate * 5))].map((_, i) => {
              const x = 80 + i * 60 + Math.sin(animationFrame / 20 + i) * 20;
              const y = 95 - (animationFrame + i * 10) % 50;
              const opacity = 0.3 * (1 - ((animationFrame + i * 10) % 50) / 50);
              return (
                <circle key={i} cx={x} cy={y} r={4} fill={`rgba(100, 149, 237, ${opacity})`} />
              );
            })}
          </g>
        )}

        <g transform="translate(320, 150)">
          <rect x={0} y={0} width={50} height={120} fill="#1f2937" stroke="#374151" rx={5} />
          <rect
            x={10}
            y={110 - (temp - 30) * 10}
            width={30}
            height={(temp - 30) * 10}
            fill={temp >= 36 ? '#ef4444' : temp >= 34 ? '#fbbf24' : '#3b82f6'}
            rx={3}
          />
          <text x={25} y={-10} textAnchor="middle" fontSize="12" fill="#e5e7eb">
            {temp.toFixed(1)}C
          </text>
          <text x={25} y={135} textAnchor="middle" fontSize="10" fill="#9ca3af">
            Skin Temp
          </text>
        </g>

        <text x={20} y={30} fontSize="12" fill="#e5e7eb">Humidity: {humidity}%</text>
        <text x={20} y={50} fontSize="12" fill="#e5e7eb">Evap Rate: {(evapRate * 100).toFixed(0)}%</text>
        {wind > 0 && (
          <text x={20} y={70} fontSize="12" fill="#60a5fa">Wind: {wind} m/s</text>
        )}
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Evaporative Cooling
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why sweating keeps you cool and how phase changes remove heat
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">💧 🌡️ ❄️</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You step out of a shower, and even though the bathroom is warm, you feel chilly.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Your wet skin loses heat rapidly as water evaporates. But where does that cooling power come from?
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                Water doesn't just disappear - evaporation requires enormous energy!
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Evaporative Cooling
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Your skin is wet with water. As the water evaporates, where does the energy come from to change liquid water into water vapor?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The surrounding air - warm air provides the energy' },
          { id: 'B', text: 'Your skin - the water "steals" heat from your body' },
          { id: 'C', text: 'The water itself - it has stored energy' },
          { id: 'D', text: 'Only sunlight can provide evaporation energy' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! The water pulls heat energy from your skin to evaporate. That's why wet skin feels cold - it's literally losing heat!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Evaporation & Skin Temperature</h2>
      <p className="text-slate-400 mb-4">Wet your skin and adjust humidity to see how evaporation affects temperature!</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderSkinVisualization(skinWet, skinTemp)}

        <button
          onMouseDown={(e) => { e.preventDefault(); wetTheSkin(); }}
          disabled={skinWet && waterDroplets.length > 0}
          className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
            skinWet && waterDroplets.length > 0
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-400"
          }`}
        >
          {skinWet && waterDroplets.length > 0 ? "Water Evaporating..." : "💧 Wet the Skin"}
        </button>
      </div>

      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-4">
        <label className="text-slate-300 text-sm block mb-2">Air Humidity: {humidity}%</label>
        <input
          type="range"
          min="10"
          max="95"
          value={humidity}
          onChange={(e) => setHumidity(parseInt(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Desert (10%)</span>
          <span>Normal (50%)</span>
          <span>Jungle (95%)</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-cyan-400">{skinTemp.toFixed(1)}C</div>
            <div className="text-sm text-slate-300">Skin Temp</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{(37 - skinTemp).toFixed(1)}C</div>
            <div className="text-sm text-slate-300">Cooling</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{(calculateEvaporationRate(humidity) * 100).toFixed(0)}%</div>
            <div className="text-sm text-slate-300">Evap Rate</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Evaporative Cooling</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🔥 Latent Heat of Vaporization</h3>
          <p className="text-slate-300 text-sm mb-2">Converting liquid water to vapor requires enormous energy:</p>
          <div className="font-mono text-center text-lg text-white mb-2">Lv = 2,260 J/g</div>
          <p className="text-slate-300 text-sm">This energy comes from whatever is in contact with the water - your skin!</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">💧 Where Does the Heat Go?</h3>
          <p className="text-slate-300 text-sm">
            Water molecules need energy to break free from liquid and become gas. They "steal" this energy from your skin as heat. The fastest-moving (hottest) molecules escape first, leaving cooler ones behind.
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">💨 Humidity's Role</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">Low Humidity (Desert)</p>
              <p className="text-slate-400">Lots of "room" for vapor - fast evaporation - strong cooling</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">High Humidity (Jungle)</p>
              <p className="text-slate-400">Air "full" - slow evaporation - weak cooling</p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Wind Twist</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You have wet skin. Someone starts blowing air across it (like a fan). The humidity stays the same.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the cooling effect when wind blows across wet skin?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Cooling increases - wind speeds up evaporation' },
          { id: 'B', text: 'Cooling decreases - wind "blows away" the cool' },
          { id: 'C', text: 'No change - humidity is what matters' },
          { id: 'D', text: 'Skin dries instantly, no more cooling' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Wind removes the saturated boundary layer, allowing fresh dry air to contact the wet surface and accelerate evaporation.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            See Wind Effect in Action
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Wind & Evaporative Cooling</h2>
      <p className="text-slate-400 mb-4">Adjust wind speed and see how it affects the cooling!</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderSkinVisualization(twistSkinWet, twistSkinTemp, windSpeed)}

        <button
          onMouseDown={(e) => { e.preventDefault(); setTwistSkinWet(true); }}
          disabled={twistSkinWet}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            twistSkinWet ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-400"
          }`}
        >
          {twistSkinWet ? "Skin is Wet" : "💧 Wet the Skin"}
        </button>
      </div>

      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-4">
        <label className="text-slate-300 text-sm block mb-2">Wind Speed: {windSpeed} m/s</label>
        <input
          type="range"
          min="0"
          max="10"
          value={windSpeed}
          onChange={(e) => setWindSpeed(parseInt(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Still Air</span>
          <span>Light Breeze</span>
          <span>Strong Wind</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 w-full max-w-2xl">
        <div className="bg-slate-700/50 p-3 rounded-lg">
          <h4 className="font-bold text-sm text-white">No Wind</h4>
          <p className="text-sm text-slate-300">Temp: {(37 - calculateCooling(calculateEvaporationRate(humidity, 0))).toFixed(1)}C</p>
        </div>
        <div className="bg-amber-900/30 p-3 rounded-lg">
          <h4 className="font-bold text-sm text-white">With Wind</h4>
          <p className="text-sm text-slate-300">Temp: {twistSkinTemp.toFixed(1)}C</p>
          <p className="text-xs text-amber-400">
            {windSpeed > 0 ? `${((37 - twistSkinTemp) - calculateCooling(calculateEvaporationRate(humidity, 0))).toFixed(1)}C extra cooling!` : "Add wind!"}
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Wind Chill & Evaporation</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">💨 Why Wind Helps</h3>
          <p className="text-slate-300 text-sm mb-2">
            A thin layer of humid air forms right above wet skin. This "boundary layer" is nearly saturated with vapor, slowing further evaporation.
          </p>
          <p className="text-slate-300 text-sm">
            Wind blows this humid layer away, replacing it with drier air. Result: faster evaporation and more cooling!
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🌡️ Wind Chill Effect</h3>
          <p className="text-slate-300 text-sm">
            This is why wind feels colder than still air at the same temperature. It's not that the air IS colder - it just removes heat faster by:
          </p>
          <ul className="text-sm text-slate-300 mt-2 space-y-1">
            <li>1. Increasing evaporation (if wet)</li>
            <li>2. Breaking up the insulating air layer</li>
          </ul>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
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
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-blue-600 text-white'
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
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
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
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered evaporative cooling!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
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
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">💧</div>
        <h1 className="text-3xl font-bold text-white mb-4">Cooling Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered evaporative cooling and heat transfer!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌡️</div><p className="text-sm text-slate-300">Latent Heat</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💨</div><p className="text-sm text-slate-300">Wind Chill</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💧</div><p className="text-sm text-slate-300">Humidity Effects</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">❄️</div><p className="text-sm text-slate-300">Swamp Coolers</p></div>
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          Explore Again
        </button>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Evaporative Cooling</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default EvaporativeCoolingRenderer;
