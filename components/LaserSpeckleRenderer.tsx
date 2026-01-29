'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// LASER SPECKLE RENDERER - Coherence Makes "Grainy Light"
// =============================================================================
// Game 132: Explore why laser light creates a granular speckle pattern
// when illuminating rough surfaces due to coherent wave interference.
// =============================================================================

interface LaserSpeckleRendererProps {
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

interface SpecklePoint {
  x: number;
  y: number;
  phase: number;
  intensity: number;
}

const LaserSpeckleRenderer: React.FC<LaserSpeckleRendererProps> = ({
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
  const [coherenceLength, setCoherenceLength] = useState(100); // 0-100%
  const [surfaceRoughness, setSurfaceRoughness] = useState(50); // 0-100%
  const [viewpointOffset, setViewpointOffset] = useState(0); // -50 to 50
  const [isAnimating, setIsAnimating] = useState(true);
  const [useLaser, setUseLaser] = useState(true); // true=laser, false=flashlight
  const [specklePattern, setSpecklePattern] = useState<SpecklePoint[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate speckle pattern based on parameters
  useEffect(() => {
    const generateSpeckle = () => {
      const points: SpecklePoint[] = [];
      const numScatterPoints = 50 + Math.floor(surfaceRoughness * 0.5);

      for (let i = 0; i < numScatterPoints; i++) {
        const x = Math.random() * 300;
        const y = Math.random() * 200;
        const basePhase = Math.random() * 2 * Math.PI;
        const phaseVariation = useLaser ? (coherenceLength / 100) : 0.1;
        const actualPhase = basePhase + (1 - phaseVariation) * Math.random() * 2 * Math.PI;

        // Intensity depends on interference
        let intensity = 0.5;
        if (useLaser) {
          // Coherent light creates strong interference
          intensity = 0.3 + 0.7 * Math.abs(Math.cos(actualPhase + viewpointOffset * 0.1));
        } else {
          // Incoherent light averages out
          intensity = 0.4 + 0.2 * Math.random();
        }

        points.push({ x, y, phase: actualPhase, intensity });
      }
      setSpecklePattern(points);
    };

    generateSpeckle();
  }, [coherenceLength, surfaceRoughness, viewpointOffset, useLaser, animationFrame]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'complete' | 'transition' | 'laser') => {
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
        laser: [800, 850, 800]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      });

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, []);

  const handlePrediction = (prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect && onCorrectAnswer) onCorrectAnswer();
    if (!isCorrect && onIncorrectAnswer) onIncorrectAnswer();
  };

