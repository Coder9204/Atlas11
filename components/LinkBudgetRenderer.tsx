'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 197: LINK BUDGET CALCULATION
// Physics: Link Budget = P_tx + G_tx - FSPL + G_rx - System Losses
// Free Space Path Loss: FSPL = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
// ============================================================================

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: number;
}

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const LinkBudgetRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase !== undefined && gamePhase >= 0 && gamePhase <= 9) {
      return gamePhase as Phase;
    }
    return 0;
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [distance, setDistance] = useState(400); // km
  const [frequency, setFrequency] = useState(10); // GHz
  const [txPower, setTxPower] = useState(10); // dBW
  const [txGain, setTxGain] = useState(40); // dBi
  const [rxGain, setRxGain] = useState(30); // dBi
  const [animPhase, setAnimPhase] = useState(0);

  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames = [
    'Hook', 'Predict', 'Play', 'Review',
    'Twist Predict', 'Twist Play', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Physics calculations
  const calculateLinkBudget = useCallback(() => {
    // Free Space Path Loss (dB)
    // FSPL = 20*log10(d_km) + 20*log10(f_GHz) + 92.45 dB
    const fspl = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 92.45;

    // EIRP (Effective Isotropic Radiated Power)
    const eirp = txPower + txGain;

    // Received Power
    const rxPower = eirp - fspl + rxGain;

    // Noise floor (typical for satellite receiver)
    const noiseFloor = -120; // dBm

    // Signal to Noise Ratio
    const snr = rxPower - noiseFloor;

    // Link margin (assuming required SNR of 10 dB for reliable comms)
    const requiredSnr = 10;
    const margin = snr - requiredSnr;

    return {
      fspl: fspl.toFixed(1),
      eirp: eirp.toFixed(1),
      rxPower: rxPower.toFixed(1),
      snr: snr.toFixed(1),
      margin: margin.toFixed(1),
      linkStatus: margin > 0 ? 'GOOD' : 'MARGINAL',
      marginValue: margin
    };
  }, [distance, frequency, txPower, txGain, rxGain]);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase >= 0 && gamePhase <= 9 && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click') => {
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

      const soundConfigs: Record<string, () => void> = {
        transition: () => {
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
        },
        correct: () => {
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
        },
        incorrect: () => {
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
        },
        complete: () => {
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(392, ctx.currentTime);
          oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        },
        click: () => {
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.05);
        }
      };

      soundConfigs[soundType]?.();
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (newPhase < 0 || newPhase > 9) return;
    navigationLockRef.current = true;
    playSound('transition');

    setPhase(newPhase as Phase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent, phaseNames]);

  const goNext = useCallback(() => {
    if (phase < 9) goToPhase(phase + 1);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    if (phase > 0) goToPhase(phase - 1);
  }, [phase, goToPhase]);

  // Progress bar showing all 10 phases
  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #334155',
      backgroundColor: '#0f172a',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseNames.map((name, i) => (
            <div
              key={i}
              onClick={() => i <= phase && goToPhase(i)}
              style={{
                height: '8px',
                width: i === phase ? '24px' : '8px',
                borderRadius: '4px',
                backgroundColor: i < phase ? '#22c55e' : i === phase ? '#06b6d4' : '#334155',
                cursor: i <= phase ? 'pointer' : 'default',
                transition: 'all 0.3s'
              }}
              title={name}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
          {phase + 1} / {phaseNames.length}
        </span>
      </div>
      <div style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: 'rgba(6, 182, 212, 0.2)',
        color: '#06b6d4',
        fontSize: '11px',
        fontWeight: 700
      }}>
        {phaseNames[phase]}
      </div>
    </div>
  );

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoNext: boolean = true, nextLabel: string = 'Next') => {
    const canBack = phase > 0;
    const isLastPhase = phase === 9;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        backgroundColor: '#0f172a',
        marginTop: 'auto'
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: '#1e293b',
            color: canBack ? '#e2e8f0' : '#475569',
            border: '1px solid #334155',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {phaseNames[phase]}
        </span>

        {!isLastPhase && (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: canGoNext ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              boxShadow: canGoNext ? '0 2px 12px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            {nextLabel}
          </button>
        )}
        {isLastPhase && (
          <button
            onClick={() => goToPhase(0)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            Start Over
          </button>
        )}
      </div>
    );
  };

  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'antenna' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'antenna' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'more_loss' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'more_loss' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [testAnswers, playSound, onGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const testQuestions = [
    {
      question: "What is the primary purpose of a link budget calculation?",
      options: [
        { text: "To determine the color of the satellite", correct: false },
        { text: "To ensure reliable communication with adequate signal margin", correct: true },
        { text: "To calculate the satellite's orbital period", correct: false },
        { text: "To measure the satellite's mass", correct: false }
      ]
    },
    {
      question: "Free Space Path Loss increases with:",
      options: [
        { text: "Higher frequency and greater distance", correct: true },
        { text: "Lower frequency and shorter distance", correct: false },
        { text: "Higher antenna gain only", correct: false },
        { text: "Atmospheric pressure changes", correct: false }
      ]
    },
    {
      question: "What does EIRP stand for?",
      options: [
        { text: "Electronic Infrared Radiation Power", correct: false },
        { text: "Effective Isotropic Radiated Power", correct: true },
        { text: "External Input Radio Protocol", correct: false },
        { text: "Elevated Integrated Radio Platform", correct: false }
      ]
    },
    {
      question: "Doubling the distance in a link budget:",
      options: [
        { text: "Adds approximately 6 dB to path loss", correct: true },
        { text: "Has no effect on path loss", correct: false },
        { text: "Reduces path loss by half", correct: false },
        { text: "Adds exactly 3 dB to path loss", correct: false }
      ]
    },
    {
      question: "Why do satellite communication systems use high-gain antennas?",
      options: [
        { text: "To make the antenna look impressive", correct: false },
        { text: "To compensate for enormous path losses over vast distances", correct: true },
        { text: "To reduce the satellite's weight", correct: false },
        { text: "To change the signal frequency", correct: false }
      ]
    },
    {
      question: "What is link margin?",
      options: [
        { text: "The extra signal strength above the minimum required", correct: true },
        { text: "The physical size of the antenna", correct: false },
        { text: "The distance between satellites", correct: false },
        { text: "The power consumption of the transmitter", correct: false }
      ]
    },
    {
      question: "The formula FSPL = 20*log10(d) + 20*log10(f) + constant shows that path loss:",
      options: [
        { text: "Is independent of frequency", correct: false },
        { text: "Increases logarithmically with both distance and frequency", correct: true },
        { text: "Decreases with distance", correct: false },
        { text: "Only depends on transmitter power", correct: false }
      ]
    },
    {
      question: "A GEO satellite at 36,000 km has much higher path loss than a LEO satellite at 400 km because:",
      options: [
        { text: "GEO satellites are older technology", correct: false },
        { text: "Path loss follows inverse square law - 90x more distance means huge loss increase", correct: true },
        { text: "GEO satellites use weaker transmitters", correct: false },
        { text: "The atmosphere is thicker at GEO altitude", correct: false }
      ]
    },
    {
      question: "Why might you choose a lower frequency for deep space communications?",
      options: [
        { text: "Lower frequencies are more colorful", correct: false },
        { text: "Lower FSPL, but at the cost of lower data rates", correct: true },
        { text: "Higher frequencies cannot travel through space", correct: false },
        { text: "Deep space probes only receive AM radio", correct: false }
      ]
    },
    {
      question: "What happens to the link budget if you increase receiver antenna gain by 3 dB?",
      options: [
        { text: "Received power increases by 3 dB, improving the link", correct: true },
        { text: "Path loss increases by 3 dB", correct: false },
        { text: "The transmitter power doubles", correct: false },
        { text: "The signal frequency changes", correct: false }
      ]
    }
  ];

  const transferApps = [
    {
      title: "Deep Space Network",
      short: "Deep Space",
      description: "NASA's DSN communicates with spacecraft billions of km away using massive 70m dishes.",
      connection: "Extreme distances require enormous antenna gains to overcome path losses exceeding 270 dB."
    },
    {
      title: "Starlink Satellites",
      short: "Starlink",
      description: "LEO constellation providing global internet with thousands of satellites at ~550 km altitude.",
      connection: "Lower altitude reduces path loss, enabling smaller user terminals and higher data rates."
    },
    {
      title: "GPS Navigation",
      short: "GPS",
      description: "24+ satellites at 20,200 km broadcast precise timing signals to receivers worldwide.",
      connection: "Link budget ensures weak signals (about -130 dBm) can still be detected by small antennas."
    },
    {
      title: "Maritime VSAT",
      short: "Ship Comms",
      description: "Ships at sea use satellite terminals for voice, data, and safety communications.",
      connection: "Moving platforms require careful link margin to maintain connectivity despite antenna pointing errors."
    }
  ];

  const renderVisualization = () => {
    const budget = calculateLinkBudget();
    const waveOffset = animPhase * 2;

    return (
      <svg viewBox="0 0 500 320" className="w-full h-auto max-w-xl">
        <defs>
          <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="100%" stopColor="#1a1a3a" />
          </linearGradient>
          <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect width="500" height="320" fill="url(#spaceGrad)" />

        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <circle
            key={i}
            cx={Math.random() * 500}
            cy={Math.random() * 200}
            r={Math.random() * 1.5 + 0.5}
            fill="white"
            opacity={Math.random() * 0.5 + 0.3}
          />
        ))}

        {/* Earth */}
        <ellipse cx="450" cy="280" rx="80" ry="50" fill="#1e40af" />
        <ellipse cx="450" cy="270" rx="70" ry="20" fill="#22c55e" opacity="0.5" />

        {/* Ground Station */}
        <g transform="translate(400, 230)">
          <rect x="-20" y="0" width="40" height="30" fill="#374151" rx="3" />
          <path d="M0 0 L-30 -40 L30 -40 Z" fill="#60a5fa" />
          <ellipse cx="0" cy="-45" rx="25" ry="10" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" />
          <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">Ground Station</text>
          <text x="0" y="62" textAnchor="middle" fill="#22d3ee" fontSize="8">{rxGain} dBi</text>
        </g>

        {/* Satellite */}
        <g transform="translate(80, 80)">
          <rect x="-15" y="-8" width="30" height="16" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          <rect x="-50" y="-4" width="30" height="8" fill="#3b82f6" /> {/* Solar panel left */}
          <rect x="20" y="-4" width="30" height="8" fill="#3b82f6" /> {/* Solar panel right */}
          <ellipse cx="0" cy="12" rx="8" ry="4" fill="#60a5fa" /> {/* Antenna */}
          <text x="0" y="-20" textAnchor="middle" fill="#94a3b8" fontSize="10">Satellite</text>
          <text x="0" y="35" textAnchor="middle" fill="#f59e0b" fontSize="8">{txPower} dBW, {txGain} dBi</text>
        </g>

        {/* Signal waves */}
        {[0, 1, 2, 3, 4].map(i => (
          <path
            key={i}
            d={`M ${100 + i * 60 + (waveOffset % 60)} 95 Q ${130 + i * 60 + (waveOffset % 60)} 80 ${160 + i * 60 + (waveOffset % 60)} 95`}
            stroke="#22d3ee"
            strokeWidth="2"
            fill="none"
            opacity={1 - i * 0.2}
          />
        ))}

        {/* Distance indicator */}
        <line x1="95" y1="120" x2="385" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
        <text x="240" y="145" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
          {distance} km
        </text>

        {/* Link Budget Display */}
        <g transform="translate(10, 160)">
          <rect x="0" y="0" width="140" height="140" fill="rgba(0,0,0,0.6)" rx="8" stroke="#334155" />
          <text x="70" y="20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">LINK BUDGET</text>

          <text x="10" y="40" fill="#94a3b8" fontSize="9">FSPL:</text>
          <text x="130" y="40" textAnchor="end" fill="#ef4444" fontSize="9">-{budget.fspl} dB</text>

          <text x="10" y="55" fill="#94a3b8" fontSize="9">EIRP:</text>
          <text x="130" y="55" textAnchor="end" fill="#22c55e" fontSize="9">+{budget.eirp} dBW</text>

          <text x="10" y="70" fill="#94a3b8" fontSize="9">Rx Gain:</text>
          <text x="130" y="70" textAnchor="end" fill="#22c55e" fontSize="9">+{rxGain} dBi</text>

          <line x1="10" y1="80" x2="130" y2="80" stroke="#475569" />

          <text x="10" y="95" fill="#94a3b8" fontSize="9">Rx Power:</text>
          <text x="130" y="95" textAnchor="end" fill="#3b82f6" fontSize="9">{budget.rxPower} dBm</text>

          <text x="10" y="110" fill="#94a3b8" fontSize="9">Link Margin:</text>
          <text x="130" y="110" textAnchor="end" fill={parseFloat(budget.margin) > 0 ? '#22c55e' : '#ef4444'} fontSize="9" fontWeight="bold">
            {budget.margin} dB
          </text>

          <rect x="10" y="118" width="120" height="16" fill={parseFloat(budget.margin) > 0 ? '#22c55e' : '#ef4444'} rx="3" opacity="0.3" />
          <text x="70" y="130" textAnchor="middle" fill={parseFloat(budget.margin) > 0 ? '#22c55e' : '#ef4444'} fontSize="10" fontWeight="bold">
            {budget.linkStatus}
          </text>
        </g>

        {/* Frequency display */}
        <text x="250" y="310" textAnchor="middle" fill="#a855f7" fontSize="10">
          Frequency: {frequency} GHz
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Distance: {distance} km</label>
        <input
          type="range"
          min="200"
          max="36000"
          step="100"
          value={distance}
          onChange={(e) => setDistance(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} GHz</label>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Tx Power: {txPower} dBW</label>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          value={txPower}
          onChange={(e) => setTxPower(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Antenna Gains: Tx {txGain} / Rx {rxGain} dBi</label>
        <input
          type="range"
          min="10"
          max="60"
          step="2"
          value={txGain}
          onChange={(e) => { setTxGain(parseInt(e.target.value)); setRxGain(parseInt(e.target.value) - 10); }}
          className="w-full"
        />
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: // Hook
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-cyan-400 tracking-wide">SATELLITE COMMUNICATIONS</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
              How Does a Tiny Satellite Antenna Talk to a Dish Thousands of km Away?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              The signal starts strong but weakens dramatically over vast distances. How do we ensure it arrives loud and clear?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase(1)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all hover:scale-[1.02]"
            >
              Discover Link Budgets
            </button>
          </div>
        );

      case 1: // Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              A satellite transmits 10 watts of power. By the time it reaches a ground station 36,000 km away, what primarily compensates for the massive signal loss?
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'power', text: 'Simply increasing transmitter power to megawatts' },
                { id: 'antenna', text: 'High-gain antennas that focus the signal like a flashlight beam' },
                { id: 'frequency', text: 'Using very low frequencies that travel farther' },
                { id: 'repeaters', text: 'Signal repeaters floating in space along the path' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'antenna'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {showPredictionFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'antenna' ? 'text-green-400' : 'text-cyan-400'}`}>
                  {selectedPrediction === 'antenna' ? 'Excellent!' : 'Not quite!'}
                </p>
                <p className="text-slate-300 mb-3">
                  High-gain antennas are the key! They focus signal energy into a narrow beam, effectively multiplying power in that direction by thousands or millions of times.
                </p>
                <button
                  onClick={() => goToPhase(2)}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="mt-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl"
                >
                  Explore Link Budgets
                </button>
              </div>
            )}
          </div>
        );

      case 2: // Play
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Link Budget Calculator</h2>
            <p className="text-slate-300 mb-4 text-center max-w-lg">
              Adjust parameters to see how distance, frequency, and antenna gain affect the signal strength.
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            {renderControls()}

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-amber-400 text-sm">
                <strong>Try this:</strong> Move the distance slider from LEO (400 km) to GEO (36,000 km) and watch the path loss skyrocket!
              </p>
            </div>

            <button
              onClick={() => goToPhase(3)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 3: // Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">The Link Budget Equation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">Free Space Path Loss</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-cyan-400 font-mono text-sm">FSPL = 20log(d) + 20log(f) + 92.45 dB</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Path loss increases with distance (inverse square law) and frequency. Doubling distance adds 6 dB loss.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-3">EIRP</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-amber-400 font-mono text-sm">EIRP = P_tx + G_tx</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Effective Isotropic Radiated Power: transmit power plus antenna gain. A 40 dBi antenna multiplies power 10,000x in that direction!
                </p>
              </div>

              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-5 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-3">Complete Link Budget</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-3">
                  <span className="text-green-400 font-mono">P_rx = EIRP - FSPL + G_rx - Losses</span>
                </div>
                <p className="text-slate-300 text-sm">
                  The received power equals transmitted EIRP minus path loss plus receiver antenna gain minus any system losses (cables, atmosphere, etc.).
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase(4)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl"
            >
              Explore the Twist
            </button>
          </div>
        );

      case 4: // Twist Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Frequency Trade-off</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Higher frequencies (like Ka-band at 30 GHz) can carry much more data than lower frequencies (like L-band at 1.5 GHz).
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                But what happens to the link budget at higher frequencies?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'same', text: 'Path loss stays the same - frequency does not affect it' },
                { id: 'less_loss', text: 'Higher frequencies have LESS path loss (they penetrate better)' },
                { id: 'more_loss', text: 'Higher frequencies have MORE path loss (FSPL increases with f)' },
                { id: 'unpredictable', text: 'It varies randomly depending on space weather' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'more_loss'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {showTwistFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl max-w-md">
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'more_loss' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'more_loss' ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-slate-300">
                  FSPL includes 20*log10(f) - doubling frequency adds 6 dB of loss! This is why high-bandwidth Ka-band links need even larger antennas.
                </p>
                <button
                  onClick={() => goToPhase(5)}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See the Trade-off
                </button>
              </div>
            )}
          </div>
        );

      case 5: // Twist Play
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Frequency vs Data Rate Trade-off</h2>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-purple-400">Try adjusting frequency</strong> from 1 GHz to 30 GHz at a fixed distance. Watch the path loss change!
              </p>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-center text-purple-400 font-bold mt-2">{frequency} GHz</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="bg-blue-900/30 p-3 rounded-lg text-center">
                <p className="text-blue-400 font-bold">L-band (1.5 GHz)</p>
                <p className="text-slate-400 text-xs">Lower loss, lower data rate</p>
                <p className="text-slate-400 text-xs">Good for voice, IoT</p>
              </div>
              <div className="bg-purple-900/30 p-3 rounded-lg text-center">
                <p className="text-purple-400 font-bold">Ka-band (30 GHz)</p>
                <p className="text-slate-400 text-xs">Higher loss, higher data rate</p>
                <p className="text-slate-400 text-xs">Good for broadband internet</p>
              </div>
            </div>

            <button
              onClick={() => goToPhase(6)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand the Trade-off
            </button>
          </div>
        );

      case 6: // Twist Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Bandwidth-Loss Trade-off</h2>

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-purple-400 mb-2">Higher Frequency = More Loss</h3>
                <p className="text-slate-300 text-sm">
                  Every doubling of frequency adds 6 dB to path loss. Going from 1 GHz to 30 GHz adds nearly 30 dB of additional loss!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">Higher Frequency = More Bandwidth</h3>
                <p className="text-slate-300 text-sm">
                  But higher frequencies can carry more data. Ka-band can support 500+ Mbps while L-band maxes out around 500 kbps.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-2">The Solution: Bigger Antennas!</h3>
                <p className="text-slate-300 text-sm">
                  To use high frequencies profitably, we compensate with larger antennas. Starlink user terminals have phased arrays optimized for Ka-band.
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase(7)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl"
            >
              See Real Applications
            </button>
          </div>
        );

      case 7: // Transfer
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '+ '}{app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{transferApps[activeAppTab].title}</h3>
                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">Link Budget Connection</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].connection}</p>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">Completed: {completedApps.size} / {transferApps.length}</p>

            {completedApps.size >= 3 && (
              <button
                onClick={() => goToPhase(8)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl"
              >
                Take the Test
              </button>
            )}
          </div>
        );

      case 8: // Test
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Knowledge Test</h2>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`p-3 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onClick={() => {
                  setShowTestResults(true);
                  playSound('complete');
                  onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-cyan-400 mb-2">
                  Score: {calculateTestScore()} / 10
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onClick={() => goToPhase(9)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl"
                  >
                    Claim Mastery Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 9: // Mastery
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-8xl mb-6">Trophy</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Link Budget Master!
            </h2>
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-2 border-cyan-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You understand how satellites communicate across the void of space!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>FSPL = 20log(d) + 20log(f) + 92.45 dB</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>High-gain antennas compensate for path loss</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Higher frequency = more bandwidth but more loss</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Link margin ensures reliable communication</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => goToPhase(0)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Start Over
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Link Budget</span>
          <div className="flex gap-1.5">
            {phaseNames.map((name, i) => (
              <button
                key={i}
                onClick={() => goToPhase(i)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-400 w-6'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={name}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseNames[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default LinkBudgetRenderer;
