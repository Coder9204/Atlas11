'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// LEIDENFROST RENDERER - Game 140
// Physics: Water droplet hovering on its own vapor over hot surface
// Vapor layer insulates and reduces friction - only above Leidenfrost point (~200C)
// ============================================================================

interface LeidenfrostRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const LeidenfrostRenderer: React.FC<LeidenfrostRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);

  // Game-specific state
  const [surfaceTemp, setSurfaceTemp] = useState(100);
  const [dropletSize, setDropletSize] = useState(5); // mm
  const [dropletX, setDropletX] = useState(150);
  const [dropletY, setDropletY] = useState(50);
  const [isDropped, setIsDropped] = useState(false);
  const [dropletState, setDropletState] = useState<'hovering' | 'evaporating' | 'boiling' | 'sizzling'>('hovering');
  const [dropletRadius, setDropletRadius] = useState(15);
  const [vaporBubbles, setVaporBubbles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const bubbleIdRef = useRef(0);

  // Twist state - temperature comparison
  const [twistTemp, setTwistTemp] = useState(150);
  const [evaporationTime, setEvaporationTime] = useState(0);
  const [isEvaporating, setIsEvaporating] = useState(false);
  const [twistDropletRadius, setTwistDropletRadius] = useState(15);

  const lastClickRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  // Constants
  const LEIDENFROST_POINT = 200; // Celsius

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'sizzle' | 'drop') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (type === 'sizzle') {
        // Sizzling sound
        const bufferSize = audioContext.sampleRate * 0.3;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.2 * (1 - i / bufferSize);
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        noise.connect(filter);
        filter.connect(audioContext.destination);
        noise.start();
        return;
      }

      if (type === 'drop') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(400, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
        return;
      }

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
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Droplet physics simulation
  useEffect(() => {
    if (!isDropped) return;

    const isAboveLeidenfrost = surfaceTemp >= LEIDENFROST_POINT;

    // Droplet falls
    const fallInterval = setInterval(() => {
      setDropletY(prev => {
        if (prev >= 120) {
          // Droplet has landed
          if (isAboveLeidenfrost) {
            setDropletState('hovering');
            // Hover and drift
            setDropletX(prevX => prevX + (Math.random() - 0.5) * 3);
          } else if (surfaceTemp >= 150) {
            setDropletState('sizzling');
            playSound('sizzle');
          } else if (surfaceTemp >= 100) {
            setDropletState('boiling');
          } else {
            setDropletState('evaporating');
          }
          return 120;
        }
        return prev + 5;
      });
    }, 30);

    return () => clearInterval(fallInterval);
  }, [isDropped, surfaceTemp, playSound]);

  // Evaporation/behavior based on state
  useEffect(() => {
    if (!isDropped || dropletY < 120) return;

    const isAboveLeidenfrost = surfaceTemp >= LEIDENFROST_POINT;

    const interval = setInterval(() => {
      // Add vapor bubbles
      if ((dropletState === 'boiling' || dropletState === 'sizzling') && Math.random() < 0.4) {
        setVaporBubbles(prev => [...prev.slice(-20), {
          x: dropletX + (Math.random() - 0.5) * 20,
          y: 115 + Math.random() * 10,
          id: bubbleIdRef.current++
        }]);
      }

      // Evaporation rate depends on state
      let evapRate = 0;
      if (isAboveLeidenfrost) {
        // Slow evaporation due to vapor insulation
        evapRate = 0.03;
        // Random drifting for Leidenfrost hovering
        setDropletX(prev => Math.max(60, Math.min(240, prev + (Math.random() - 0.5) * 4)));
      } else if (dropletState === 'sizzling') {
        // Fast evaporation from direct contact
        evapRate = 0.3;
      } else if (dropletState === 'boiling') {
        evapRate = 0.15;
      } else {
        evapRate = 0.05;
      }

      setDropletRadius(prev => {
        const newRadius = prev - evapRate;
        if (newRadius <= 0) {
          setIsDropped(false);
          return dropletSize * 3;
        }
        return newRadius;
      });

      // Move vapor bubbles up
      setVaporBubbles(prev =>
        prev.map(b => ({ ...b, y: b.y - 2 })).filter(b => b.y > 80)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isDropped, dropletY, dropletState, surfaceTemp, dropletSize, dropletX]);

  // Twist evaporation timing
  useEffect(() => {
    if (!isEvaporating) return;

    const interval = setInterval(() => {
      setEvaporationTime(prev => prev + 0.1);

      // Different evaporation rates for different temperatures
      const isAboveLeidenfrost = twistTemp >= LEIDENFROST_POINT;
      let evapRate = isAboveLeidenfrost ? 0.02 : (twistTemp >= 150 ? 0.25 : 0.08);

      setTwistDropletRadius(prev => {
        const newRadius = prev - evapRate;
        if (newRadius <= 0) {
          setIsEvaporating(false);
          return 0;
        }
        return newRadius;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isEvaporating, twistTemp]);

  // Drop a new droplet
  const dropWater = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    setDropletX(150);
    setDropletY(50);
    setDropletRadius(dropletSize * 3);
    setIsDropped(true);
    setVaporBubbles([]);
    playSound('drop');
  }, [dropletSize, playSound]);

  // Reset
  const resetExperiment = useCallback(() => {
    setIsDropped(false);
    setDropletY(50);
    setDropletX(150);
    setDropletRadius(dropletSize * 3);
    setVaporBubbles([]);
    setDropletState('hovering');
    playSound('click');
  }, [dropletSize, playSound]);

  // Start twist experiment
  const startTwistExperiment = useCallback(() => {
    setTwistDropletRadius(15);
    setEvaporationTime(0);
    setIsEvaporating(true);
    playSound('drop');
  }, [playSound]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    if (prediction === 'C') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    if (prediction === 'B') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

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

  // Get surface color based on temperature
  const getSurfaceColor = (temp: number): string => {
    if (temp < 100) return '#374151';
    if (temp < 150) return '#78350f';
    if (temp < 200) return '#9a3412';
    if (temp < 250) return '#c2410c';
    if (temp < 300) return '#dc2626';
    return '#ef4444';
  };

  const testQuestions = [
    { question: "What is the Leidenfrost effect?", options: [
      { text: "Water freezing on hot surfaces", correct: false },
      { text: "Water droplet hovering on a vapor layer over a very hot surface", correct: true },
      { text: "Water boiling violently", correct: false },
      { text: "Water turning directly to steam", correct: false }
    ]},
    { question: "At what approximate temperature does the Leidenfrost effect begin for water?", options: [
      { text: "100C (boiling point)", correct: false },
      { text: "150C", correct: false },
      { text: "200C (Leidenfrost point)", correct: true },
      { text: "500C", correct: false }
    ]},
    { question: "Why does the droplet hover instead of touching the surface?", options: [
      { text: "Magnetic repulsion", correct: false },
      { text: "A thin vapor layer forms underneath that supports it", correct: true },
      { text: "Air pressure from below", correct: false },
      { text: "The surface repels water", correct: false }
    ]},
    { question: "Surprisingly, a droplet on a 300C surface evaporates:", options: [
      { text: "Instantly", correct: false },
      { text: "Faster than at 150C", correct: false },
      { text: "SLOWER than at 150C due to vapor insulation", correct: true },
      { text: "At the same rate as 150C", correct: false }
    ]},
    { question: "The vapor layer in the Leidenfrost effect:", options: [
      { text: "Conducts heat very well", correct: false },
      { text: "Acts as an insulator AND allows near-frictionless movement", correct: true },
      { text: "Is only a few molecules thick", correct: false },
      { text: "Is visible to the naked eye", correct: false }
    ]},
    { question: "If you drop water on a pan at 180C (below Leidenfrost point):", options: [
      { text: "It will hover gracefully", correct: false },
      { text: "It will sizzle and evaporate quickly", correct: true },
      { text: "Nothing happens", correct: false },
      { text: "It will freeze", correct: false }
    ]},
    { question: "The Leidenfrost effect is used in:", options: [
      { text: "Refrigerators", correct: false },
      { text: "Steel quenching (cooling red-hot metal)", correct: true },
      { text: "Water heaters", correct: false },
      { text: "Ice machines", correct: false }
    ]},
    { question: "Liquid nitrogen demonstrations use the Leidenfrost effect because:", options: [
      { text: "Nitrogen is magnetic", correct: false },
      { text: "Room temperature is FAR above nitrogen's boiling point (-196C)", correct: true },
      { text: "Nitrogen is heavier than air", correct: false },
      { text: "It's just for show", correct: false }
    ]},
    { question: "The 'Mythbusters' wet hand in molten lead works because:", options: [
      { text: "Lead is not actually hot", correct: false },
      { text: "The Leidenfrost vapor layer protects the hand briefly", correct: true },
      { text: "The hand moves too fast", correct: false },
      { text: "Lead doesn't conduct heat", correct: false }
    ]},
    { question: "Below the Leidenfrost point, adding heat:", options: [
      { text: "Slows evaporation", correct: false },
      { text: "Speeds up evaporation (more direct contact)", correct: true },
      { text: "Has no effect", correct: false },
      { text: "Makes water colder", correct: false }
    ]}
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    if (answer !== null && testQuestions[index].options[answer].correct) {
      return score + 1;
    }
    return score;
  }, 0);

  const applications = [
    {
      title: "Steel Quenching",
      icon: "🔩",
      description: "When cooling red-hot steel in water/oil, the Leidenfrost effect initially slows cooling. Metallurgists must account for this 'film boiling' phase for proper heat treatment.",
      details: "The vapor film can be broken by agitation or adding surfactants, achieving faster, more uniform cooling."
    },
    {
      title: "Cryogenic Liquid Handling",
      icon: "🧊",
      description: "Liquid nitrogen (-196C) demonstrations rely on Leidenfrost. Room temperature is so far above nitrogen's boiling point that it instantly vaporizes, creating a protective layer.",
      details: "This is why brief contact with liquid nitrogen doesn't instantly freeze skin - the vapor layer insulates!"
    },
    {
      title: "Spray Cooling & Heat Exchangers",
      icon: "💧",
      description: "Engineers must consider Leidenfrost when designing spray cooling systems. Above the Leidenfrost point, droplets bounce off without effective heat transfer.",
      details: "Optimal cooling often occurs just BELOW the Leidenfrost point where droplets contact the surface."
    },
    {
      title: "Fire Safety",
      icon: "🔥",
      description: "Firefighters know that water spray on extremely hot surfaces may be ineffective due to Leidenfrost. The water bounces off without cooling.",
      details: "Adding surfactants or using fog patterns can help break through the vapor barrier for effective cooling."
    }
  ];

  // Render hot surface and droplet
  const renderSurfaceVisualization = () => {
    const isAboveLeidenfrost = surfaceTemp >= LEIDENFROST_POINT;
    const surfaceColor = getSurfaceColor(surfaceTemp);

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="200" fill="#0f172a" rx="8" />

        {/* Hot surface */}
        <rect
          x="50"
          y="130"
          width="200"
          height="50"
          fill={surfaceColor}
          rx="4"
        />

        {/* Heat waves from surface */}
        {surfaceTemp >= 100 && (
          <g opacity="0.5">
            {[0, 1, 2, 3, 4].map(i => {
              const y = 120 - (animationFrame + i * 20) % 40;
              return (
                <path
                  key={i}
                  d={`M ${80 + i * 35} ${y} Q ${90 + i * 35} ${y - 10} ${80 + i * 35} ${y - 20}`}
                  fill="none"
                  stroke={surfaceColor}
                  strokeWidth="2"
                  opacity={1 - ((animationFrame + i * 20) % 40) / 40}
                />
              );
            })}
          </g>
        )}

        {/* Droplet */}
        {isDropped && dropletRadius > 0 && (
          <g>
            {/* Vapor layer (only above Leidenfrost) */}
            {isAboveLeidenfrost && dropletY >= 120 && (
              <ellipse
                cx={dropletX}
                cy={128}
                rx={dropletRadius * 1.2}
                ry={4}
                fill="rgba(255,255,255,0.3)"
              >
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* The droplet */}
            <ellipse
              cx={dropletX}
              cy={isAboveLeidenfrost && dropletY >= 120 ? 118 : dropletY}
              rx={dropletRadius}
              ry={dropletRadius * 0.8}
              fill="#3b82f6"
              opacity="0.8"
            >
              {isAboveLeidenfrost && dropletY >= 120 && (
                <animate attributeName="cy" values="116;120;116" dur="0.5s" repeatCount="indefinite" />
              )}
            </ellipse>

            {/* Droplet shine */}
            <ellipse
              cx={dropletX - dropletRadius * 0.3}
              cy={(isAboveLeidenfrost && dropletY >= 120 ? 118 : dropletY) - dropletRadius * 0.2}
              rx={dropletRadius * 0.3}
              ry={dropletRadius * 0.2}
              fill="rgba(255,255,255,0.4)"
            />
          </g>
        )}

        {/* Vapor bubbles (below Leidenfrost) */}
        {vaporBubbles.map(b => (
          <circle
            key={b.id}
            cx={b.x}
            cy={b.y}
            r={3}
            fill="rgba(255,255,255,0.5)"
          />
        ))}

        {/* Temperature indicator */}
        <g transform="translate(265, 60)">
          <rect x="-20" y="0" width="40" height="100" fill="#1f2937" stroke="#374151" rx="4" />
          <rect
            x="-15"
            y={100 - (surfaceTemp / 400) * 90}
            width="30"
            height={(surfaceTemp / 400) * 90}
            fill={surfaceColor}
            rx="2"
          />
          <text x="0" y="-10" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
            {surfaceTemp}C
          </text>

          {/* Leidenfrost point marker */}
          <line x1="-20" y1={100 - (LEIDENFROST_POINT / 400) * 90} x2="20" y2={100 - (LEIDENFROST_POINT / 400) * 90} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3" />
          <text x="0" y={95 - (LEIDENFROST_POINT / 400) * 90} fontSize="7" fill="#f59e0b" textAnchor="middle">200C</text>
        </g>

        {/* State indicator */}
        <text x="150" y="185" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="bold">
          {!isDropped ? 'Drop water to test!' :
            isAboveLeidenfrost ? 'LEIDENFROST EFFECT - Hovering!' :
              dropletState === 'sizzling' ? 'Rapid Sizzle (Direct Contact)' :
                dropletState === 'boiling' ? 'Boiling on Surface' : 'Slow Evaporation'}
        </text>
      </svg>
    );
  };

  // Render evaporation time comparison for twist
  const renderEvaporationComparison = () => {
    const isAboveLeidenfrost = twistTemp >= LEIDENFROST_POINT;

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="200" fill="#1e293b" rx="8" />

        {/* Surface */}
        <rect x="50" y="130" width="200" height="40" fill={getSurfaceColor(twistTemp)} rx="4" />

        {/* Droplet */}
        {twistDropletRadius > 0 && (
          <g>
            {/* Vapor layer */}
            {isAboveLeidenfrost && (
              <ellipse cx="150" cy="128" rx={twistDropletRadius * 1.2} ry="4" fill="rgba(255,255,255,0.3)">
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
            )}

            <ellipse
              cx="150"
              cy={isAboveLeidenfrost ? 118 : 125}
              rx={twistDropletRadius}
              ry={twistDropletRadius * 0.8}
              fill="#3b82f6"
              opacity="0.8"
            >
              {isAboveLeidenfrost && (
                <animate attributeName="cy" values="116;120;116" dur="0.5s" repeatCount="indefinite" />
              )}
            </ellipse>
          </g>
        )}

        {/* Timer */}
        <text x="150" y="40" textAnchor="middle" fontSize="24" fill="#e2e8f0" fontWeight="bold">
          {evaporationTime.toFixed(1)}s
        </text>
        <text x="150" y="55" textAnchor="middle" fontSize="11" fill="#94a3b8">
          Time to evaporate
        </text>

        {/* Temperature display */}
        <text x="150" y="80" textAnchor="middle" fontSize="14" fill={getSurfaceColor(twistTemp)}>
          Surface: {twistTemp}C {isAboveLeidenfrost ? '(Above Leidenfrost)' : '(Below Leidenfrost)'}
        </text>

        {/* Status */}
        <text x="150" y="180" textAnchor="middle" fontSize="11" fill="#94a3b8">
          {isEvaporating ? (isAboveLeidenfrost ? 'Hovering with slow evaporation...' : 'Rapid evaporation from contact!') :
            twistDropletRadius <= 0 ? 'Fully evaporated!' : 'Ready to drop'}
        </text>
      </svg>
    );
  };

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => (
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
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>
        Leidenfrost Effect
      </div>
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '9999px',
            marginBottom: '32px'
          }}>
            <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#ef4444', letterSpacing: '0.05em' }}>HEAT TRANSFER</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #ffffff, #fca5a5, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Can Water Skate on a Cushion of Its Own Vapor?
          </h1>

          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '40px' }}>
            Discover the magical Leidenfrost effect
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '24px' }}>
              💧 🔥 → 🛸
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', lineHeight: '1.6' }}>
                Drop water on a <span style={{ color: '#ef4444', fontWeight: 'bold' }}>REALLY</span> hot pan, and something strange happens...
              </p>
              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6' }}>
                Instead of sizzling instantly, the droplet hovers! It glides around like a tiny hovercraft, lasting far longer than expected.
              </p>
              <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '600' }}>
                Counterintuitively, HOTTER surfaces make water last LONGER!
              </p>
            </div>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>✦</span>
              Vapor Cushions
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>✦</span>
              Temperature Effects
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>✦</span>
              Real Applications
            </div>
          </div>
        </div>
        {renderFooter(true, 'Make a Prediction →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You drop water on two pans: one at 150C and one at 300C.
            </p>
            <p style={{ fontSize: '18px', color: '#ef4444', fontWeight: '500' }}>
              Which droplet evaporates faster?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'The 300C droplet - more heat means faster evaporation' },
              { id: 'B', text: 'Both evaporate at the same rate' },
              { id: 'C', text: 'The 150C droplet - despite being cooler!' },
              { id: 'D', text: 'Neither evaporates - they both bounce off' }
            ].map(option => (
              <button
                key={option.id}
                onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showPredictionFeedback && option.id === 'C' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showPredictionFeedback && option.id === 'C' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showPredictionFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showPredictionFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Above 200C (the Leidenfrost point), a vapor layer forms under the droplet that INSULATES it from the heat. The droplet hovers and evaporates slowly!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showPredictionFeedback, 'See It in Action →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Leidenfrost Lab</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Adjust the surface temperature and drop water to see the effect!</p>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {renderSurfaceVisualization()}

            {/* Controls */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Surface Temperature: {surfaceTemp}C
                <span style={{ color: surfaceTemp >= LEIDENFROST_POINT ? '#10b981' : '#f59e0b', marginLeft: '8px' }}>
                  {surfaceTemp >= LEIDENFROST_POINT ? '(Above Leidenfrost Point!)' : '(Below Leidenfrost Point)'}
                </span>
              </label>
              <input
                type="range"
                min="80"
                max="350"
                value={surfaceTemp}
                onChange={(e) => { setSurfaceTemp(parseInt(e.target.value)); resetExperiment(); }}
                style={{ width: '100%', accentColor: getSurfaceColor(surfaceTemp) }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>80C</span>
                <span style={{ color: '#f59e0b' }}>200C (Leidenfrost)</span>
                <span>350C</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onMouseDown={(e) => { e.preventDefault(); dropWater(); }}
                disabled={isDropped && dropletRadius > 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: isDropped && dropletRadius > 0 ? 'not-allowed' : 'pointer',
                  background: isDropped && dropletRadius > 0 ? '#475569' : 'linear-gradient(to right, #3b82f6, #2563eb)',
                  color: isDropped && dropletRadius > 0 ? '#94a3b8' : 'white'
                }}
              >
                💧 Drop Water
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); resetExperiment(); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#374151',
                  color: 'white'
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Explanation panel */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: surfaceTemp >= LEIDENFROST_POINT ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)',
            border: surfaceTemp >= LEIDENFROST_POINT ? '2px solid #10b981' : '2px solid #f59e0b',
            maxWidth: '500px',
            width: '100%'
          }}>
            {surfaceTemp >= LEIDENFROST_POINT ? (
              <p style={{ color: '#10b981', fontSize: '14px' }}>
                <strong>Leidenfrost Effect Active!</strong> The water instantly vaporizes at the bottom, creating a vapor cushion. This layer insulates the droplet and allows it to hover with almost no friction!
              </p>
            ) : (
              <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                <strong>Below Leidenfrost Point:</strong> The water makes direct contact with the surface, causing rapid heat transfer and quick evaporation through sizzling and boiling.
              </p>
            )}
          </div>
        </div>
        {renderFooter(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>The Science of the Leidenfrost Effect</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>The Vapor Cushion</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Above the Leidenfrost point (~200C for water), the bottom of the droplet instantly vaporizes. This vapor layer (0.1-0.2mm thick) acts as an insulating cushion, supporting the droplet above the surface.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>Why Slower Evaporation?</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Vapor is a poor heat conductor! The same layer that levitates the droplet also insulates it from the hot surface. Heat must radiate or conduct through the vapor - much slower than direct contact.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>The Frictionless Hovercraft</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                The vapor layer isn't just insulation - it's like an air hockey table! With almost no friction, droplets glide freely, bouncing off edges and even climbing inclines. The vapor continuously replenishes from the evaporating bottom.
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Discover a Twist →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Temperature Paradox</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You graph "droplet lifetime" vs "surface temperature" from 100C to 400C.
            </p>
            <p style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '500' }}>
              What shape does the graph have?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'Always decreasing - hotter = faster evaporation' },
              { id: 'B', text: 'Dip then rise - lifetime INCREASES above Leidenfrost point!' },
              { id: 'C', text: 'Always increasing - hotter surfaces repel water' },
              { id: 'D', text: 'Flat line - temperature doesn\'t matter' }
            ].map(option => (
              <button
                key={option.id}
                onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                disabled={showTwistFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showTwistFeedback && option.id === 'B' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showTwistFeedback && option.id === 'B' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showTwistFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showTwistFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Droplet lifetime decreases as temperature rises to ~150C (faster boiling), then JUMPS UP dramatically above 200C (Leidenfrost point) as the vapor cushion forms!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showTwistFeedback, 'Compare Evaporation Times →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Evaporation Time Comparison</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Compare how long a droplet lasts at different temperatures!</p>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {renderEvaporationComparison()}

            {/* Temperature selector */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Surface Temperature: {twistTemp}C
              </label>
              <input
                type="range"
                min="120"
                max="300"
                value={twistTemp}
                onChange={(e) => { setTwistTemp(parseInt(e.target.value)); setIsEvaporating(false); setTwistDropletRadius(15); setEvaporationTime(0); }}
                style={{ width: '100%', accentColor: getSurfaceColor(twistTemp) }}
              />
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); startTwistExperiment(); }}
              disabled={isEvaporating}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: isEvaporating ? 'not-allowed' : 'pointer',
                background: isEvaporating ? '#475569' : 'linear-gradient(to right, #3b82f6, #2563eb)',
                color: isEvaporating ? '#94a3b8' : 'white'
              }}
            >
              {isEvaporating ? 'Evaporating...' : 'Drop & Time'}
            </button>
          </div>

          {/* Quick comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '500px', width: '100%' }}>
            <div style={{ background: 'rgba(249, 115, 22, 0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <h4 style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '8px' }}>150C (Below)</h4>
              <p style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>~2-3 sec</p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>Direct contact = fast evap</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <h4 style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>300C (Above)</h4>
              <p style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>~30+ sec</p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>Vapor insulation = slow!</p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Leidenfrost Paradox Explained</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>Below Leidenfrost (~100-180C)</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Droplet makes direct contact with surface. Heat conducts directly into water. Hotter = faster evaporation. Violent boiling and sizzling. Lifetime: seconds.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>Above Leidenfrost (~200C+)</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Vapor cushion prevents contact. Heat must radiate through vapor. Droplet hovers peacefully. Hotter surface = more vapor = better insulation! Lifetime: minutes.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(139, 92, 246, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '12px' }}>The Famous Lifetime Curve</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                As temperature rises from 100C, droplet lifetime decreases (more boiling). Around 150-180C, it's minimum (fastest evaporation). Then at ~200C - dramatic jump! The Leidenfrost transition creates a discontinuity where lifetime suddenly increases 10x or more!
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((app, index) => (
              <button
                key={index}
                onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  background: activeAppTab === index ? '#ef4444' : completedApps.has(index) ? 'rgba(16, 185, 129, 0.3)' : '#374151',
                  border: completedApps.has(index) ? '1px solid #10b981' : '1px solid transparent',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {app.icon} {app.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{applications[activeAppTab].icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{applications[activeAppTab].title}</h3>
            </div>
            <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '12px' }}>{applications[activeAppTab].description}</p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{applications[activeAppTab].details}</p>

            {!completedApps.has(activeAppTab) && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark as Understood
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#94a3b8' }}>{completedApps.size}/4</span>
          </div>
        </div>
        {renderFooter(completedApps.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{
              background: score >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 8 ? '🎉' : '📚'}</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Score: {score}/10</h3>
              <p style={{ color: '#cbd5e1' }}>
                {score >= 8 ? 'Excellent! You\'ve mastered the Leidenfrost effect!' : 'Keep studying! Review and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  maxWidth: '640px',
                  width: '100%',
                  borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#94a3b8'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderFooter(score >= 8, score >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', width: '100%', maxWidth: '640px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#ef4444' : i === currentTestQuestion ? '#64748b' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', maxWidth: '640px', width: '100%' }}>
            <p style={{ color: 'white', fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '640px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', width: '100%', maxWidth: '640px', marginTop: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #64748b',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#64748b' : 'white',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowTestResults(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#64748b' : '#10b981',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '640px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Leidenfrost Master!</h1>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '24px' }}>
              You've mastered the physics of vapor cushions and heat transfer!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💧</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Vapor Cushions</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Heat Transfer</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛸</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Low Friction</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Temperature Paradox</p>
              </div>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default LeidenfrostRenderer;
