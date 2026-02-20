'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// LEIDENFROST RENDERER - Game 140
// Physics: Water droplet hovering on its own vapor over hot surface
// Vapor layer insulates and reduces friction - only above Leidenfrost point (~200C)
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

interface LeidenfrostRendererProps {
  gamePhase?: string;
  onPhaseComplete?: (phase: number) => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onBack?: () => void;
}

const realWorldApps = [
  {
    icon: '🏭',
    title: 'Metal Quenching',
    short: 'Hardening steel precisely',
    tagline: 'The vapor blanket paradox',
    description: 'When hot steel is quenched in water, the Leidenfrost effect initially slows cooling. The vapor blanket insulates the metal until it cools below the Leidenfrost point, then violent boiling rapidly extracts heat. Understanding this transition is critical for achieving desired metallurgical properties.',
    connection: 'Just as water droplets hover on hot surfaces, quench water vaporizes and forms an insulating blanket around hot metal. The cooling rate dramatically increases once the metal cools enough for the vapor blanket to collapse.',
    howItWorks: 'Above the Leidenfrost point (~200°C for water), film boiling creates slow, uniform cooling. As the surface cools, transition boiling begins with unstable vapor film. Below ~100°C, nucleate boiling provides maximum heat transfer.',
    stats: [
      { value: '1000°C', label: 'Steel temp', icon: '⚡' },
      { value: '10x', label: 'Cooling rate change', icon: '📈' },
      { value: '$150B', label: 'Steel industry', icon: '🚀' }
    ],
    examples: ['Hardening tool steel', 'Automotive part heat treatment', 'Sword blade tempering', 'Spring manufacturing'],
    companies: ['ArcelorMittal', 'Nucor', 'ThyssenKrupp', 'Bodycote'],
    futureImpact: 'Polymer quenchants with tailored Leidenfrost behavior will enable precise cooling profiles for advanced high-strength steels.',
    color: '#EF4444'
  },
  {
    icon: '🍳',
    title: 'Cooking Techniques',
    short: 'When pans are hot enough',
    tagline: 'The water droplet test',
    description: 'Chefs test pan temperature by watching water droplet behavior. Below the Leidenfrost point, drops sizzle and evaporate quickly. Above it, drops dance and skate across the surface. This indicates the pan is hot enough for proper searing.',
    connection: 'The dancing water droplet demonstrates the Leidenfrost effect perfectly. The vapor cushion reduces friction and heat transfer, allowing the drop to survive much longer on a hotter surface.',
    howItWorks: 'At pan temperatures above ~193°C (380°F), water drops levitate on their own vapor. This indicates the pan will quickly sear food rather than steaming it. The Maillard reaction requires these high temperatures.',
    stats: [
      { value: '193°C', label: 'Water Leidenfrost', icon: '⚡' },
      { value: '150°C', label: 'Maillard starts', icon: '📈' },
      { value: '$7B', label: 'Cookware market', icon: '🚀' }
    ],
    examples: ['Steak searing', 'Stir-fry technique', 'Crêpe making', 'Pan sauce timing'],
    companies: ['All-Clad', 'Le Creuset', 'Lodge', 'de Buyer'],
    futureImpact: 'Smart cookware with temperature sensors will indicate optimal cooking temperature, but the water drop test remains a reliable, zero-cost technique.',
    color: '#F59E0B'
  },
  {
    icon: '🧪',
    title: 'Liquid Nitrogen Handling',
    short: 'Safe contact with cryogenics',
    tagline: 'When cold becomes protection',
    description: 'Briefly touching liquid nitrogen (-196°C) doesn\'t cause instant frostbite because of an inverse Leidenfrost effect. Your warm skin vaporizes the nitrogen, creating an insulating gas layer. This allows short contact—but longer exposure is extremely dangerous.',
    connection: 'The physics is identical to water on a hot pan, but reversed. Your warm skin is the "hot surface" and liquid nitrogen rapidly vaporizes, creating a protective gas cushion.',
    howItWorks: 'Skin at ~33°C is far above nitrogen\'s boiling point (-196°C). Contact immediately vaporizes nitrogen, creating an insulating gas layer. This effect only works for fractions of a second—prolonged contact causes severe cryogenic burns.',
    stats: [
      { value: '-196°C', label: 'LN2 boiling point', icon: '⚡' },
      { value: '<1 sec', label: 'Safe contact', icon: '📈' },
      { value: '$15B', label: 'Industrial gas market', icon: '🚀' }
    ],
    examples: ['Cryogenic food preparation', 'Lab demonstrations', 'Wart removal treatment', 'Semiconductor cooling'],
    companies: ['Linde', 'Air Liquide', 'Air Products', 'Praxair'],
    futureImpact: 'Understanding Leidenfrost protection enables safe handling protocols for cryogenic applications in medicine, food science, and research.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'Nuclear Reactor Safety',
    short: 'Critical heat flux limits',
    tagline: 'When vapor becomes danger',
    description: 'Nuclear reactors use water to cool fuel rods. If heat flux exceeds critical limits, a vapor blanket forms (departure from nucleate boiling), dramatically reducing heat transfer. This Leidenfrost-like transition can lead to fuel damage—making it a key safety consideration.',
    connection: 'Film boiling on reactor fuel is catastrophic because the vapor blanket insulates rather than cools. Reactor designers ensure heat flux stays below the point where stable vapor films can form.',
    howItWorks: 'Fuel rods are designed to operate in nucleate boiling regime where bubbles form and depart rapidly, providing excellent heat transfer. Exceeding critical heat flux causes transition to film boiling with much lower cooling capacity.',
    stats: [
      { value: '1-2 MW/m²', label: 'Critical heat flux', icon: '⚡' },
      { value: '300°C', label: 'Normal operation', icon: '📈' },
      { value: '$50B', label: 'Nuclear industry', icon: '🚀' }
    ],
    examples: ['PWR fuel assemblies', 'BWR fuel channels', 'Research reactor design', 'Spent fuel pool cooling'],
    companies: ['Westinghouse', 'Framatome', 'GE Hitachi', 'Rosatom'],
    futureImpact: 'Advanced reactor designs with enhanced surface treatments will increase critical heat flux margins, improving safety and power density.',
    color: '#10B981'
  }
];