  const handleTwistPrediction = (prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
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
      scenario: "You're shining a laser pointer at a white wall and notice the light has a grainy, sparkly appearance.",
      question: "What causes this speckle pattern?",
      options: [
        { id: 'a', text: 'Dust particles in the air scattering light' },
        { id: 'b', text: 'Defects in the laser diode' },
        { id: 'c', text: 'Coherent light waves interfering after scattering from the rough surface', correct: true },
        { id: 'd', text: 'Your eyes playing tricks on you' }
      ],
      explanation: "Speckle patterns form because laser light is coherent - all waves have a fixed phase relationship. When these waves scatter from many points on a rough surface, they interfere constructively (bright spots) and destructively (dark spots) creating the grainy pattern."
    },
    {
      id: 2,
      scenario: "A scientist switches from a red HeNe laser to a blue diode laser while studying speckle patterns.",
      question: "How will the speckle pattern change?",
      options: [
        { id: 'a', text: 'Speckles become larger' },
        { id: 'b', text: 'Speckles become smaller', correct: true },
        { id: 'c', text: 'Speckle pattern disappears' },
        { id: 'd', text: 'No change in speckle size' }
      ],
      explanation: "Speckle size is proportional to wavelength. Blue light has a shorter wavelength than red, so the interference pattern has finer detail, making speckles smaller. The relationship is: speckle size ~ wavelength/NA."
    },
    {
      id: 3,
      scenario: "You move your head slightly while looking at a laser-illuminated surface.",
      question: "What happens to the speckle pattern?",
      options: [
        { id: 'a', text: 'Pattern stays exactly the same' },
        { id: 'b', text: 'Pattern moves with your head, appearing to float in front of the surface' },
        { id: 'c', text: 'Pattern shifts and changes as different interference conditions are observed', correct: true },
        { id: 'd', text: 'Pattern completely vanishes' }
      ],
      explanation: "The speckle pattern depends on the observation angle. Moving your viewpoint changes which scattered waves reach your eye and how they interfere. This is why speckle appears to 'crawl' when you move - you're sampling different parts of the 3D interference field."
    },
    {
      id: 4,
      scenario: "An engineer is testing two light sources: a laser and an LED of the same color.",
      question: "Which will produce a stronger speckle pattern on a rough surface?",
      options: [
        { id: 'a', text: 'The LED, because it is brighter' },
        { id: 'b', text: 'The laser, because of its high coherence', correct: true },
        { id: 'c', text: 'Both produce identical patterns' },
        { id: 'd', text: 'Neither produces speckle' }
      ],
      explanation: "Lasers have high spatial and temporal coherence, meaning all photons have consistent phase relationships. LEDs are partially coherent - their random phase fluctuations average out interference effects, producing much weaker or no visible speckle."
    },
    {
      id: 5,
      scenario: "A researcher wants to reduce speckle in a laser projection system.",
      question: "Which approach would be most effective?",
      options: [
        { id: 'a', text: 'Use a brighter laser' },
        { id: 'b', text: 'Reduce the coherence by using a rotating diffuser or multiple wavelengths', correct: true },
        { id: 'c', text: 'Make the screen smoother' },
        { id: 'd', text: 'Increase the coherence length' }
      ],
      explanation: "Speckle reduction requires breaking the coherence. Rotating diffusers, vibrating screens, or using multiple uncorrelated wavelengths create time-varying speckle patterns that average out to the eye. A smoother screen would reduce speckle but also reduce diffuse reflection."
    },
    {
      id: 6,
      scenario: "In laser blood flow imaging, doctors observe speckle patterns on skin illuminated by laser light.",
      question: "How does blood flow affect the speckle pattern?",
      options: [
        { id: 'a', text: 'Blood absorbs all the laser light' },
        { id: 'b', text: 'Moving blood cells cause speckle pattern to fluctuate over time', correct: true },
        { id: 'c', text: 'Blood flow creates new laser beams' },
        { id: 'd', text: 'Blood flow has no effect on speckle' }
      ],
      explanation: "Moving blood cells act as moving scatterers. As they flow, the interference pattern changes rapidly. Areas with faster blood flow show more rapid speckle fluctuations, while static tissue maintains stable speckle. This is the basis of laser speckle contrast imaging (LSCI)."
    },
    {
      id: 7,
      scenario: "A materials scientist is measuring surface roughness using laser speckle.",
      question: "What property of the speckle pattern indicates surface roughness?",
      options: [
        { id: 'a', text: 'The color of the speckle' },
        { id: 'b', text: 'The overall brightness' },
        { id: 'c', text: 'The contrast and correlation length of the speckle pattern', correct: true },
        { id: 'd', text: 'The number of speckles' }
      ],
      explanation: "Surface roughness affects how widely scattered waves vary in path length, which determines speckle contrast. Rougher surfaces (roughness >> wavelength) create higher contrast, fully developed speckle. The correlation length relates to the surface's spatial frequency content."
    },
    {
      id: 8,
      scenario: "You're setting up a holography experiment in a lab.",
      question: "Why is speckle an important consideration in holography?",
      options: [
        { id: 'a', text: 'Speckle makes holograms colorful' },
        { id: 'b', text: 'Speckle noise can degrade holographic image quality and must be managed', correct: true },
        { id: 'c', text: 'Speckle is required for holograms to work' },
        { id: 'd', text: 'Speckle has nothing to do with holography' }
      ],
      explanation: "Holography uses laser light and records interference patterns. Any speckle present during recording becomes frozen into the hologram as noise. Managing speckle through spatial filtering, multiple exposures, or digital processing is crucial for high-quality holograms."
    },
    {
      id: 9,
      scenario: "A fiber optic communication system uses coherent laser light traveling through a multimode fiber.",
      question: "What effect does speckle have in this system?",
      options: [
        { id: 'a', text: 'It increases data transmission speed' },
        { id: 'b', text: 'Modal speckle causes intensity fluctuations that can introduce noise', correct: true },
        { id: 'c', text: 'It improves signal quality' },
        { id: 'd', text: 'Speckle only occurs outside fibers' }
      ],
      explanation: "In multimode fibers, light travels via multiple paths (modes) that interfere at the output. Vibrations or temperature changes alter mode phases, causing the interference pattern (modal speckle) to fluctuate. This 'modal noise' can corrupt signals, which is why single-mode fibers are preferred for long-distance telecom."
    },
    {
      id: 10,
      scenario: "An astronomer is concerned about speckle when imaging stars through a telescope.",
      question: "What causes 'atmospheric speckle' in astronomy?",
      options: [
        { id: 'a', text: 'Dust on the telescope mirror' },
        { id: 'b', text: 'Turbulent air cells create varying path lengths for starlight', correct: true },
        { id: 'c', text: 'The stars themselves twinkle' },
        { id: 'd', text: 'Laser guide stars create it' }
      ],
      explanation: "Atmospheric turbulence acts like a dynamic rough surface. Starlight passing through turbulent cells experiences varying phase delays, causing interference at the telescope. This creates rapidly changing speckle patterns - the 'twinkling' of stars. Adaptive optics and speckle imaging techniques help recover sharp images."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🩸",
      title: "Laser Blood Flow Imaging",
      short: "Blood Flow",
      tagline: "Non-invasive measurement of circulation",
      description: "Laser Speckle Contrast Imaging (LSCI) monitors blood flow in real-time by analyzing how moving blood cells cause speckle patterns to fluctuate.",
      connection: "Moving scatterers (blood cells) cause rapid changes in the interference pattern. Areas with faster flow have more rapidly varying speckle and lower time-averaged contrast.",
      howItWorks: "A laser illuminates tissue, creating speckle from static tissue and blood cells. A camera captures images. Where blood flows, speckle blurs over the exposure time. Image processing converts blur to flow velocity maps.",
      stats: [
        { value: "0.1mm", label: "Spatial resolution" },
        { value: "25fps", label: "Temporal resolution" },
        { value: "1-10mm", label: "Imaging depth" },
        { value: "Non-", label: "invasive" }
      ],
      examples: [
        "Stroke assessment in neurosurgery",
        "Burn depth evaluation",
        "Retinal blood flow monitoring",
        "Wound healing assessment"
      ],
      companies: ["Moor Instruments", "Perimed", "FLPI Systems", "Aimago"],
      futureImpact: "LSCI is becoming standard in operating rooms for real-time tissue perfusion monitoring. Advances in algorithms and cameras enable portable devices for point-of-care diagnostics.",
      color: "from-red-600 to-rose-600"
    },
    {
      icon: "📏",
      title: "Surface Roughness Measurement",
      short: "Roughness",
      tagline: "Non-contact metrology with light",
      description: "Speckle-based methods measure surface roughness without touching the sample, critical for quality control in manufacturing.",
      connection: "Surface texture determines how light scatters and which path lengths contribute to speckle. Statistical analysis of speckle patterns reveals roughness parameters.",
      howItWorks: "Coherent light illuminates the surface. The resulting speckle contrast, correlation length, and angular distribution encode surface statistics. Calibration against known samples enables quantitative roughness measurement.",
      stats: [
        { value: "0.01um", label: "Roughness resolution" },
        { value: "100%", label: "Non-contact" },
        { value: "Seconds", label: "Measurement time" },
        { value: "mm^2", label: "Area coverage" }
      ],
      examples: [
        "Machined surface quality control",
        "Paper smoothness testing",
        "Semiconductor wafer inspection",
        "Paint finish evaluation"
      ],
      companies: ["KLA", "Zygo", "Keyence", "Bruker"],
      futureImpact: "In-line speckle sensors integrated into production lines enable 100% inspection without slowing manufacturing. AI analysis improves accuracy and detects subtle defects.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: "🔮",
      title: "Holography",
      short: "Holography",
      tagline: "Recording 3D light fields",
      description: "Holography captures and reconstructs 3D images using coherent light interference. Speckle is both a fundamental aspect and a noise source.",
      connection: "Holograms record interference between object and reference beams. The same coherence that enables holography also creates speckle noise from rough object surfaces.",
      howItWorks: "A laser beam splits into reference and object beams. Light scattered from the object interferes with the reference beam, recording a hologram on film or sensor. Reconstruction reverses this process.",
      stats: [
        { value: "Full 3D", label: "Depth information" },
        { value: "nm scale", label: "Resolution possible" },
        { value: "Real-time", label: "Digital holography" },
        { value: "Phase", label: "Information preserved" }
      ],
      examples: [
        "Security holograms on currency",
        "Microscopic imaging",
        "Artistic holographic displays",
        "Data storage research"
      ],
      companies: ["Zebra Imaging", "Leia Inc", "Real View Imaging", "Holoxica"],
      futureImpact: "Digital holography is advancing medical imaging, enabling 3D visualization of cells without staining. Holographic displays may eventually replace screens with true 3D images.",
      color: "from-purple-600 to-violet-600"
    },
    {
      icon: "📡",
      title: "Fiber Optic Sensing",
      short: "Fiber Sensing",
      tagline: "Distributed measurement using speckle",
      description: "Optical fibers act as distributed sensors where speckle patterns respond to temperature, strain, and vibration along the entire fiber length.",
      connection: "Light modes in fibers interfere to create speckle at the output. Environmental changes alter mode phases, causing measurable speckle variations. Coherent detection enables precise sensing.",
      howItWorks: "Coherent light enters a fiber. Backscattered light interferes to create speckle-like patterns in time domain. Analyzing changes in this pattern localizes and quantifies disturbances (strain, temperature, vibration).",
      stats: [
        { value: "50km+", label: "Sensing range" },
        { value: "1m", label: "Spatial resolution" },
        { value: "Real-time", label: "Monitoring" },
        { value: "No power", label: "At sensing points" }
      ],
      examples: [
        "Pipeline leak detection",
        "Perimeter security systems",
        "Structural health monitoring",
        "Seismic sensing arrays"
      ],
      companies: ["Luna Innovations", "Omnisens", "Silixa", "OptaSense"],
      futureImpact: "Distributed fiber sensing is transforming infrastructure monitoring. Single fibers can replace thousands of discrete sensors, enabling continuous monitoring of bridges, pipelines, and buildings.",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctIndex = testQuestions[index].options.findIndex(opt => opt.correct);
      return score + (answer === correctIndex ? 1 : 0);
    }, 0);
  };

  const renderSpeckleVisualization = () => {
    const baseColor = useLaser ? '#22c55e' : '#fbbf24';
    const effectiveCoherence = useLaser ? coherenceLength / 100 : 0.1;

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '400px', height: 'auto', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '12px' }}>
        <defs>
          <filter id="speckleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="lightSource" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={baseColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={baseColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        {[...Array(10)].map((_, i) => (
          <line key={`v${i}`} x1={30 * i} y1={0} x2={30 * i} y2={200} stroke="#334155" strokeWidth="0.5" />
        ))}
        {[...Array(7)].map((_, i) => (
          <line key={`h${i}`} x1={0} y1={30 * i} x2={300} y2={30 * i} stroke="#334155" strokeWidth="0.5" />
        ))}

        {/* Speckle pattern */}
        {specklePattern.map((point, i) => {
          const size = 3 + point.intensity * 5 * effectiveCoherence;
          const opacity = 0.3 + point.intensity * 0.7 * effectiveCoherence;

          return (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={size}
              fill={baseColor}
              opacity={opacity}
              filter={point.intensity > 0.7 && useLaser ? "url(#speckleGlow)" : undefined}
            />
          );
        })}

        {/* Light source indicator */}
        <g transform="translate(20, 20)">
          <circle cx="0" cy="0" r="15" fill="url(#lightSource)" />
          <text x="20" y="5" fontSize="10" fill="#94a3b8">{useLaser ? 'LASER' : 'LED'}</text>
        </g>

        {/* Coherence indicator */}
        <g transform="translate(150, 185)">
          <text x="0" y="0" fontSize="10" fill="#94a3b8" textAnchor="middle">
            Coherence: {useLaser ? `${coherenceLength}%` : 'Low'}
          </text>
        </g>
      </svg>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '24px 16px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#22c55e', letterSpacing: '0.05em' }}>WAVE OPTICS</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #86efac, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Laser Speckle
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '400px', marginBottom: '32px' }}>
        Why does laser light look like <span style={{ color: '#22c55e', fontWeight: 600 }}>crawling glitter</span>?
      </p>

      {/* Visual card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid rgba(71, 85, 105, 0.5)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg viewBox="0 0 200 120" style={{ width: '200px' }}>
            {/* Laser beam */}
            <rect x="10" y="55" width="40" height="10" fill="#22c55e" />

            {/* Beam spread */}
            <path d="M50,55 L90,30 L90,90 L50,65 Z" fill="#22c55e" opacity="0.3" />

            {/* Surface */}
            <rect x="90" y="25" width="10" height="70" fill="#475569" />

            {/* Speckle effect */}
            {[...Array(20)].map((_, i) => (
              <circle
                key={i}
                cx={120 + Math.random() * 70}
                cy={30 + Math.random() * 60}
                r={2 + Math.random() * 4}
                fill="#22c55e"
                opacity={0.3 + Math.random() * 0.7}
              />
            ))}

            {/* Eye */}
            <ellipse cx="180" cy="60" rx="12" ry="8" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="180" cy="60" r="4" fill="#1e293b" />
          </svg>
        </div>

        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          Shine a laser pointer at a wall and you'll see a <span style={{ color: '#22c55e' }}>grainy, sparkly pattern</span> that seems to <span style={{ color: '#fbbf24' }}>shimmer and crawl</span> as you move.
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          This "speckle" doesn't happen with flashlights. Why is laser light so different?
        </p>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.2)',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: '3px solid #22c55e',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Click "Make a Prediction" below to discover why laser light creates this unique pattern!
        </p>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          You shine a laser pointer at a white painted wall. Instead of a smooth dot, you see a grainy, sparkly pattern.
        </p>
        <p style={{ fontSize: '16px', color: '#22c55e', fontWeight: 500 }}>
          What causes this speckle pattern?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Dust particles floating in the air' },
          { id: 'B', text: 'Imperfections in the laser beam itself' },
          { id: 'C', text: 'Coherent waves interfering from many scatter points on the rough surface' },
          { id: 'D', text: 'The wall is actually not white but has colored spots' }
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
                ? option.id === 'C' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showPredictionFeedback && option.id === 'C'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'C')
                ? option.id === 'C' ? '2px solid #22c55e' : '2px solid #ef4444'
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
            {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'} Speckle comes from <span style={{ color: '#22c55e' }}>coherent interference</span>!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Laser light waves all have the same phase relationship. When they scatter from a rough surface, they interfere constructively (bright) and destructively (dark).
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Speckle Lab</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Explore how coherence and surface properties affect the pattern</p>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderSpeckleVisualization()}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
        {/* Coherence Length */}
        <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Coherence Length</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{coherenceLength}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={coherenceLength}
            onChange={(e) => {
              setCoherenceLength(Number(e.target.value));
                          }}
            style={{ width: '100%', accentColor: '#22c55e' }}
          />
        </div>

        {/* Surface Roughness */}
        <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Surface Roughness</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{surfaceRoughness}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={surfaceRoughness}
            onChange={(e) => {
              setSurfaceRoughness(Number(e.target.value));
                          }}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
        </div>

        {/* Viewpoint */}
        <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Viewpoint Offset</span>
            <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{viewpointOffset}</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={viewpointOffset}
            onChange={(e) => {
              setViewpointOffset(Number(e.target.value));
                          }}
            style={{ width: '100%', accentColor: '#8b5cf6' }}
          />
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Move to see pattern shift (like moving your head)</p>
        </div>
      </div>

      {/* Key insight */}
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', maxWidth: '400px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>Key Insight</p>
        <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
          Higher coherence = stronger speckle contrast. The pattern shifts as you change viewing angle because you're sampling different parts of the 3D interference field.
        </p>
      </div>

    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Why Speckle Happens</h2>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h3 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '12px' }}>Coherent Light</h3>
          <ul style={{ color: '#cbd5e1', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>All waves have fixed phase relationship</li>
            <li style={{ marginBottom: '8px' }}>Single wavelength (monochromatic)</li>
            <li style={{ marginBottom: '8px' }}>Waves can interfere constructively or destructively</li>
            <li>Creates high-contrast bright/dark pattern</li>
          </ul>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <h3 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '12px' }}>Rough Surface</h3>
          <ul style={{ color: '#cbd5e1', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>Surface has microscopic bumps and dips</li>
            <li style={{ marginBottom: '8px' }}>Light scatters from many random points</li>
            <li style={{ marginBottom: '8px' }}>Each point adds different path length</li>
            <li>Random phases create random interference</li>
          </ul>
        </div>
      </div>

      {/* Formula */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <h3 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>The Physics</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>Intensity at any point depends on summing many waves:</p>
        <div style={{ fontFamily: 'monospace', fontSize: '18px', color: 'white', marginBottom: '12px' }}>
          I = |E₁ + E₂ + ... + Eₙ|²
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Each electric field E has amplitude and phase. Random phases from the surface create random total intensity.
        </p>
      </div>

      {/* Key points */}
      <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
        <h3 style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '12px' }}>Key Points</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>1.</span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Speckle size ~ wavelength / aperture</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>2.</span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Pattern changes with viewing angle</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>3.</span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Contrast depends on coherence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>4.</span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Moving scatterers cause time-varying speckle</span>
          </div>
        </div>
      </div>

    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>The Twist</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          You've been using a <span style={{ color: '#22c55e' }}>laser</span> (coherent light) and seeing strong speckle patterns.
        </p>
        <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 500, marginBottom: '16px' }}>
          What happens if you replace the laser with an ordinary <span style={{ color: '#fbbf24' }}>flashlight</span> (incoherent light)?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '16px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '2px solid #22c55e' }}>
              <span style={{ fontSize: '24px' }}>💚</span>
            </div>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>Laser</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '24px' }}>→</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(251, 191, 36, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '2px solid #fbbf24' }}>
              <span style={{ fontSize: '24px' }}>🔦</span>
            </div>
            <span style={{ color: '#fbbf24', fontSize: '12px' }}>Flashlight</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Speckle pattern gets even stronger (more light = more interference)' },
          { id: 'B', text: 'Speckle pattern disappears (incoherent light doesn\'t create stable interference)' },
          { id: 'C', text: 'Speckle pattern stays the same (both are light, after all)' },
          { id: 'D', text: 'Speckle pattern becomes colorful (white light has all colors)' }
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
                ? option.id === 'B' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showTwistFeedback && option.id === 'B'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showTwistFeedback && (twistPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? '2px solid #22c55e' : '2px solid #ef4444'
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
            {twistPrediction === 'B' ? 'Exactly right!' : 'That\'s the surprising result!'} Speckle disappears!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Incoherent light has random, rapidly changing phases. The interference pattern averages out faster than your eye can see, leaving smooth, uniform illumination.
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>Laser vs Flashlight</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Toggle between coherent and incoherent light</p>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderSpeckleVisualization()}
      </div>

      {/* Light source toggle */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button
          onMouseDown={(e) => { e.preventDefault(); setUseLaser(true); playSound('laser'); }}
          style={{
            padding: '16px 32px',
            borderRadius: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: useLaser ? 'linear-gradient(to right, #22c55e, #16a34a)' : 'rgba(51, 65, 85, 0.5)',
            color: 'white',
            transition: 'all 0.3s'
          }}
        >
          💚 Laser (Coherent)
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setUseLaser(false); }}
          style={{
            padding: '16px 32px',
            borderRadius: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: !useLaser ? 'linear-gradient(to right, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.5)',
            color: 'white',
            transition: 'all 0.3s'
          }}
        >
          🔦 Flashlight (Incoherent)
        </button>
      </div>

      {/* Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>Laser</h4>
          <ul style={{ color: '#cbd5e1', fontSize: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li>Fixed phase relationship</li>
            <li>Single wavelength</li>
            <li>Stable interference</li>
            <li>Strong speckle</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <h4 style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '8px' }}>Flashlight</h4>
          <ul style={{ color: '#cbd5e1', fontSize: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li>Random phases</li>
            <li>Many wavelengths</li>
            <li>Interference averages out</li>
            <li>No visible speckle</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>Key Discovery</h2>

      <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 197, 94, 0.1))', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>
          Speckle is a Signature of Coherence
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>💚</div>
            <div>
              <p style={{ color: '#22c55e', fontWeight: 600 }}>Coherent Light (Laser)</p>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Fixed phases → stable interference → visible speckle</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>🔦</div>
            <div>
              <p style={{ color: '#fbbf24', fontWeight: 600 }}>Incoherent Light (Flashlight)</p>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Random phases → interference averages out → smooth light</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '12px' }}>Why This Matters</h4>
        <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
          Speckle can be a nuisance (noise in laser imaging) or a tool (measuring blood flow, surface roughness). Understanding its origin from coherence helps us both reduce it when unwanted and exploit it for sensing applications.
        </p>
      </div>

    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Real-World Applications</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Speckle has surprising uses beyond the lab</p>

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
                ? `linear-gradient(to right, ${app.color.split(' ')[0].replace('from-', '#').replace('-600', '')})`
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px' }}>{stat.value}</div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #22c55e, #16a34a)', color: 'white', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
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
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: testAnswers[qIndex] === oIndex ? 'rgba(34, 197, 94, 0.3)' : 'rgba(51, 65, 85, 0.5)',
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
              background: testAnswers.includes(null) ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(to right, #22c55e, #16a34a)',
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
              {testScore >= 8 ? 'Excellent! You understand laser speckle!' : 'Keep learning! Review the concepts and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={q.id} style={{ padding: '16px', borderRadius: '12px', background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: '14px' }}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${q.options.find(o => o.correct)?.text}`}
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
      <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))', borderRadius: '24px', padding: '32px', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>💚</div>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Speckle Master!</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '24px' }}>
          You've mastered the physics of laser speckle and coherent wave interference!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔬</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Coherent</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Interference</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Random Phase</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Speckle Pattern</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🩸</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Blood Flow</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Imaging</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Fiber Optic</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Sensing</p>
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
          background: canProceed ? '#22c55e' : 'rgba(255,255,255,0.1)',
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

  // HOOK PHASE
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

  // PREDICT PHASE
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

  // PLAY PHASE
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

  // REVIEW PHASE
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

  // TWIST PREDICT PHASE
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

  // TWIST PLAY PHASE
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

  // TWIST REVIEW PHASE
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

  // TRANSFER PHASE
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

  // TEST PHASE
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

  // MASTERY PHASE
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

export default LaserSpeckleRenderer;
