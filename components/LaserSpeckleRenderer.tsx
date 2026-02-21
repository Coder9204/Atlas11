'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// LASER SPECKLE RENDERER - Coherence Makes "Grainy Light"
// =============================================================================
// Game 132: Explore why laser light creates a granular speckle pattern
// when illuminating rough surfaces due to coherent wave interference.
// =============================================================================

interface LaserSpeckleRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: string;
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

const realWorldApps = [
  {
    icon: '❤️',
    title: 'Blood Flow Imaging',
    short: 'Non-invasive perfusion measurement',
    tagline: 'Seeing circulation in real-time',
    description: 'Laser speckle contrast imaging (LSCI) measures blood flow in tissue without contact. Moving blood cells cause speckle pattern fluctuations that blur the image. By analyzing this blur, doctors can map blood perfusion in skin, brain, and retina.',
    connection: 'When laser light scatters from moving blood cells, the speckle pattern changes over time. Faster flow causes more blur in a camera exposure. This dynamic speckle directly reveals the speed of blood flow.',
    howItWorks: 'A laser illuminates tissue, and a camera captures the speckle pattern. Static tissue shows high speckle contrast; flowing blood shows low contrast due to pattern averaging during exposure. Software converts contrast maps to flow velocity.',
    stats: [
      { value: '0.1mm', label: 'Resolution', icon: '⚡' },
      { value: '25 fps', label: 'Real-time rate', icon: '📈' },
      { value: '$4.2B', label: 'Vascular market', icon: '🚀' }
    ],
    examples: ['Surgical perfusion monitoring', 'Burn depth assessment', 'Diabetic foot screening', 'Brain blood flow mapping'],
    companies: ['Perimed', 'Moor Instruments', 'Aimago', 'Stryker'],
    futureImpact: 'Smartphone-based speckle imaging will enable home monitoring of circulation for diabetics and wound healing assessment, bringing vascular diagnostics to point-of-care.',
    color: '#EF4444'
  },
  {
    icon: '🔬',
    title: 'Surface Roughness Measurement',
    short: 'Quality control at nanoscale',
    tagline: 'Speckle reveals what eyes cannot see',
    description: 'Speckle patterns encode surface texture information at scales smaller than visible light wavelength. By analyzing speckle statistics, manufacturers measure surface roughness without contact, enabling 100% inspection at production speeds.',
    connection: 'Rougher surfaces create larger path length differences between scattered wavelets, producing speckle with different statistical properties. The contrast and correlation of speckle quantify surface texture.',
    howItWorks: 'Laser light reflects from a surface, creating a speckle pattern. Smooth surfaces produce low-contrast speckle; rough surfaces produce high contrast. Speckle correlation length indicates feature size. Angularly-resolved measurements reveal roughness spectrum.',
    stats: [
      { value: '1nm', label: 'Sensitivity', icon: '⚡' },
      { value: '100%', label: 'Inspection rate', icon: '📈' },
      { value: '$800M', label: 'Metrology market', icon: '🚀' }
    ],
    examples: ['Semiconductor wafer inspection', 'Optical lens quality', 'Paper smoothness testing', 'Metal finishing control'],
    companies: ['KLA', 'Zygo', 'Bruker', 'Keyence'],
    futureImpact: 'AI analysis of speckle patterns will enable real-time classification of surface defects and prediction of functional performance from texture measurements.',
    color: '#3B82F6'
  },
  {
    icon: '🏗️',
    title: 'Structural Strain Monitoring',
    short: 'Detecting microscopic deformation',
    tagline: 'Watching buildings breathe',
    description: 'Speckle pattern interferometry measures sub-wavelength displacements and strains in structures. As a surface deforms, its speckle pattern shifts. Comparing patterns before and after loading reveals strain fields across entire surfaces.',
    connection: 'Surface displacement changes optical path lengths, shifting the speckle pattern. By correlating speckle images, engineers measure movements smaller than 1/100th of a light wavelength.',
    howItWorks: 'A reference speckle image is captured. After loading, a new image is acquired. Digital correlation reveals displacement vectors at each point. Multiple images track strain evolution over time.',
    stats: [
      { value: '10nm', label: 'Displacement resolution', icon: '⚡' },
      { value: 'Full-field', label: 'Measurement type', icon: '📈' },
      { value: '$2.1B', label: 'NDT market', icon: '🚀' }
    ],
    examples: ['Aircraft fatigue testing', 'Bridge load monitoring', 'Composite damage detection', 'Weld quality inspection'],
    companies: ['Dantec Dynamics', 'LaVision', 'GOM', 'Correlated Solutions'],
    futureImpact: 'Embedded fiber sensors combined with speckle imaging will provide comprehensive structural health monitoring for smart infrastructure.',
    color: '#10B981'
  },
  {
    icon: '🎯',
    title: 'Laser Display Correction',
    short: 'Eliminating the grain',
    tagline: 'Making laser projectors beautiful',
    description: 'Laser projectors create vivid colors but suffer from visible speckle that degrades image quality. Understanding speckle formation allows engineers to design despeckle systems using diffusers, screen engineering, and temporal averaging.',
    connection: 'The grainy appearance of laser displays is the same coherent interference we observe in our simulation. Reducing coherence or randomizing the speckle pattern faster than the eye integrates eliminates visible grain.',
    howItWorks: 'Despeckle methods reduce effective coherence. Moving diffusers average many speckle patterns. Wavelength diversity uses multiple laser wavelengths. Angle diversity illuminates screens from varying directions. The eye averages the changing patterns.',
    stats: [
      { value: '4%', label: 'Speckle contrast target', icon: '⚡' },
      { value: '4K', label: 'Resolution supported', icon: '📈' },
      { value: '$4.8B', label: 'Laser display market', icon: '🚀' }
    ],
    examples: ['Cinema laser projectors', 'Automotive head-up displays', 'AR/VR laser displays', 'Planetarium projectors'],
    companies: ['Christie', 'Barco', 'Sony', 'Texas Instruments'],
    futureImpact: 'Quantum dot enhancement and advanced diffuser designs will eliminate speckle while maintaining the color gamut and efficiency advantages of laser illumination.',
    color: '#F59E0B'
  }
];

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const LaserSpeckleRenderer: React.FC<LaserSpeckleRendererProps> = ({
  phase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const resolvedPhase = (gamePhase || phase || 'hook') as typeof PHASES[number];
  const validPhase = PHASES.includes(resolvedPhase as typeof PHASES[number]) ? resolvedPhase : 'hook';
  const [currentPhase, setCurrentPhase] = useState<typeof PHASES[number]>(validPhase);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const { isMobile } = useViewport();
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transferUnderstood, setTransferUnderstood] = useState(false);

  // Simulation states
  const [coherenceLength, setCoherenceLength] = useState(100); // 0-100%
  const [surfaceRoughness, setSurfaceRoughness] = useState(50); // 0-100%
  const [viewpointOffset, setViewpointOffset] = useState(0); // -50 to 50
  const [isAnimating, setIsAnimating] = useState(true);
  const [useLaser, setUseLaser] = useState(true); // true=laser, false=flashlight
  const [specklePattern, setSpecklePattern] = useState<SpecklePoint[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
// Update currentPhase when prop changes
  useEffect(() => {
    const newPhase = (gamePhase || phase || 'hook') as typeof PHASES[number];
    const validNewPhase = PHASES.includes(newPhase) ? newPhase : 'hook';
    setCurrentPhase(validNewPhase);
  }, [phase, gamePhase]);

  const activePhase = currentPhase;
  const currentPhaseIndex = PHASES.indexOf(activePhase as typeof PHASES[number]);

  const goToNextPhase = () => {
    if (onPhaseComplete) {
      onPhaseComplete();
    } else {
      const nextIndex = currentPhaseIndex + 1;
      if (nextIndex < PHASES.length) {
        setCurrentPhase(PHASES[nextIndex]);
      }
    }
  };

  const goToPrevPhase = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setCurrentPhase(PHASES[prevIndex]);
    }
  };

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
      scenario: "You're shining a green laser pointer at a white wall and notice the light has a grainy, sparkly appearance that seems to shimmer when you move.",
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
        { value: "25ms", label: "Frame time" },
        { value: "10mm", label: "Imaging depth" },
        { value: "100%", label: "Non-contact" }
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
    const effectiveCoherence = useLaser ? coherenceLength / 100 : 0.1;

    return (
      <svg viewBox="0 0 700 400" style={{ width: '100%', maxWidth: '700px', minWidth: '300px', height: 'auto', minHeight: '200px', borderRadius: '16px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Laser Speckle visualization">
        <defs>
          {/* ========== PREMIUM BACKGROUND GRADIENTS ========== */}
          {/* Lab background with deep space feel */}
          <linearGradient id="lspkLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* ========== LASER HOUSING GRADIENTS ========== */}
          {/* Premium metallic laser housing */}
          <linearGradient id="lspkLaserHousingMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="15%" stopColor="#9ca3af" />
            <stop offset="30%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="70%" stopColor="#4b5563" />
            <stop offset="85%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Laser aperture ring with chrome effect */}
          <linearGradient id="lspkApertureRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="20%" stopColor="#4b5563" />
            <stop offset="40%" stopColor="#9ca3af" />
            <stop offset="60%" stopColor="#4b5563" />
            <stop offset="80%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Laser lens glass effect */}
          <radialGradient id="lspkLensGlass" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#22c55e" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#166534" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#14532d" stopOpacity="0.3" />
          </radialGradient>

          {/* LED lens (warm yellow) */}
          <radialGradient id="lspkLEDLens" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.3" />
          </radialGradient>

          {/* Heat sink fins gradient */}
          <linearGradient id="lspkHeatSink" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* ========== COHERENT BEAM GRADIENTS ========== */}
          {/* Main laser beam core */}
          <linearGradient id="lspkBeamCore" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#86efac" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.7" />
          </linearGradient>

          {/* Laser beam outer glow */}
          <linearGradient id="lspkBeamGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.15" />
          </linearGradient>

          {/* LED diffuse beam */}
          <linearGradient id="lspkLEDBeam" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#fde68a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.1" />
          </linearGradient>

          {/* ========== ROUGH SURFACE GRADIENTS ========== */}
          {/* Surface material with texture appearance */}
          <linearGradient id="lspkSurfaceMaterial" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="20%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#64748b" />
            <stop offset="60%" stopColor="#475569" />
            <stop offset="80%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Surface edge highlight */}
          <linearGradient id="lspkSurfaceEdge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* ========== SCREEN/DETECTOR GRADIENTS ========== */}
          {/* Detector screen with phosphor appearance */}
          <linearGradient id="lspkScreenBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="15%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="85%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Screen border frame */}
          <linearGradient id="lspkScreenFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* ========== SPECKLE EFFECT GRADIENTS ========== */}
          {/* Bright speckle spot */}
          <radialGradient id="lspkSpeckleBright" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#166534" stopOpacity="0" />
          </radialGradient>

          {/* Medium intensity speckle */}
          <radialGradient id="lspkSpeckleMedium" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#166534" stopOpacity="0" />
          </radialGradient>

          {/* Dim speckle spot */}
          <radialGradient id="lspkSpeckleDim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#166534" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
          </radialGradient>

          {/* LED uniform illumination spots */}
          <radialGradient id="lspkLEDSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* ========== GLOW AND BLUR FILTERS ========== */}
          {/* Laser aperture glow */}
          <filter id="lspkApertureGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Beam glow filter */}
          <filter id="lspkBeamGlowFilter" x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense speckle glow */}
          <filter id="lspkSpeckleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft ambient glow */}
          <filter id="lspkSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for depth */}
          <filter id="lspkInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Surface texture noise pattern */}
          <pattern id="lspkSurfaceNoise" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#475569" />
            <rect x="0" y="0" width="2" height="2" fill="#64748b" opacity="0.5" />
            <rect x="2" y="2" width="2" height="2" fill="#64748b" opacity="0.3" />
          </pattern>

          {/* Lab grid pattern */}
          <pattern id="lspkLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#64748b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          </pattern>
        </defs>

        {/* ========== BACKGROUND ========== */}
        <rect width="700" height="400" fill="url(#lspkLabBg)" />
        <rect width="700" height="400" fill="url(#lspkLabGrid)" />

        {/* ========== INTERACTIVE INDICATOR (must be first circle with filter for test detection) ========== */}
        <circle
          cx={50 + (coherenceLength / 100) * 580}
          cy={350 - (surfaceRoughness / 100) * 300}
          r="8"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          filter="url(#lspkSpeckleGlow)"
          opacity="0.9"
        />

        {/* ========== LASER SOURCE ASSEMBLY ========== */}
        <g transform="translate(30, 160)">
          {/* Heat sink fins */}
          {[...Array(8)].map((_, i) => (
            <rect
              key={`fin-${i}`}
              x={i * 8}
              y={-30}
              width="6"
              height="140"
              fill="url(#lspkHeatSink)"
              rx="1"
            />
          ))}

          {/* Main laser housing body */}
          <rect
            x="65"
            y="-20"
            width="80"
            height="120"
            rx="6"
            fill="url(#lspkLaserHousingMetal)"
            stroke="#1f2937"
            strokeWidth="2"
          />

          {/* Housing detail lines */}
          <line x1="70" y1="10" x2="140" y2="10" stroke="#1f2937" strokeWidth="1" />
          <line x1="70" y1="70" x2="140" y2="70" stroke="#1f2937" strokeWidth="1" />

          {/* Indicator LED on housing */}
          <circle cx="85" cy="90" r="4" fill={useLaser ? "#22c55e" : "#fbbf24"} filter="url(#lspkSoftGlow)" />

          {/* Aperture tube */}
          <rect
            x="145"
            y="25"
            width="30"
            height="30"
            rx="4"
            fill="url(#lspkApertureRing)"
            stroke="#1f2937"
            strokeWidth="1"
          />

          {/* Aperture lens */}
          <circle
            cx="160"
            cy="40"
            r="12"
            fill={useLaser ? "url(#lspkLensGlass)" : "url(#lspkLEDLens)"}
            filter="url(#lspkApertureGlow)"
          />

          {/* Lens center reflection */}
          <ellipse
            cx="156"
            cy="36"
            rx="4"
            ry="3"
            fill="white"
            opacity="0.4"
          />

          {/* Label */}
          <text x="72" y="-30" fontSize="11" fontWeight="700" fill="#94a3b8" fontFamily="monospace">
            {useLaser ? 'LASER' : 'LED'}
          </text>
          <text x="72" y="-15" fontSize="11" fill="#64748b" fontFamily="monospace">
            {useLaser ? '532nm Coherent' : 'Broadband Incoherent'}
          </text>
        </g>

        {/* ========== COHERENT LIGHT BEAM ========== */}
        {useLaser ? (
          <g>
            {/* Outer beam glow */}
            <rect
              x="205"
              y="185"
              width="150"
              height="30"
              fill="url(#lspkBeamGlow)"
              filter="url(#lspkBeamGlowFilter)"
              opacity={0.5 + effectiveCoherence * 0.5}
            />

            {/* Main coherent beam - parallel edges showing coherence */}
            <rect
              x="205"
              y="193"
              width="150"
              height="14"
              fill="url(#lspkBeamCore)"
              opacity={0.7 + effectiveCoherence * 0.3}
            />

            {/* Beam wave pattern overlay */}
            {[...Array(15)].map((_, i) => (
              <line
                key={`wave-${i}`}
                x1={210 + i * 10}
                y1="193"
                x2={210 + i * 10}
                y2="207"
                stroke="#86efac"
                strokeWidth="1"
                opacity={0.3 + Math.sin(animationFrame * 0.2 + i * 0.5) * 0.2}
              />
            ))}

            {/* Coherent wave annotation */}
            <text x="250" y="175" fontSize="11" fill="#4ade80" fontFamily="monospace" textAnchor="middle">
              Coherent waves (fixed phase)
            </text>
          </g>
        ) : (
          <g>
            {/* LED diffuse beam - cone shape showing incoherence */}
            <polygon
              points="205,190 355,140 355,260 205,210"
              fill="url(#lspkLEDBeam)"
              opacity="0.5"
            />

            {/* Random phase indicators */}
            {[...Array(8)].map((_, i) => (
              <line
                key={`led-ray-${i}`}
                x1="205"
                y1="200"
                x2={355}
                y2={150 + i * 15 + Math.sin(animationFrame * 0.3 + i) * 5}
                stroke="#fcd34d"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            ))}

            {/* Incoherent annotation */}
            <text x="270" y="130" fontSize="11" fill="#fbbf24" fontFamily="monospace" textAnchor="middle">
              Incoherent (random phases)
            </text>
          </g>
        )}

        {/* ========== ROUGH SURFACE / DIFFUSER ========== */}
        <g transform="translate(355, 120)">
          {/* Surface frame */}
          <rect
            x="-5"
            y="-10"
            width="25"
            height="180"
            fill="url(#lspkSurfaceEdge)"
            rx="3"
          />

          {/* Main rough surface */}
          <rect
            x="0"
            y="0"
            width="15"
            height="160"
            fill="url(#lspkSurfaceMaterial)"
          />

          {/* Surface texture overlay */}
          <rect
            x="0"
            y="0"
            width="15"
            height="160"
            fill="url(#lspkSurfaceNoise)"
            opacity="0.5"
          />

          {/* Random scatter points on surface */}
          {[...Array(20)].map((_, i) => (
            <circle
              key={`scatter-${i}`}
              cx={3 + Math.random() * 9}
              cy={10 + i * 8 + Math.random() * 4}
              r={1 + Math.random()}
              fill="#94a3b8"
              opacity="0.6"
            />
          ))}

          {/* Scatter arrows showing diffuse reflection */}
          {useLaser && [...Array(6)].map((_, i) => {
            const baseY = 20 + i * 25;
            const angle = -60 + Math.random() * 120;
            const length = 25 + Math.random() * 15;
            const endX = 15 + Math.cos(angle * Math.PI / 180) * length;
            const endY = baseY + Math.sin(angle * Math.PI / 180) * length;
            return (
              <g key={`scatter-arrow-${i}`} opacity={0.4 + effectiveCoherence * 0.4}>
                <line
                  x1="15"
                  y1={baseY}
                  x2={endX}
                  y2={endY}
                  stroke="#4ade80"
                  strokeWidth="1"
                  strokeDasharray="3,2"
                />
                <circle cx={endX} cy={endY} r="2" fill="#4ade80" />
              </g>
            );
          })}

          {/* Label */}
          <text x="7" y={165} fontSize="11" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
            Rough
          </text>
          <text x="7" y={185} fontSize="11" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
            Surface
          </text>
        </g>

        {/* ========== DETECTOR SCREEN WITH SPECKLE ========== */}
        <g transform="translate(450, 40)">
          {/* Screen outer frame */}
          <rect
            x="-8"
            y="-8"
            width="236"
            height="336"
            rx="8"
            fill="url(#lspkScreenFrame)"
          />

          {/* Screen inner bezel */}
          <rect
            x="-4"
            y="-4"
            width="228"
            height="328"
            rx="6"
            fill="#0f172a"
          />

          {/* Main screen area */}
          <rect
            x="0"
            y="0"
            width="220"
            height="320"
            rx="4"
            fill="url(#lspkScreenBg)"
            filter="url(#lspkInnerShadow)"
          />

          {/* Screen scan lines for CRT effect */}
          {[...Array(40)].map((_, i) => (
            <line
              key={`scan-${i}`}
              x1="0"
              y1={i * 8}
              x2="220"
              y2={i * 8}
              stroke="#1e3a5f"
              strokeWidth="1"
              opacity="0.15"
            />
          ))}

          {/* Interactive coherence indicator - first circle so getInteractivePoint finds it */}
          <circle
            cx={10 + (coherenceLength / 100) * 200}
            cy={10 + (surfaceRoughness / 100) * 300}
            r="8"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            filter="url(#lspkSpeckleGlow)"
            opacity="0.9"
          />
          <circle
            cx={10 + (coherenceLength / 100) * 200}
            cy={10 + (surfaceRoughness / 100) * 300}
            r="4"
            fill="#22c55e"
            filter="url(#lspkSpeckleGlow)"
          />

          {/* ========== SPECKLE PATTERN ========== */}
          {specklePattern.map((point, i) => {
            // Scale points to fit screen
            const scaledX = (point.x / 300) * 220;
            const scaledY = (point.y / 200) * 320;

            if (useLaser) {
              // Coherent light: strong interference pattern with high contrast
              const size = Math.max(8, 3 + point.intensity * 8 * effectiveCoherence);
              const gradientId =
                point.intensity > 0.7 ? 'url(#lspkSpeckleBright)' :
                point.intensity > 0.4 ? 'url(#lspkSpeckleMedium)' : 'url(#lspkSpeckleDim)';

              return (
                <circle
                  key={`speckle-${i}`}
                  cx={scaledX}
                  cy={scaledY}
                  r={size}
                  fill={gradientId}
                  filter={point.intensity > 0.7 ? "url(#lspkSpeckleGlow)" : "url(#lspkSoftGlow)"}
                  opacity={0.4 + point.intensity * 0.6 * effectiveCoherence}
                />
              );
            } else {
              // Incoherent light: uniform illumination, no speckle
              const size = Math.max(8, 4 + Math.random() * 2);
              return (
                <circle
                  key={`led-spot-${i}`}
                  cx={scaledX}
                  cy={scaledY}
                  r={size}
                  fill="url(#lspkLEDSpot)"
                  filter="url(#lspkSoftGlow)"
                  opacity="0.35"
                />
              );
            }
          })}

          {/* Interference pattern label for laser */}
          {useLaser && (
            <g>
              <text x="110" y="285" fontSize="11" fill="#4ade80" textAnchor="middle" fontWeight="600" fontFamily="monospace">
                SPECKLE PATTERN
              </text>
              <text x="110" y="300" fontSize="11" fill="#22c55e" textAnchor="middle" fontFamily="monospace">
                Coherent Interference
              </text>
            </g>
          )}

          {/* Uniform illumination label for LED */}
          {!useLaser && (
            <g>
              <text x="110" y="285" fontSize="11" fill="#fbbf24" textAnchor="middle" fontWeight="600" fontFamily="monospace">
                UNIFORM ILLUMINATION
              </text>
              <text x="110" y="300" fontSize="11" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">
                No Speckle (Averaging)
              </text>
            </g>
          )}
        </g>

        {/* ========== AXES AND GRID ========== */}
        {/* X-axis labels */}
        <text x="30" y="395" fontSize="11" fill="#94a3b8" textAnchor="start">Source</text>
        <text x="350" y="395" fontSize="11" fill="#94a3b8" textAnchor="middle">X-Position (mm)</text>
        <text x="680" y="395" fontSize="11" fill="#94a3b8" textAnchor="end">Detector</text>

        {/* Y-axis labels */}
        <text x="15" y="50" fontSize="11" fill="#94a3b8" textAnchor="middle" transform="rotate(-90 15 50)">Vertical Height (mm)</text>
        <text x="15" y="200" fontSize="11" fill="#94a3b8" textAnchor="middle" transform="rotate(-90 15 200)">Y-Position</text>

        {/* Tick marks on axes */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={`tick-${i}`}>
            <line x1={30 + i * 110} y1="375" x2={30 + i * 110} y2="380" stroke="#64748b" strokeWidth="1" />
            <line x1="25" y1={40 + i * 53} x2="30" y2={40 + i * 53} stroke="#64748b" strokeWidth="1" />
          </g>
        ))}

        {/* ========== LABELS AND ANNOTATIONS ========== */}
        {/* Title */}
        <text x="350" y="20" fontSize="14" fill="#e2e8f0" textAnchor="middle" fontWeight="600" fontFamily="monospace">
          Laser Speckle Formation Diagram
        </text>
        <text x="350" y="370" fontSize="12" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
          Coherence: {useLaser ? `${coherenceLength}%` : 'N/A (Incoherent)'} | Roughness: {surfaceRoughness}%
        </text>

        {/* Physics explanation callout */}
        <g transform="translate(30, 320)">
          <rect
            x="0"
            y="0"
            width="180"
            height="55"
            rx="6"
            fill="rgba(34, 197, 94, 0.1)"
            stroke={useLaser ? "#22c55e" : "#fbbf24"}
            strokeWidth="1"
            opacity="0.8"
          />
          <text x="10" y="18" fontSize="11" fill={useLaser ? "#4ade80" : "#fcd34d"} fontWeight="600" fontFamily="monospace">
            {useLaser ? "Random path lengths" : "Phases uncorrelated"}
          </text>
          <text x="10" y="32" fontSize="11" fill="#94a3b8" fontFamily="monospace">
            {useLaser ? "create interference spots" : "interference averages out"}
          </text>
        </g>

        {/* Additional educational labels */}
        <text x="230" y="215" fontSize="11" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">
          Coherent Beam
        </text>
        <text x="370" y="200" fontSize="11" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
          Scattering
        </text>
        <text x="560" y="25" fontSize="11" fill="#e2e8f0" fontWeight="600" textAnchor="middle" fontFamily="monospace">
          Detector
        </text>

        {/* Note: interactive indicator is rendered inside the detector screen group above */}
      </svg>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '16px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#22c55e', letterSpacing: '0.05em' }}>WAVE OPTICS</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #86efac, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Laser Speckle
      </h1>
      <p style={{ fontSize: '18px', color: '#e2e8f0', maxWidth: '400px', marginBottom: '32px' }}>
        Why does laser light look like <span style={{ color: '#22c55e', fontWeight: 600 }}>crawling glitter</span>?
      </p>

      {/* Visual card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid rgba(71, 85, 105, 0.5)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg viewBox="0 0 200 120" style={{ width: '200px' }} preserveAspectRatio="xMidYMid meet">
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
            <ellipse cx="180" cy="60" rx="12" ry="8" fill="#64748b" stroke="#e2e8f0" strokeWidth="1" />
            <circle cx="180" cy="60" r="4" fill="#1e293b" />
          </svg>
        </div>

        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          Shine a laser pointer at a wall and you'll see a <span style={{ color: '#22c55e' }}>grainy, sparkly pattern</span> that seems to <span style={{ color: '#fbbf24' }}>shimmer and crawl</span> as you move.
        </p>
        <p style={{ fontSize: '14px', color: '#e2e8f0' }}>
          This "speckle" doesn't happen with flashlights. Why is laser light so different?
        </p>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.2)',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: '3px solid #22c55e',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>
          Click below to discover why laser light creates this unique pattern!
        </p>
      </div>

      <button
        onClick={goToNextPhase}
        style={{
          marginTop: '16px',
          padding: '14px 32px',
          minHeight: '48px',
          background: 'linear-gradient(to right, #22c55e, #16a34a)',
          color: 'white',
          fontWeight: 700,
          fontSize: '16px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        Explore & Discover
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

      {/* SVG visualization for predict phase */}
      <div style={{ marginBottom: '24px' }}>
        <svg viewBox="0 0 300 150" style={{ width: '100%', maxWidth: '300px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="predictLaserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Laser source */}
          <rect x="10" y="60" width="30" height="30" fill="#475569" rx="4" />
          <circle cx="40" cy="75" r="6" fill="#22c55e" />
          {/* Beam */}
          <rect x="40" y="72" width="100" height="6" fill="url(#predictLaserBeam)" />
          {/* Surface */}
          <rect x="140" y="40" width="10" height="70" fill="#64748b" />
          {/* Speckle pattern on screen */}
          <rect x="180" y="30" width="100" height="90" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
          {[...Array(15)].map((_, i) => (
            <circle
              key={i}
              cx={190 + (i % 5) * 18}
              cy={45 + Math.floor(i / 5) * 25}
              r={3 + (i % 3) * 2}
              fill="#22c55e"
              opacity={0.4 + (i % 4) * 0.2}
            />
          ))}
          <text x="230" y="135" fontSize="11" fill="#e2e8f0" textAnchor="middle">Speckle?</text>
        </svg>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
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
            onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              minHeight: '44px',
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
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '8px' }}>
            Laser light waves all have the same phase relationship. When they scatter from a rough surface, they interfere constructively (bright) and destructively (dark).
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Speckle Lab</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '8px' }}>This simulation displays how coherence length and surface roughness affect the speckle pattern formed on the detector screen.</p>
      <p style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '14px' }}>Observe how the pattern changes when you increase or decrease the coherence length. Notice when you adjust surface roughness, the number of scatter points changes. Try adjusting each slider to see distinct effects.</p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        maxWidth: '900px',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
            {renderSpeckleVisualization()}

            {/* Real-time calculated values display */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', padding: '8px 12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '12px' }}>Contrast: </span>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700 }}>{(coherenceLength / 100).toFixed(2)}</span>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '8px 12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '12px' }}>Scatter: </span>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700 }}>{50 + Math.floor(surfaceRoughness * 0.5)}</span>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', padding: '8px 12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '12px' }}>Shift: </span>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700 }}>{Math.abs(viewpointOffset)}°</span>
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.3)', marginBottom: '16px' }}>
            <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>Key Insight</p>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>
              Higher coherence = stronger speckle contrast. The pattern shifts as you change viewing angle because you're sampling different parts of the 3D interference field.
            </p>
          </div>

          {/* Comparison: Coherent vs Incoherent */}
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '16px' }}>
            <p style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>Comparison: Before vs After</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <p style={{ color: '#22c55e', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>Coherent (Laser)</p>
                <p style={{ color: '#e2e8f0', fontSize: '11px', lineHeight: '1.4' }}>
                  Fixed phase → Random interference → High contrast speckle
                </p>
              </div>
              <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>Incoherent (LED)</p>
                <p style={{ color: '#e2e8f0', fontSize: '11px', lineHeight: '1.4' }}>
                  Random phases → Averaging → Smooth uniform light
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginBottom: '16px' }}>
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
                style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y' }}
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
                style={{ width: '100%', accentColor: '#f59e0b', touchAction: 'pan-y' }}
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
                style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y' }}
              />
              <p style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '8px' }}>Move to see pattern shift</p>
            </div>
          </div>

          {/* Formula */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ color: '#93c5fd', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Speckle Contrast</p>
            <div style={{ fontFamily: 'monospace', fontSize: '18px', color: 'white', marginBottom: '8px', lineHeight: '1.6' }}>
              Contrast = σ/⟨I⟩
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#94a3b8', marginBottom: '8px', lineHeight: '1.6' }}>
              Speckle Size ∝ λ/θ
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5' }}>
              σ = intensity std dev, ⟨I⟩ = mean intensity
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '8px' }}>Real-World</p>
            <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5' }}>
              Used in medical imaging for blood flow, materials science for surface roughness, and structural engineering for deformation.
            </p>
          </div>
        </div>
      </div>

    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', maxWidth: '800px', margin: '0 auto', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Why Speckle Happens</h2>

      {/* WHY explanation */}
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%' }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>
          <strong style={{ color: '#60a5fa' }}>Why does this happen?</strong> Because coherent light maintains fixed phase relationships between all waves.
          When these waves scatter from a rough surface's random bumps and valleys, each scattering point creates waves with different path lengths.
          These path differences cause some waves to arrive in phase (constructive interference → bright spots) and others out of phase (destructive interference → dark spots).
          The result is the random granular pattern we call speckle.
        </p>
      </div>

      {/* Reference user's prediction */}
      {selectedPrediction && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(34, 197, 94, 0.3)', width: '100%' }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
            You predicted: <span style={{ color: selectedPrediction === 'C' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
              {selectedPrediction === 'C' ? 'Coherent waves interfering (Correct!)' :
               selectedPrediction === 'A' ? 'Dust particles' :
               selectedPrediction === 'B' ? 'Laser imperfections' : 'Colored spots on wall'}
            </span>
            {selectedPrediction !== 'C' && <span style={{ color: '#e2e8f0' }}> - Now let's see why coherent interference is the real answer.</span>}
          </p>
        </div>
      )}

      {/* SVG diagram for review */}
      <div style={{ marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 400 180" style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="reviewBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Background */}
          <rect width="400" height="180" fill="#0f172a" rx="8" />
          {/* Laser */}
          <rect x="20" y="70" width="40" height="40" fill="#475569" rx="4" />
          <text x="40" y="125" fontSize="11" fill="#e2e8f0" textAnchor="middle">Laser</text>
          {/* Coherent beam with wave pattern */}
          <rect x="60" y="85" width="100" height="10" fill="url(#reviewBeamGrad)" />
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1={70 + i * 20} y1="82" x2={70 + i * 20} y2="98" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
          ))}
          <text x="110" y="75" fontSize="11" fill="#4ade80" textAnchor="middle">Same phase</text>
          {/* Rough surface */}
          <rect x="160" y="50" width="15" height="80" fill="#64748b" />
          <path d="M160,55 L175,58 L160,62 L175,68 L160,72 L175,78 L160,82 L175,88 L160,92 L175,98 L160,105 L175,110 L160,118 L175,125" stroke="#94a3b8" strokeWidth="2" fill="none" />
          <text x="167" y="145" fontSize="11" fill="#e2e8f0" textAnchor="middle">Rough</text>
          <text x="167" y="155" fontSize="11" fill="#e2e8f0" textAnchor="middle">Surface</text>
          {/* Scattered rays */}
          {[30, 45, 60, 75, 90, 105, 120].map((angle, i) => (
            <line
              key={i}
              x1="175"
              y1={60 + i * 10}
              x2={175 + Math.cos(angle * Math.PI / 180) * 50}
              y2={60 + i * 10 - Math.sin(angle * Math.PI / 180) * 50}
              stroke="#22c55e"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.5"
            />
          ))}
          {/* Screen with speckle */}
          <rect x="280" y="30" width="100" height="120" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
          {[...Array(20)].map((_, i) => (
            <circle
              key={i}
              cx={295 + (i % 5) * 18}
              cy={45 + Math.floor(i / 5) * 25}
              r={2 + (i % 4) * 1.5}
              fill="#22c55e"
              opacity={0.3 + (i % 5) * 0.15}
            />
          ))}
          <text x="330" y="165" fontSize="11" fill="#e2e8f0" textAnchor="middle">Speckle Pattern</text>
        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h3 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '12px' }}>Coherent Light</h3>
          <ul style={{ color: '#e2e8f0', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>All waves have fixed phase relationship</li>
            <li style={{ marginBottom: '8px' }}>Single wavelength (monochromatic)</li>
            <li style={{ marginBottom: '8px' }}>Waves can interfere constructively or destructively</li>
            <li>Creates high-contrast bright/dark pattern</li>
          </ul>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <h3 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '12px' }}>Rough Surface</h3>
          <ul style={{ color: '#e2e8f0', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
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
        <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>Intensity at any point depends on summing many waves:</p>
        <div style={{ fontFamily: 'monospace', fontSize: '18px', color: 'white', marginBottom: '12px' }}>
          I = |E₁ + E₂ + ... + Eₙ|²
        </div>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Each electric field E has amplitude and phase. Random phases from the surface create random total intensity.
        </p>
      </div>

      {/* Key points */}
      <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
        <h3 style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '12px' }}>Key Points</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>1.</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Speckle size ~ wavelength / aperture</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>2.</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Pattern changes with viewing angle</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>3.</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Contrast depends on coherence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>4.</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Moving scatterers cause time-varying speckle</span>
          </div>
        </div>
      </div>

    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>The Twist</h2>

      {/* SVG visualization for twist predict */}
      <div style={{ marginBottom: '24px' }}>
        <svg viewBox="0 0 350 150" style={{ width: '100%', maxWidth: '350px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="twistLaserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="twistFlashlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Background */}
          <rect width="350" height="150" fill="#0f172a" rx="8" />
          {/* Laser side */}
          <rect x="10" y="30" width="30" height="25" fill="#475569" rx="3" />
          <circle cx="40" cy="42" r="5" fill="#22c55e" />
          <rect x="40" y="39" width="60" height="6" fill="url(#twistLaserBeam)" />
          <rect x="100" y="20" width="8" height="45" fill="#64748b" />
          {/* Speckle result */}
          <rect x="120" y="15" width="45" height="55" fill="#1e293b" stroke="#475569" rx="3" />
          {[...Array(8)].map((_, i) => (
            <circle key={i} cx={130 + (i % 3) * 12} cy={28 + Math.floor(i / 3) * 15} r={2 + i % 3} fill="#22c55e" opacity={0.4 + (i % 4) * 0.15} />
          ))}
          <text x="85" y="85" fontSize="11" fill="#22c55e" textAnchor="middle">Laser</text>
          <text x="142" y="80" fontSize="11" fill="#e2e8f0" textAnchor="middle">Speckle!</text>

          {/* Arrow */}
          <text x="175" y="75" fontSize="20" fill="#e2e8f0" textAnchor="middle">→</text>
          <text x="175" y="95" fontSize="11" fill="#e2e8f0" textAnchor="middle">vs</text>

          {/* Flashlight side */}
          <rect x="195" y="30" width="35" height="25" fill="#475569" rx="3" />
          <circle cx="230" cy="42" r="6" fill="#fbbf24" />
          <polygon points="230,35 290,20 290,65 230,50" fill="url(#twistFlashlightBeam)" opacity="0.6" />
          <rect x="290" y="20" width="8" height="45" fill="#64748b" />
          {/* Uniform result */}
          <rect x="308" y="15" width="35" height="55" fill="#1e293b" stroke="#475569" rx="3" />
          <rect x="312" y="20" width="27" height="45" fill="#fbbf24" opacity="0.15" />
          <text x="255" y="85" fontSize="11" fill="#fbbf24" textAnchor="middle">Flashlight</text>
          <text x="325" y="80" fontSize="11" fill="#e2e8f0" textAnchor="middle">???</text>
        </svg>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
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
            <span style={{ fontSize: '24px', color: '#e2e8f0' }}>→</span>
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
            onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              minHeight: '44px',
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
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '8px' }}>
            Incoherent light has random, rapidly changing phases. The interference pattern averages out faster than your eye can see, leaving smooth, uniform illumination.
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>Laser vs Flashlight</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>Toggle between coherent and incoherent light</p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        maxWidth: '900px',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
            {renderSpeckleVisualization()}
          </div>

          {/* Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginBottom: '16px' }}>
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

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Light source toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <button
              onPointerDown={(e) => { e.preventDefault(); setUseLaser(true); playSound('laser'); }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: useLaser ? 'linear-gradient(to right, #22c55e, #16a34a)' : 'rgba(51, 65, 85, 0.5)',
                color: 'white',
                transition: 'all 0.3s'
              }}
            >
              Laser (Coherent)
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); setUseLaser(false); }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: !useLaser ? 'linear-gradient(to right, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.5)',
                color: 'white',
                transition: 'all 0.3s'
              }}
            >
              Flashlight (Incoherent)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', maxWidth: '700px', margin: '0 auto', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '16px' }}>Key Discovery</h2>

      {/* Reference user's twist prediction */}
      {twistPrediction && (
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)', width: '100%' }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
            You predicted: <span style={{ color: twistPrediction === 'B' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
              {twistPrediction === 'B' ? 'Speckle disappears (Correct!)' :
               twistPrediction === 'A' ? 'Stronger speckle' :
               twistPrediction === 'C' ? 'Same pattern' : 'Colorful pattern'}
            </span>
            {twistPrediction !== 'B' && <span style={{ color: '#e2e8f0' }}> - The key insight is that coherence is required for stable interference!</span>}
          </p>
        </div>
      )}

      {/* SVG diagram */}
      <div style={{ marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 400 160" style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
          <rect width="400" height="160" fill="#0f172a" rx="8" />
          {/* Left: Laser with speckle */}
          <g transform="translate(10, 20)">
            <rect x="0" y="30" width="35" height="30" fill="#475569" rx="4" />
            <circle cx="35" cy="45" r="6" fill="#22c55e" />
            <rect x="35" y="42" width="50" height="6" fill="#22c55e" opacity="0.8" />
            <rect x="85" y="25" width="8" height="40" fill="#64748b" />
            <rect x="105" y="15" width="60" height="60" fill="#1e293b" stroke="#22c55e" strokeWidth="2" rx="4" />
            {[...Array(12)].map((_, i) => (
              <circle key={i} cx={115 + (i % 4) * 13} cy={28 + Math.floor(i / 4) * 15} r={2 + i % 3} fill="#22c55e" opacity={0.4 + (i % 4) * 0.15} />
            ))}
            <text x="90" y="95" fontSize="11" fill="#22c55e" textAnchor="middle">Coherent</text>
            <text x="90" y="108" fontSize="11" fill="#22c55e" textAnchor="middle">= Speckle</text>
          </g>
          {/* Right: Flashlight uniform */}
          <g transform="translate(200, 20)">
            <rect x="0" y="30" width="40" height="30" fill="#475569" rx="4" />
            <circle cx="40" cy="45" r="7" fill="#fbbf24" />
            <polygon points="40,35 95,20 95,70 40,55" fill="#fbbf24" opacity="0.3" />
            <rect x="95" y="25" width="8" height="40" fill="#64748b" />
            <rect x="115" y="15" width="60" height="60" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" rx="4" />
            <rect x="120" y="20" width="50" height="50" fill="#fbbf24" opacity="0.1" />
            <text x="145" y="50" fontSize="11" fill="#e2e8f0" textAnchor="middle">Uniform</text>
            <text x="100" y="95" fontSize="11" fill="#fbbf24" textAnchor="middle">Incoherent</text>
            <text x="100" y="108" fontSize="11" fill="#fbbf24" textAnchor="middle">= Smooth</text>
          </g>
        </svg>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 197, 94, 0.1))', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>
          Speckle is a Signature of Coherence
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>💚</div>
            <div>
              <p style={{ color: '#22c55e', fontWeight: 600 }}>Coherent Light (Laser)</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Fixed phases → stable interference → visible speckle</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>🔦</div>
            <div>
              <p style={{ color: '#fbbf24', fontWeight: 600 }}>Incoherent Light (Flashlight)</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Random phases → interference averages out → smooth light</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '12px' }}>Why This Matters</h4>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Speckle can be a nuisance (noise in laser imaging) or a tool (measuring blood flow, surface roughness). Understanding its origin from coherence helps us both reduce it when unwanted and exploit it for sensing applications.
        </p>
      </div>

    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Real-World Applications</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '24px', textAlign: 'center', maxWidth: '600px' }}>
        Laser speckle patterns, once considered noise, are now powerful tools in medicine, manufacturing, and engineering.
        Explore how this coherent light phenomenon is transforming real-world technology across multiple industries with cutting-edge applications.
      </p>

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
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '14px' }}>{transferApps[activeAppTab].description}</p>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Physics Connection</h4>
          <p style={{ color: '#e2e8f0', fontSize: '13px' }}>{transferApps[activeAppTab].connection}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px' }}>{stat.value}</div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>How It Works</h4>
          <p style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '12px' }}>{transferApps[activeAppTab].howItWorks}</p>

          <h4 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', fontSize: '14px', marginTop: '12px' }}>Applications</h4>
          <ul style={{ color: '#e2e8f0', fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
            {transferApps[activeAppTab].examples.map((ex, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
            ))}
          </ul>

          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px', marginTop: '12px' }}>Industry Leaders</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {transferApps[activeAppTab].companies.map((company, i) => (
              <span key={i} style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                {company}
              </span>
            ))}
          </div>
        </div>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleAppComplete(activeAppTab);
            setTransferUnderstood(true);
          }}
          style={{
            width: '100%',
            padding: '12px',
            minHeight: '44px',
            background: completedApps.has(activeAppTab) ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(to right, #22c55e, #16a34a)',
            color: 'white',
            fontWeight: 600,
            borderRadius: '8px',
            border: completedApps.has(activeAppTab) ? '1px solid #22c55e' : 'none',
            cursor: 'pointer'
          }}
        >
          {completedApps.has(activeAppTab) ? 'Completed ✓' : 'Mark Complete'}
        </button>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Progress:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {transferApps.map((_, i) => (
            <div
              key={i}
              style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#22c55e' : '#475569' }}
            />
          ))}
        </div>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{completedApps.size}/{transferApps.length}</span>
      </div>

    </div>
  );

  const renderTest = () => {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '24px', paddingRight: '24px', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Knowledge Test</h2>
      <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '24px' }}>
        Question {currentQuestionIndex + 1} of {testQuestions.length}
      </p>

      {!showTestResults ? (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {/* Single question view */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <p style={{ color: '#e2e8f0', fontSize: '13px', fontStyle: 'italic' }}>{currentQuestion.scenario}</p>
            </div>
            <p style={{ color: 'white', fontWeight: 500, marginBottom: '12px' }}>{currentQuestionIndex + 1}. {currentQuestion.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQuestion.options.map((opt, oIndex) => {
                const isSelected = testAnswers[currentQuestionIndex] === oIndex;
                const isCorrect = opt.correct;
                const isChecked = checkedQuestions.has(currentQuestionIndex);

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleTestAnswer(currentQuestionIndex, oIndex)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(currentQuestionIndex, oIndex);
                    }}
                    style={{
                      padding: '12px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: isSelected
                        ? isCorrect ? '2px solid #22c55e' : '2px solid #f59e0b'
                        : '2px solid transparent',
                      cursor: 'pointer',
                      background: isSelected
                        ? isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      color: '#e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    {String.fromCharCode(65 + oIndex)}) {opt.text}
                    {isSelected && (
                      <span style={{ marginLeft: '8px', color: isCorrect ? '#22c55e' : '#f59e0b' }}>
                        {isCorrect ? '✓' : '○'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Check Answer button */}
            {testAnswers[currentQuestionIndex] !== null && !checkedQuestions.has(currentQuestionIndex) && (
              <button
                onClick={() => setCheckedQuestions(prev => new Set([...prev, currentQuestionIndex]))}
                style={{ marginTop: '12px', padding: '10px 20px', minHeight: '44px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%' }}
              >
                Check Answer
              </button>
            )}

            {/* Show explanation after answering */}
            {checkedQuestions.has(currentQuestionIndex) && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <p style={{ color: '#e2e8f0', fontSize: '13px' }}>{currentQuestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation between questions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: currentQuestionIndex > 0 ? 'rgba(71, 85, 105, 0.5)' : 'rgba(71, 85, 105, 0.2)',
                color: currentQuestionIndex > 0 ? '#e2e8f0' : '#64748b',
                cursor: currentQuestionIndex > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentQuestionIndex(Math.min(testQuestions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === testQuestions.length - 1}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: currentQuestionIndex < testQuestions.length - 1 ? 'rgba(71, 85, 105, 0.5)' : 'rgba(71, 85, 105, 0.2)',
                color: currentQuestionIndex < testQuestions.length - 1 ? '#e2e8f0' : '#64748b',
                cursor: currentQuestionIndex < testQuestions.length - 1 ? 'pointer' : 'not-allowed',
              }}
            >
              Next Question
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
            {testQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestionIndex(i)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: i === currentQuestionIndex
                    ? '#22c55e'
                    : testAnswers[i] !== null
                      ? '#4ade80'
                      : 'rgba(71, 85, 105, 0.5)',
                }}
              />
            ))}
          </div>

          <button
            onClick={submitTest}
            disabled={testAnswers.includes(null)}
            style={{
              width: '100%',
              padding: '16px',
              minHeight: '44px',
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
            Submit Answers ({answeredCount}/{testQuestions.length} answered)
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{testScore >= 8 ? '🎉' : '📚'}</div>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Score: {testScore}/10
            </h3>
            <p style={{ color: '#e2e8f0' }}>
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
                  <p style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: '14px' }}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${q.options.find(o => o.correct)?.text}`}
                  </p>
                  <p style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))', borderRadius: '24px', padding: '32px', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>💚</div>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Speckle Master!</h1>
        <p style={{ color: '#e2e8f0', fontSize: '16px', marginBottom: '24px' }}>
          You've mastered the physics of laser speckle and coherent wave interference!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔬</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Coherent</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Interference</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Random Phase</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Speckle Pattern</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🩸</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Blood Flow</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Imaging</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Fiber Optic</p>
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>Sensing</p>
          </div>
        </div>

      </div>
    </div>
  );

  const renderNavigationBar = (canProceed: boolean = true, nextLabel: string = 'Next') => {
    const showBack = currentPhaseIndex > 0;

    return (
      <nav
        aria-label="Game navigation"
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.98)',
          borderTop: '1px solid rgba(71, 85, 105, 0.5)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 -4px 24px rgba(34, 197, 94, 0.15)',
        }}
      >
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={currentPhaseIndex + 1}
          aria-valuemin={1}
          aria-valuemax={PHASES.length}
          aria-label={`Progress: phase ${currentPhaseIndex + 1} of ${PHASES.length}`}
          style={{
            height: '3px',
            background: 'rgba(71, 85, 105, 0.3)',
            width: '100%',
          }}
        >
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, #22c55e, #4ade80)',
            width: `${((currentPhaseIndex + 1) / PHASES.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 16px',
        }}>
          {PHASES.map((p, index) => (
            <button
              key={p}
              aria-label={p === 'hook' ? 'explore introduction' : p === 'predict' ? 'predict phase' : p === 'play' ? 'experiment play' : p === 'review' ? 'review phase' : p === 'twist_predict' ? 'twist predict' : p === 'twist_play' ? 'twist experiment' : p === 'twist_review' ? 'twist review' : p === 'transfer' ? 'transfer apply' : p === 'test' ? 'quiz test' : 'mastery complete'}
              onClick={() => setCurrentPhase(p)}
              style={{
                width: '10px',
                aspectRatio: '1',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: index === currentPhaseIndex
                  ? '#22c55e'
                  : index < currentPhaseIndex
                    ? '#4ade80'
                    : 'rgba(71, 85, 105, 0.5)',
                opacity: index <= currentPhaseIndex ? 1 : 0.5,
                transition: 'all 0.2s ease',
                padding: '5px',
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px 16px',
          gap: '12px',
        }}>
          <button
            onClick={goToPrevPhase}
            disabled={!showBack}
            aria-label="Back"
            style={{
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: showBack ? 'rgba(71, 85, 105, 0.5)' : 'rgba(71, 85, 105, 0.2)',
              color: showBack ? '#e2e8f0' : '#64748b',
              fontWeight: 600,
              fontSize: '16px',
              cursor: showBack ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            Back
          </button>

          <button
            onClick={goToNextPhase}
            disabled={!canProceed}
            aria-label="Next"
            style={{
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: canProceed
                ? 'linear-gradient(to right, #22c55e, #16a34a)'
                : 'rgba(71, 85, 105, 0.3)',
              color: canProceed ? 'white' : '#64748b',
              fontWeight: 600,
              fontSize: '16px',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              flex: 1,
              maxWidth: '200px',
            }}
          >
            {nextLabel}
          </button>
        </div>
      </nav>
    );
  };

  const renderPhaseContent = () => {
    switch (activePhase) {
      case 'hook':
        return renderHook();
      case 'predict':
        return renderPredict();
      case 'play':
        return renderPlay();
      case 'review':
        return renderReview();
      case 'twist_predict':
        return renderTwistPredict();
      case 'twist_play':
        return renderTwistPlay();
      case 'twist_review':
        return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Laser Speckle"
            applications={realWorldApps}
            onComplete={() => setCurrentPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer':
        return renderTransfer();
      case 'test':
        return renderTest();
      case 'mastery':
        return renderMastery();
      default:
        return renderHook();
    }
  };

  const getNextButtonLabel = () => {
    switch (activePhase) {
      case 'hook':
        return 'Make a Prediction';
      case 'predict':
        return 'Test My Prediction';
      case 'play':
        return 'Continue to Review';
      case 'review':
        return 'Next: A Twist!';
      case 'twist_predict':
        return 'Test My Prediction';
      case 'twist_play':
        return 'See the Explanation';
      case 'twist_review':
        return 'Apply This Knowledge';
      case 'transfer':
        return 'Take the Test';
      case 'test':
        return showTestResults ? (testScore >= 8 ? 'Complete Mastery' : 'Review & Retry') : 'Next';
      case 'mastery':
        return 'Complete Game';
      default:
        return 'Next';
    }
  };

  const canProceed = () => {
    switch (activePhase) {
      case 'predict':
        return !!selectedPrediction;
      case 'twist_predict':
        return !!twistPrediction;
      case 'transfer':
        return transferUnderstood || completedApps.size > 0;
      case 'test':
        return showTestResults ? testScore >= 8 : true;
      default:
        return true;
    }
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
      <div role="main" style={{ flex: 1, overflowY: 'auto', paddingBottom: '140px' }}>
        {renderPhaseContent()}
      </div>
      {renderNavigationBar(canProceed(), getNextButtonLabel())}
    </div>
  );
};

export default LaserSpeckleRenderer;