const LeidenfrostRenderer: React.FC<LeidenfrostRendererProps> = ({
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
  onBack
}) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());

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

  // Sync external gamePhase prop with internal phase state
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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
    { question: "A chef notices that when they flick water droplets onto their cast iron pan, the droplets behave very differently at different temperatures. At moderate heat, droplets sizzle and evaporate quickly. But when the pan is extremely hot, droplets seem to dance and skate across the surface, lasting much longer. What phenomenon is the chef observing?", options: [
      { text: "Water freezing on hot surfaces", correct: false },
      { text: "The Leidenfrost effect - water droplets hovering on a vapor layer over a very hot surface", correct: true },
      { text: "Water boiling violently", correct: false },
      { text: "Water turning directly to steam", correct: false }
    ]},
    { question: "In metallurgy, understanding the Leidenfrost effect is critical for heat treatment processes. Steel parts heated to 800°C are quenched in water to achieve desired hardness. At what approximate water-surface temperature threshold does the Leidenfrost effect begin, where a stable vapor film forms between the water and hot metal?", options: [
      { text: "100C (boiling point)", correct: false },
      { text: "150C", correct: false },
      { text: "200C (Leidenfrost point)", correct: true },
      { text: "500C", correct: false }
    ]},
    { question: "When a water droplet is placed on a surface heated above the Leidenfrost point, it appears to levitate and can glide around with almost no friction. Scientists have measured this gap to be less than 0.1mm thick. What physical mechanism allows the droplet to hover without touching the surface?", options: [
      { text: "Magnetic repulsion", correct: false },
      { text: "A thin vapor layer continuously forms underneath the droplet, supporting it like a hovercraft", correct: true },
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

  // Render hot surface and droplet - Premium SVG visualization
  const renderSurfaceVisualization = () => {
    const isAboveLeidenfrost = surfaceTemp >= LEIDENFROST_POINT;

    return (
      <svg viewBox="0 0 400 280" style={{ width: '100%', maxWidth: '400px' }}>
        <defs>
          {/* Premium background gradient */}
          <linearGradient id="leidLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="30%" stopColor="#0a0f1a" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Hot surface gradient - temperature responsive */}
          <linearGradient id="leidHotSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={surfaceTemp >= 300 ? '#ef4444' : surfaceTemp >= 250 ? '#dc2626' : surfaceTemp >= 200 ? '#c2410c' : surfaceTemp >= 150 ? '#9a3412' : '#78350f'} />
            <stop offset="20%" stopColor={surfaceTemp >= 300 ? '#dc2626' : surfaceTemp >= 250 ? '#b91c1c' : surfaceTemp >= 200 ? '#9a3412' : surfaceTemp >= 150 ? '#78350f' : '#57534e'} />
            <stop offset="50%" stopColor={surfaceTemp >= 300 ? '#b91c1c' : surfaceTemp >= 250 ? '#991b1b' : surfaceTemp >= 200 ? '#78350f' : surfaceTemp >= 150 ? '#57534e' : '#44403c'} />
            <stop offset="80%" stopColor={surfaceTemp >= 300 ? '#991b1b' : surfaceTemp >= 250 ? '#7f1d1d' : surfaceTemp >= 200 ? '#57534e' : surfaceTemp >= 150 ? '#44403c' : '#374151'} />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>

          {/* Heat glow radial gradient */}
          <radialGradient id="leidHeatGlow" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor={surfaceTemp >= 250 ? '#ef4444' : surfaceTemp >= 200 ? '#f97316' : '#fbbf24'} stopOpacity={surfaceTemp >= 200 ? 0.6 : 0.3} />
            <stop offset="40%" stopColor={surfaceTemp >= 250 ? '#dc2626' : surfaceTemp >= 200 ? '#ea580c' : '#f59e0b'} stopOpacity={surfaceTemp >= 200 ? 0.3 : 0.15} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Water droplet gradient - 3D appearance */}
          <radialGradient id="leidWaterDroplet" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
          </radialGradient>

          {/* Droplet highlight/shine */}
          <radialGradient id="leidDropletShine" cx="30%" cy="20%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          {/* Vapor cushion gradient */}
          <linearGradient id="leidVaporCushion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#cbd5e1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </linearGradient>

          {/* Steam/vapor particle gradient */}
          <radialGradient id="leidSteamParticle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#e2e8f0" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </radialGradient>

          {/* Thermometer gradient */}
          <linearGradient id="leidThermometer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          {/* Thermometer mercury gradient */}
          <linearGradient id="leidMercury" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={surfaceTemp >= 250 ? '#dc2626' : surfaceTemp >= 200 ? '#ea580c' : surfaceTemp >= 150 ? '#f59e0b' : '#84cc16'} />
            <stop offset="50%" stopColor={surfaceTemp >= 250 ? '#ef4444' : surfaceTemp >= 200 ? '#f97316' : surfaceTemp >= 150 ? '#fbbf24' : '#a3e635'} />
            <stop offset="100%" stopColor={surfaceTemp >= 250 ? '#f87171' : surfaceTemp >= 200 ? '#fb923c' : surfaceTemp >= 150 ? '#fcd34d' : '#bef264'} />
          </linearGradient>

          {/* Glow filters */}
          <filter id="leidHeatGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leidDropletGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leidVaporGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leidSteamBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Premium dark lab background */}
        <rect width="400" height="280" fill="url(#leidLabBg)" rx="12" />

        {/* Subtle grid pattern */}
        <pattern id="leidLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
        </pattern>
        <rect width="400" height="280" fill="url(#leidLabGrid)" rx="12" />

        {/* Heat glow above surface */}
        {surfaceTemp >= 150 && (
          <ellipse
            cx="200"
            cy="180"
            rx="120"
            ry="60"
            fill="url(#leidHeatGlow)"
            filter="url(#leidHeatGlowFilter)"
            opacity={Math.min(1, (surfaceTemp - 100) / 200)}
          >
            <animate attributeName="ry" values="55;65;55" dur="2s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Hot surface with premium gradient */}
        <g>
          {/* Surface shadow */}
          <rect x="48" y="195" width="224" height="52" rx="6" fill="#000000" opacity="0.5" />

          {/* Main surface */}
          <rect x="50" y="190" width="220" height="50" rx="6" fill="url(#leidHotSurface)" />

          {/* Surface texture lines */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line
              key={i}
              x1={70 + i * 35}
              y1="195"
              x2={70 + i * 35}
              y2="235"
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeOpacity="0.1"
            />
          ))}

          {/* Surface highlight */}
          <rect x="50" y="190" width="220" height="8" rx="4" fill="#ffffff" opacity="0.1" />

          {/* Surface label */}
          <text x="160" y="250" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="500">
            HOT SURFACE
          </text>
        </g>

        {/* Animated heat waves */}
        {surfaceTemp >= 100 && (
          <g opacity={Math.min(0.8, (surfaceTemp - 80) / 150)}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => {
              const offset = (animationFrame * 2 + i * 25) % 80;
              const startY = 195;
              const endY = 10 + offset;
              const opacity = 1 - offset / 80;
              return (
                <path
                  key={i}
                  d={`M ${75 + i * 40} ${startY} C ${85 + i * 40} ${(startY + endY) / 2 + 20} ${65 + i * 40} ${(startY + endY) / 2 - 20} ${75 + i * 40} ${endY}`}
                  fill="none"
                  stroke={surfaceTemp >= 250 ? '#fca5a5' : surfaceTemp >= 200 ? '#fdba74' : '#fde047'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={opacity * 0.4}
                />
              );
            })}
          </g>
        )}

        {/* Water droplet */}
        {isDropped && dropletRadius > 0 && (
          <g>
            {/* Vapor cushion layer (only above Leidenfrost) */}
            {isAboveLeidenfrost && dropletY >= 120 && (
              <g filter="url(#leidVaporGlow)">
                {/* Main vapor cushion */}
                <ellipse
                  cx={dropletX + 50}
                  cy={188}
                  rx={dropletRadius * 1.4}
                  ry={6}
                  fill="url(#leidVaporCushion)"
                >
                  <animate attributeName="ry" values="5;7;5" dur="0.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.9;0.6" dur="0.3s" repeatCount="indefinite" />
                </ellipse>

                {/* Vapor wisps */}
                {[0, 1, 2].map(i => (
                  <ellipse
                    key={i}
                    cx={dropletX + 50 + (i - 1) * dropletRadius * 0.8}
                    cy={185 - i * 2}
                    rx={4}
                    ry={2}
                    fill="#ffffff"
                    opacity={0.3 - i * 0.08}
                  >
                    <animate
                      attributeName="cy"
                      values={`${185 - i * 2};${180 - i * 2};${185 - i * 2}`}
                      dur={`${0.3 + i * 0.1}s`}
                      repeatCount="indefinite"
                    />
                  </ellipse>
                ))}
              </g>
            )}

            {/* The water droplet with 3D effect */}
            <g filter="url(#leidDropletGlow)">
              {/* Droplet shadow */}
              <ellipse
                cx={dropletX + 52}
                cy={(isAboveLeidenfrost && dropletY >= 120 ? 175 : dropletY + 55) + 5}
                rx={dropletRadius * 0.7}
                ry={dropletRadius * 0.2}
                fill="#000000"
                opacity="0.3"
              />

              {/* Main droplet body */}
              <ellipse
                cx={dropletX + 50}
                cy={isAboveLeidenfrost && dropletY >= 120 ? 175 : dropletY + 55}
                rx={dropletRadius}
                ry={dropletRadius * 0.85}
                fill="url(#leidWaterDroplet)"
              >
                {isAboveLeidenfrost && dropletY >= 120 && (
                  <animate attributeName="cy" values="173;177;173" dur="0.4s" repeatCount="indefinite" />
                )}
              </ellipse>

              {/* Droplet highlight/shine */}
              <ellipse
                cx={dropletX + 50 - dropletRadius * 0.25}
                cy={(isAboveLeidenfrost && dropletY >= 120 ? 175 : dropletY + 55) - dropletRadius * 0.3}
                rx={dropletRadius * 0.4}
                ry={dropletRadius * 0.25}
                fill="url(#leidDropletShine)"
              >
                {isAboveLeidenfrost && dropletY >= 120 && (
                  <animate attributeName="cy" values={`${173 - dropletRadius * 0.3};${177 - dropletRadius * 0.3};${173 - dropletRadius * 0.3}`} dur="0.4s" repeatCount="indefinite" />
                )}
              </ellipse>

              {/* Small secondary highlight */}
              <ellipse
                cx={dropletX + 50 + dropletRadius * 0.3}
                cy={(isAboveLeidenfrost && dropletY >= 120 ? 175 : dropletY + 55) + dropletRadius * 0.2}
                rx={dropletRadius * 0.15}
                ry={dropletRadius * 0.1}
                fill="#ffffff"
                opacity="0.3"
              />
            </g>
          </g>
        )}

        {/* Steam/vapor bubbles (below Leidenfrost - rapid boiling) */}
        {vaporBubbles.map(b => (
          <g key={b.id} filter="url(#leidSteamBlur)">
            <circle
              cx={b.x + 50}
              cy={b.y + 55}
              r={4}
              fill="url(#leidSteamParticle)"
            />
          </g>
        ))}

        {/* Rising steam animation (continuous) */}
        {isDropped && dropletRadius > 0 && (
          <g opacity={0.4}>
            {[0, 1, 2, 3, 4].map(i => {
              const steamY = 160 - ((animationFrame * 1.5 + i * 30) % 100);
              const steamOpacity = 1 - ((animationFrame * 1.5 + i * 30) % 100) / 100;
              const steamX = dropletX + 50 + Math.sin(animationFrame * 0.1 + i) * 8;
              return (
                <circle
                  key={i}
                  cx={steamX}
                  cy={steamY}
                  r={3 + i * 0.5}
                  fill="url(#leidSteamParticle)"
                  opacity={steamOpacity * (isAboveLeidenfrost ? 0.5 : 0.8)}
                  filter="url(#leidSteamBlur)"
                />
              );
            })}
          </g>
        )}

        {/* Premium thermometer */}
        <g transform="translate(340, 40)">
          {/* Thermometer background */}
          <rect x="-18" y="-5" width="36" height="140" rx="8" fill="url(#leidThermometer)" stroke="#475569" strokeWidth="1" />

          {/* Inner tube */}
          <rect x="-10" y="5" width="20" height="115" rx="4" fill="#111827" />

          {/* Mercury level */}
          <rect
            x="-7"
            y={115 - (surfaceTemp / 400) * 105}
            width="14"
            height={(surfaceTemp / 400) * 105 + 5}
            rx="3"
            fill="url(#leidMercury)"
          />

          {/* Scale marks */}
          {[0, 100, 200, 300, 400].map((temp, i) => (
            <line
              key={temp}
              x1="12"
              y1={115 - (temp / 400) * 105}
              x2="18"
              y2={115 - (temp / 400) * 105}
              stroke={temp === 200 ? '#f59e0b' : '#64748b'}
              strokeWidth={temp === 200 ? 2 : 1}
            />
          ))}

          {/* Leidenfrost point indicator */}
          <g transform={`translate(-25, ${115 - (LEIDENFROST_POINT / 400) * 105})`}>
            <polygon points="0,0 8,-4 8,4" fill="#f59e0b" />
            <text x="-35" y="3" fontSize="11" fill="#f59e0b" fontWeight="bold">L.P.</text>
          </g>

          {/* Current temperature marker - interactive indicator dot */}
          <circle
            cx="0"
            cy={115 - (surfaceTemp / 400) * 105}
            r="6"
            fill={getSurfaceColor(surfaceTemp)}
            stroke="#ffffff"
            strokeWidth="1.5"
            filter="url(#leidDropletGlow)"
          />

          {/* Temperature display */}
          <rect x="-20" y="125" width="40" height="20" rx="4" fill="#0f172a" stroke="#334155" />
          <text x="0" y="139" textAnchor="middle" fontSize="11" fill="#f8fafc" fontWeight="bold">
            {surfaceTemp}°C
          </text>
        </g>

        {/* Status indicator panel */}
        <rect x="10" y="10" width="180" height="28" rx="6" fill={isAboveLeidenfrost ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)'} stroke={isAboveLeidenfrost ? '#10b981' : '#f97316'} strokeWidth="1" />
        <circle cx="22" cy="24" r="4" fill={isAboveLeidenfrost ? '#10b981' : '#f97316'}>
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="32" y="28" fontSize="11" fill={isAboveLeidenfrost ? '#10b981' : '#f97316'} fontWeight="bold">
          {!isDropped ? 'READY - Drop water' :
            isAboveLeidenfrost ? 'LEIDENFROST ACTIVE' :
              dropletState === 'sizzling' ? 'RAPID SIZZLE' :
                dropletState === 'boiling' ? 'BOILING' : 'EVAPORATING'}
        </text>

        {/* Formula and axes - well-separated from other elements */}
        {/* Y-axis label */}
        <text x="50" y="172" textAnchor="start" fontSize="12" fill="#94a3b8" fontWeight="600">
          Y: Height
        </text>
        {/* X-axis label */}
        <text x="50" y="188" textAnchor="start" fontSize="12" fill="#94a3b8">
          X: Temperature (°C)
        </text>
        {/* Heat flux formula */}
        <text x="50" y="204" textAnchor="start" fontSize="11" fill="#64748b">
          q = h·(T_surface − T_vapor)
        </text>
        {/* Status description */}
        <text x="50" y="218" textAnchor="start" fontSize="11" fill={isAboveLeidenfrost ? '#10b981' : '#f59e0b'}>
          {isAboveLeidenfrost ? 'Vapor insulation active' : 'Direct contact boiling'}
        </text>

        {/* Leidenfrost curve spanning full height (top to bottom) */}
        <path
          d={`M 30 20 C 80 40 120 80 155 130 C 175 160 180 175 185 185`}
          fill="none"
          stroke={isAboveLeidenfrost ? '#10b981' : '#f59e0b'}
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.4"
        />
      </svg>
    );
  };

  // Render evaporation time comparison for twist - Premium SVG visualization
  const renderEvaporationComparison = () => {
    const isAboveLeidenfrost = twistTemp >= LEIDENFROST_POINT;

    return (
      <svg viewBox="0 0 400 260" style={{ width: '100%', maxWidth: '400px' }}>
        <defs>
          {/* Background gradient */}
          <linearGradient id="leidTwistBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Hot surface gradient for twist */}
          <linearGradient id="leidTwistSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={twistTemp >= 250 ? '#ef4444' : twistTemp >= 200 ? '#f97316' : twistTemp >= 150 ? '#f59e0b' : '#78350f'} />
            <stop offset="30%" stopColor={twistTemp >= 250 ? '#dc2626' : twistTemp >= 200 ? '#ea580c' : twistTemp >= 150 ? '#d97706' : '#57534e'} />
            <stop offset="70%" stopColor={twistTemp >= 250 ? '#b91c1c' : twistTemp >= 200 ? '#c2410c' : twistTemp >= 150 ? '#b45309' : '#44403c'} />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>

          {/* Heat glow for twist */}
          <radialGradient id="leidTwistHeatGlow" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor={twistTemp >= 250 ? '#ef4444' : twistTemp >= 200 ? '#f97316' : '#fbbf24'} stopOpacity={twistTemp >= 200 ? 0.5 : 0.25} />
            <stop offset="60%" stopColor={twistTemp >= 250 ? '#dc2626' : twistTemp >= 200 ? '#ea580c' : '#f59e0b'} stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Water droplet gradient for twist */}
          <radialGradient id="leidTwistDroplet" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
          </radialGradient>

          {/* Droplet shine for twist */}
          <radialGradient id="leidTwistShine" cx="30%" cy="20%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          {/* Vapor cushion for twist */}
          <linearGradient id="leidTwistVapor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </linearGradient>

          {/* Timer glow gradient */}
          <radialGradient id="leidTimerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isAboveLeidenfrost ? '#10b981' : '#f97316'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isAboveLeidenfrost ? '#10b981' : '#f97316'} stopOpacity="0" />
          </radialGradient>

          {/* Steam particle */}
          <radialGradient id="leidTwistSteam" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </radialGradient>

          {/* Filters */}
          <filter id="leidTwistGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leidTwistDropGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leidTwistBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="400" height="260" fill="url(#leidTwistBg)" rx="12" />

        {/* Grid pattern */}
        <pattern id="leidTwistGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="400" height="260" fill="url(#leidTwistGrid)" rx="12" />

        {/* Timer display - premium style */}
        <g transform="translate(200, 50)">
          {/* Timer glow background */}
          <ellipse cx="0" cy="0" rx="70" ry="35" fill="url(#leidTimerGlow)" />

          {/* Timer frame */}
          <rect x="-60" y="-25" width="120" height="50" rx="10" fill="#0f172a" stroke={isAboveLeidenfrost ? '#10b981' : '#f97316'} strokeWidth="2" />

          {/* Timer value */}
          <text x="0" y="8" textAnchor="middle" fontSize="28" fill="#f8fafc" fontWeight="bold" fontFamily="monospace">
            {evaporationTime.toFixed(1)}s
          </text>

          {/* Timer label */}
          <text x="0" y="38" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="500">
            EVAPORATION TIME
          </text>
        </g>

        {/* Temperature status bar */}
        <g transform="translate(200, 85)">
          <rect x="-100" y="0" width="200" height="22" rx="6" fill={isAboveLeidenfrost ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)'} stroke={isAboveLeidenfrost ? 'rgba(16, 185, 129, 0.4)' : 'rgba(249, 115, 22, 0.4)'} />
          <text x="0" y="15" textAnchor="middle" fontSize="11" fill={isAboveLeidenfrost ? '#10b981' : '#f97316'} fontWeight="600">
            {twistTemp}°C — {isAboveLeidenfrost ? 'ABOVE Leidenfrost Point' : 'BELOW Leidenfrost Point'}
          </text>
        </g>

        {/* Heat glow above surface */}
        {twistTemp >= 150 && (
          <ellipse
            cx="200"
            cy="175"
            rx="100"
            ry="50"
            fill="url(#leidTwistHeatGlow)"
            filter="url(#leidTwistGlow)"
            opacity={Math.min(0.8, (twistTemp - 100) / 200)}
          >
            <animate attributeName="ry" values="45;55;45" dur="1.5s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Hot surface */}
        <g>
          <rect x="78" y="182" width="244" height="42" rx="6" fill="#000000" opacity="0.4" />
          <rect x="80" y="180" width="240" height="40" rx="6" fill="url(#leidTwistSurface)" />
          <rect x="80" y="180" width="240" height="6" rx="3" fill="#ffffff" opacity="0.08" />

          {/* Surface texture */}
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <line key={i} x1={100 + i * 32} y1="185" x2={100 + i * 32} y2="215" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.08" />
          ))}
        </g>

        {/* Animated heat waves */}
        {twistTemp >= 120 && (
          <g opacity={Math.min(0.6, (twistTemp - 100) / 150)}>
            {[0, 1, 2, 3, 4].map(i => {
              const offset = (animationFrame * 2 + i * 30) % 60;
              const startY = 185;
              const endY = 15 + offset;
              const opacity = 1 - offset / 60;
              return (
                <path
                  key={i}
                  d={`M ${120 + i * 40} ${startY} C ${130 + i * 40} ${(startY + endY) / 2 + 15} ${110 + i * 40} ${(startY + endY) / 2 - 15} ${120 + i * 40} ${endY}`}
                  fill="none"
                  stroke={twistTemp >= 250 ? '#fca5a5' : twistTemp >= 200 ? '#fdba74' : '#fde047'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity={opacity * 0.35}
                />
              );
            })}
          </g>
        )}

        {/* Water droplet with premium effects */}
        {twistDropletRadius > 0 && (
          <g>
            {/* Vapor cushion (above Leidenfrost) */}
            {isAboveLeidenfrost && (
              <g filter="url(#leidTwistBlur)">
                <ellipse
                  cx="200"
                  cy="178"
                  rx={twistDropletRadius * 1.3}
                  ry={5}
                  fill="url(#leidTwistVapor)"
                >
                  <animate attributeName="ry" values="4;6;4" dur="0.25s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.8;0.5" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
              </g>
            )}

            {/* Droplet with 3D appearance */}
            <g filter="url(#leidTwistDropGlow)">
              {/* Shadow */}
              <ellipse
                cx="202"
                cy={(isAboveLeidenfrost ? 163 : 172) + 5}
                rx={twistDropletRadius * 0.6}
                ry={twistDropletRadius * 0.15}
                fill="#000000"
                opacity="0.25"
              />

              {/* Main droplet */}
              <ellipse
                cx="200"
                cy={isAboveLeidenfrost ? 163 : 172}
                rx={twistDropletRadius}
                ry={twistDropletRadius * 0.85}
                fill="url(#leidTwistDroplet)"
              >
                {isAboveLeidenfrost && (
                  <animate attributeName="cy" values="161;165;161" dur="0.4s" repeatCount="indefinite" />
                )}
              </ellipse>

              {/* Highlight */}
              <ellipse
                cx={200 - twistDropletRadius * 0.25}
                cy={(isAboveLeidenfrost ? 163 : 172) - twistDropletRadius * 0.3}
                rx={twistDropletRadius * 0.35}
                ry={twistDropletRadius * 0.22}
                fill="url(#leidTwistShine)"
              >
                {isAboveLeidenfrost && (
                  <animate attributeName="cy" values={`${161 - twistDropletRadius * 0.3};${165 - twistDropletRadius * 0.3};${161 - twistDropletRadius * 0.3}`} dur="0.4s" repeatCount="indefinite" />
                )}
              </ellipse>
            </g>

            {/* Rising steam (continuous when evaporating) */}
            {isEvaporating && (
              <g opacity={0.5}>
                {[0, 1, 2, 3].map(i => {
                  const steamY = 155 - ((animationFrame * 1.5 + i * 25) % 70);
                  const steamOpacity = 1 - ((animationFrame * 1.5 + i * 25) % 70) / 70;
                  const steamX = 200 + Math.sin(animationFrame * 0.1 + i * 1.5) * 6;
                  return (
                    <circle
                      key={i}
                      cx={steamX}
                      cy={steamY}
                      r={2.5 + i * 0.4}
                      fill="url(#leidTwistSteam)"
                      opacity={steamOpacity * (isAboveLeidenfrost ? 0.4 : 0.7)}
                      filter="url(#leidTwistBlur)"
                    />
                  );
                })}
              </g>
            )}
          </g>
        )}

        {/* Fully evaporated indicator */}
        {twistDropletRadius <= 0 && (
          <g transform="translate(200, 155)">
            <text x="0" y="0" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="bold">
              FULLY EVAPORATED
            </text>
            <text x="0" y="16" textAnchor="middle" fontSize="11" fill="#64748b">
              in {evaporationTime.toFixed(1)} seconds
            </text>
          </g>
        )}

        {/* Evaporation rate curve - spanning full height for visibility */}
        <path
          d="M 20 10 C 60 30 100 80 150 130 C 180 160 200 195 220 230"
          fill="none"
          stroke={isAboveLeidenfrost ? '#10b981' : '#f59e0b'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.25"
        />

        {/* Status message */}
        <g transform="translate(200, 240)">
          <text x="0" y="0" textAnchor="middle" fontSize="11" fill="#94a3b8">
            {isEvaporating ? (isAboveLeidenfrost ? 'Hovering on vapor cushion — slow evaporation' : 'Direct surface contact — rapid evaporation!') :
              twistDropletRadius <= 0 ? 'Experiment complete — try a different temperature' : 'Ready to start experiment'}
          </text>
        </g>
      </svg>
    );
  };

  // Phase navigation functions
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    playSound('transition');
  }, [playSound]);

  const goToNextPhase = useCallback(() => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < phaseOrder.length) {
      setPhase(phaseOrder[nextIndex]);
      onPhaseComplete?.(nextIndex);
      playSound('transition');
    }
  }, [currentPhaseIndex, onPhaseComplete, playSound]);

  const goToPreviousPhase = useCallback(() => {
    if (currentPhaseIndex > 0) {
      setPhase(phaseOrder[currentPhaseIndex - 1]);
      playSound('click');
    }
  }, [currentPhaseIndex, playSound]);

  // Navigation bar - fixed position with proper z-index
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '60px',
      background: 'rgba(15, 23, 42, 0.98)',
      borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      padding: '12px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 'bold' }}>
          Leidenfrost Effect
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Phase: {phaseLabels[phase]}
        </div>
      </div>
      {/* Navigation dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
        {phaseOrder.map((p, idx) => (
          <button
            key={p}
            onClick={() => idx <= currentPhaseIndex && goToPhase(p)}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: idx <= currentPhaseIndex ? 'pointer' : 'default',
              opacity: idx <= currentPhaseIndex ? 1 : 0.5
            }}
          >
            <div style={{
              width: p === phase ? '24px' : '10px',
              height: '10px',
              borderRadius: '9999px',
              background: idx < currentPhaseIndex ? '#10b981' : p === phase ? '#ef4444' : '#475569',
              transition: 'all 0.3s ease'
            }} />
          </button>
        ))}
      </div>
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={currentPhaseIndex + 1}
        aria-valuemin={1}
        aria-valuemax={phaseOrder.length}
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(71, 85, 105, 0.3)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <div style={{
          width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
          height: '100%',
          background: 'linear-gradient(to right, #ef4444, #dc2626)',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1001,
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
        onClick={goToPreviousPhase}
        disabled={currentPhaseIndex === 0}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: '1px solid #64748b',
          background: 'transparent',
          color: currentPhaseIndex === 0 ? '#64748b' : '#e2e8f0',
          fontWeight: '500',
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          minHeight: '44px'
        }}
      >
        ← Back
      </button>
      <button
        onClick={goToNextPhase}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          minHeight: '44px',
          transition: 'all 0.3s ease'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          padding: '24px',
          textAlign: 'center',
          overflowY: 'auto'
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

          <p style={{ fontSize: '18px', color: '#e2e8f0', maxWidth: '500px', marginBottom: '40px' }}>
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
              <p style={{ fontSize: '16px', color: '#e2e8f0', lineHeight: '1.6' }}>
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
        {renderFooter(true, 'Start Prediction →')}
      </div>
    );
  }

  // Static predict visualization
  const renderPredictVisualization = () => (
    <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
      <defs>
        <linearGradient id="predictBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="hotSurface150" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="hotSurface300" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <radialGradient id="predictDroplet" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="url(#predictBg)" rx="12" />
      {/* 150C pan */}
      <g transform="translate(50, 50)">
        <rect x="0" y="100" width="120" height="30" rx="4" fill="url(#hotSurface150)" />
        <ellipse cx="60" cy="85" rx="12" ry="10" fill="url(#predictDroplet)" />
        <text x="60" y="150" textAnchor="middle" fontSize="14" fill="#f59e0b" fontWeight="bold">150C</text>
        <text x="60" y="30" textAnchor="middle" fontSize="12" fill="#e2e8f0">Pan A</text>
      </g>
      {/* 300C pan */}
      <g transform="translate(230, 50)">
        <rect x="0" y="100" width="120" height="30" rx="4" fill="url(#hotSurface300)" />
        <ellipse cx="60" cy="85" rx="12" ry="10" fill="url(#predictDroplet)" />
        <text x="60" y="150" textAnchor="middle" fontSize="14" fill="#ef4444" fontWeight="bold">300C</text>
        <text x="60" y="30" textAnchor="middle" fontSize="12" fill="#e2e8f0">Pan B</text>
      </g>
      <text x="200" y="190" textAnchor="middle" fontSize="11" fill="#e2e8f0">Which droplet evaporates faster?</text>
    </svg>
  );

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

          {renderPredictVisualization()}

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#e2e8f0', marginBottom: '16px' }}>
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
                onClick={() => { if (!showPredictionFeedback) handlePrediction(option.id); }}
                onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
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
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Leidenfrost Lab</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '8px' }}>Adjust the surface temperature and drop water to see the effect! Observe how the droplet behavior changes versus the baseline.</p>
          <p style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '14px', fontStyle: 'italic' }}>
            Notice how the vapor layer forms when temperature increases above 200°C, resulting in slower evaporation. This technology is used in steel quenching, cooking, and cryogenic liquid handling industry applications. Compare current vs. reference baseline.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                {renderSurfaceVisualization()}
              </div>

              {/* Explanation panel */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: surfaceTemp >= LEIDENFROST_POINT ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                border: surfaceTemp >= LEIDENFROST_POINT ? '2px solid #10b981' : '2px solid #f59e0b',
                width: '100%',
                marginBottom: '16px',
              }}>
                {surfaceTemp >= LEIDENFROST_POINT ? (
                  <p style={{ color: '#10b981', fontSize: '14px' }}>
                    <strong>Leidenfrost Effect Active!</strong> The water instantly vaporizes at the bottom, creating a vapor cushion that insulates the droplet.
                  </p>
                ) : (
                  <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                    <strong>Below Leidenfrost Point:</strong> The water makes direct contact with the surface, causing rapid heat transfer and quick evaporation.
                  </p>
                )}
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Temperature: {surfaceTemp}C
                  <span style={{ color: surfaceTemp >= LEIDENFROST_POINT ? '#10b981' : '#f59e0b', marginLeft: '8px', fontSize: '12px' }}>
                    {surfaceTemp >= LEIDENFROST_POINT ? '(Above!)' : '(Below)'}
                  </span>
                </label>
                <input
                  type="range"
                  min="80"
                  max="350"
                  value={surfaceTemp}
                  onChange={(e) => { setSurfaceTemp(parseInt(e.target.value)); resetExperiment(); }}
                  style={{ width: '100%', accentColor: getSurfaceColor(surfaceTemp), touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>80C</span>
                  <span style={{ color: '#f59e0b' }}>200C</span>
                  <span>350C</span>
                </div>
              </div>

              {/* Droplet Size Control */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Droplet Size: {dropletSize} mm
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={dropletSize}
                  onChange={(e) => { setDropletSize(parseInt(e.target.value)); resetExperiment(); }}
                  style={{ width: '100%', accentColor: '#3b82f6', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>2mm</span>
                  <span>10mm</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); dropWater(); }}
                  disabled={isDropped && dropletRadius > 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: isDropped && dropletRadius > 0 ? 'not-allowed' : 'pointer',
                    background: isDropped && dropletRadius > 0 ? '#475569' : 'linear-gradient(to right, #3b82f6, #2563eb)',
                    color: isDropped && dropletRadius > 0 ? '#94a3b8' : 'white',
                    minHeight: '44px'
                  }}
                >
                  Drop Water
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); resetExperiment(); }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#374151',
                    color: 'white',
                    minHeight: '44px'
                  }}
                >
                  Reset
                </button>
              </div>

              {/* Key Physics Terms */}
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.5)', width: '100%' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '12px' }}>Key Physics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                  <div><strong style={{ color: '#10b981' }}>Leidenfrost Point:</strong> ~200C for water</div>
                  <div><strong style={{ color: '#10b981' }}>Vapor Cushion:</strong> Insulating vapor layer</div>
                  <div><strong style={{ color: '#10b981' }}>Film Boiling:</strong> Continuous vapor film</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>The Science of the Leidenfrost Effect</h2>

          {/* Reference user's prediction */}
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '16px', marginBottom: '24px', maxWidth: '640px', width: '100%', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              <strong style={{ color: '#10b981' }}>Your prediction was correct!</strong> The 150C droplet evaporates faster because at 300C the Leidenfrost effect creates an insulating vapor cushion.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>The Vapor Cushion</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Above the Leidenfrost point (~200C for water), the bottom of the droplet instantly vaporizes. This vapor layer (0.1-0.2mm thick) acts as an insulating cushion, supporting the droplet above the surface.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>Why Slower Evaporation?</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Vapor is a poor heat conductor! The same layer that levitates the droplet also insulates it from the hot surface. Heat must radiate or conduct through the vapor - much slower than direct contact.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>The Frictionless Hovercraft</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                The vapor layer isn't just insulation - it's like an air hockey table! With almost no friction, droplets glide freely, bouncing off edges and even climbing inclines. The vapor continuously replenishes from the evaporating bottom.
              </p>
              <p style={{ color: '#a7f3d0', fontSize: '14px', marginTop: '8px', fontFamily: 'monospace' }}>
                Heat flux q = h × (T_surface − T_vapor), where h is the film boiling heat transfer coefficient. Above the Leidenfrost point, h drops dramatically because vapor insulates — this relationship explains why hotter surfaces cause slower evaporation.
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
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Temperature Paradox</h2>

          {/* Preview visualization */}
          <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
            <rect width="400" height="200" fill="#0f172a" rx="8" />
            <text x="200" y="30" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="bold">Droplet Lifetime vs Temperature</text>
            <line x1="60" y1="160" x2="340" y2="160" stroke="#475569" strokeWidth="2" />
            <line x1="60" y1="40" x2="60" y2="160" stroke="#475569" strokeWidth="2" />
            <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#94a3b8">Temperature (°C)</text>
            <text x="35" y="100" textAnchor="middle" fontSize="11" fill="#94a3b8" transform="rotate(-90 35 100)">Lifetime (s)</text>
            <text x="80" y="175" textAnchor="middle" fontSize="11" fill="#94a3b8">100</text>
            <text x="200" y="175" textAnchor="middle" fontSize="11" fill="#94a3b8">200</text>
            <text x="320" y="175" textAnchor="middle" fontSize="11" fill="#94a3b8">400</text>
            <circle cx="200" cy="100" r="8" fill="#f59e0b" opacity="0.5" />
            <text x="200" y="120" textAnchor="middle" fontSize="12" fill="#f59e0b">?</text>
          </svg>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#e2e8f0', marginBottom: '16px' }}>
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
                onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
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
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Evaporation Time Comparison</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>Compare how long a droplet lasts at different temperatures!</p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                {renderEvaporationComparison()}
              </div>

              {/* Quick comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
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

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature selector */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Temperature: {twistTemp}C
                </label>
                <input
                  type="range"
                  min="120"
                  max="300"
                  value={twistTemp}
                  onChange={(e) => { setTwistTemp(parseInt(e.target.value)); setIsEvaporating(false); setTwistDropletRadius(15); setEvaporationTime(0); }}
                  style={{ width: '100%', accentColor: getSurfaceColor(twistTemp), touchAction: 'pan-y' }}
                />
              </div>

              <button
                onPointerDown={(e) => { e.preventDefault(); startTwistExperiment(); }}
                disabled={isEvaporating}
                style={{
                  width: '100%',
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
          </div>
        </div>
        {renderFooter(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Leidenfrost Paradox Explained</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>Below Leidenfrost (~100-180C)</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Droplet makes direct contact with surface. Heat conducts directly into water. Hotter = faster evaporation. Violent boiling and sizzling. Lifetime: seconds.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>Above Leidenfrost (~200C+)</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Vapor cushion prevents contact. Heat must radiate through vapor. Droplet hovers peacefully. Hotter surface = more vapor = better insulation! Lifetime: minutes.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(139, 92, 246, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '12px' }}>The Famous Lifetime Curve</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
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
    const currentApp = realWorldApps[activeAppTab];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {realWorldApps.map((app, index) => (
              <button
                key={index}
                onPointerDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  background: activeAppTab === index ? '#ef4444' : completedApps.has(index) ? 'rgba(16, 185, 129, 0.3)' : '#374151',
                  border: completedApps.has(index) ? '1px solid #10b981' : '1px solid transparent',
                  color: 'white',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                {app.icon} {app.short}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{currentApp.icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{currentApp.title}</h3>
            </div>
            <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '12px', fontStyle: 'italic', fontWeight: '600' }}>{currentApp.tagline}</p>
            <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '12px' }}>{currentApp.description}</p>
            <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '8px' }}>{currentApp.howItWorks}</p>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>{currentApp.connection}</p>

            {/* Key Stats Summary */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#e2e8f0' }}>
              <strong>Key Metrics:</strong> {currentApp.stats.map((s, i) => s.value).join(' • ')}
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentApp.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Companies */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Industry Leaders:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentApp.companies.map((company, i) => (
                  <span key={i} style={{ background: 'rgba(71, 85, 105, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#e2e8f0' }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Applications:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', fontSize: '14px' }}>
                {currentApp.examples.map((example, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{example}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${currentApp.color}` }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>Future Impact:</div>
              <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{currentApp.futureImpact}</div>
            </div>

            <button
              onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: completedApps.has(activeAppTab) ? '#374151' : '#10b981',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              {completedApps.has(activeAppTab) ? 'Got It' : 'Got It'}
            </button>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#e2e8f0' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#e2e8f0' }}>{completedApps.size}/4</span>
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
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
          {renderNavBar()}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
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
              <p style={{ color: '#e2e8f0' }}>
                {score >= 8 ? 'Excellent! You\'ve mastered the Leidenfrost effect!' : 'Keep studying! Review and try again.'}
              </p>
            </div>

            <h4 style={{ color: '#e2e8f0', fontSize: '18px', marginBottom: '16px' }}>Answer Review</h4>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <p style={{ color: 'white', fontWeight: '500' }}>{qIndex + 1}. {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#e2e8f0'
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
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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
            {currentQ.options.map((opt, oIndex) => {
              const isChecked = checkedQuestions.has(currentTestQuestion);
              const isSelected = testAnswers[currentTestQuestion] === oIndex;
              const isCorrectOption = opt.correct;
              let borderColor = '1px solid rgba(255,255,255,0.2)';
              let bgColor = 'transparent';
              if (isChecked && isCorrectOption) { borderColor = '2px solid #10b981'; bgColor = 'rgba(16,185,129,0.2)'; }
              else if (isChecked && isSelected && !isCorrectOption) { borderColor = '2px solid #ef4444'; bgColor = 'rgba(239,68,68,0.2)'; }
              else if (!isChecked && isSelected) { borderColor = '2px solid #3b82f6'; bgColor = 'rgba(59,130,246,0.2)'; }
              return (
                <button
                  key={oIndex}
                  onClick={() => { if (!isChecked) handleTestAnswer(currentTestQuestion, oIndex); }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: borderColor,
                    background: bgColor,
                    color: 'white',
                    cursor: isChecked ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px'
                  }}
                >
                  {isChecked && isCorrectOption ? '✓ ' : isChecked && isSelected && !isCorrectOption ? '✗ ' : ''}{String.fromCharCode(65 + oIndex)}) {opt.text}
                </button>
              );
            })}
          </div>

          {/* Check Answer button - appears after selection, before checking */}
          {testAnswers[currentTestQuestion] !== null && !checkedQuestions.has(currentTestQuestion) && (
            <button
              onClick={() => setCheckedQuestions(prev => new Set([...prev, currentTestQuestion]))}
              style={{
                marginTop: '12px',
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: '44px',
                width: '100%',
                maxWidth: '640px'
              }}
            >
              Check Answer
            </button>
          )}

          {/* Explanation after checking */}
          {checkedQuestions.has(currentTestQuestion) && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              borderRadius: '12px',
              background: testAnswers[currentTestQuestion] !== null && currentQ.options[testAnswers[currentTestQuestion]!].correct
                ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: testAnswers[currentTestQuestion] !== null && currentQ.options[testAnswers[currentTestQuestion]!].correct
                ? '1px solid #10b981' : '1px solid #ef4444',
              maxWidth: '640px',
              width: '100%'
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                {testAnswers[currentTestQuestion] !== null && currentQ.options[testAnswers[currentTestQuestion]!].correct
                  ? '✓ Correct! The correct answer is: ' + currentQ.options.find(o => o.correct)?.text
                  : '✗ Incorrect. The correct answer is: ' + currentQ.options.find(o => o.correct)?.text}
              </p>
            </div>
          )}

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
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                minHeight: '44px'
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
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Next Question
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
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  minHeight: '44px'
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        {renderFooter(false, 'Complete Test First')}
      </div>
    );
  }

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', paddingTop: '80px' }}>
        {renderNavBar()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center', overflowY: 'auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '640px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Leidenfrost Master!</h1>
            <p style={{ fontSize: '18px', color: '#e2e8f0', marginBottom: '24px' }}>
              You've mastered the physics of vapor cushions and heat transfer!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💧</div>
                <p style={{ fontSize: '14px', color: '#e2e8f0' }}>Vapor Cushions</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p style={{ fontSize: '14px', color: '#e2e8f0' }}>Heat Transfer</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛸</div>
                <p style={{ fontSize: '14px', color: '#e2e8f0' }}>Low Friction</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <p style={{ fontSize: '14px', color: '#e2e8f0' }}>Temperature Paradox</p>
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
