'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// Real-world applications for magnetic field mapping
const realWorldApps = [
  {
    icon: '🧭',
    title: 'GPS-Free Navigation',
    short: 'Indoor positioning using magnetic maps',
    tagline: 'Navigate by Earth\'s magnetic fingerprint',
    description: 'Buildings distort Earth\'s magnetic field in unique patterns. By mapping these magnetic anomalies, smartphones can determine indoor position without GPS. Each location has a distinct magnetic fingerprint from steel beams, electrical wiring, and concrete rebar.',
    connection: 'Just as you mapped field lines with a compass probe, indoor navigation systems create magnetic field maps. The inverse cube law for field strength and compass alignment principles enable centimeter-accurate positioning.',
    howItWorks: 'Workers survey buildings with magnetometers, recording field vectors at known positions. Machine learning creates magnetic maps. Users\' phone magnetometers match readings to map locations for navigation.',
    stats: [
      { value: '1-3m', label: 'Indoor positioning accuracy', icon: '🎯' },
      { value: '$40B', label: 'Indoor location market', icon: '📈' },
      { value: '90%', label: 'Of time spent indoors', icon: '🏢' }
    ],
    examples: ['Airport wayfinding', 'Mall navigation', 'Warehouse logistics', 'Museum tours'],
    companies: ['IndoorAtlas', 'Apple', 'Google', 'Mappedin'],
    futureImpact: 'Combining magnetic positioning with AR glasses will enable seamless indoor-outdoor navigation without infrastructure costs.',
    color: '#3b82f6'
  },
  {
    icon: '🌍',
    title: 'Geophysical Exploration',
    short: 'Finding mineral deposits magnetically',
    tagline: 'Hidden treasure revealed by field anomalies',
    description: 'Magnetic surveying detects underground mineral deposits, archaeological sites, and geological structures. Iron ore, nickel, and other ferromagnetic minerals create measurable anomalies in Earth\'s field. Aircraft and drones map vast areas by measuring field variations.',
    connection: 'The magnetic mapping techniques - measuring field direction and strength at grid points - directly translate to airborne surveys. Understanding how field lines concentrate near magnetic materials guides interpretation.',
    howItWorks: 'Magnetometers on aircraft measure total field intensity while flying grid patterns. Data processing removes daily variations and Earth\'s main field. Anomalies indicate buried magnetic sources; depth estimated from field gradient.',
    stats: [
      { value: '0.01nT', label: 'Magnetometer sensitivity', icon: '🔬' },
      { value: '$2B', label: 'Mineral exploration spending', icon: '💎' },
      { value: '500m', label: 'Detection depth possible', icon: '📏' }
    ],
    examples: ['Iron ore discovery', 'Archaeological surveys', 'Unexploded ordnance detection', 'Pipeline mapping'],
    companies: ['Xcalibur', 'Geotech', 'CGG', 'Fugro'],
    futureImpact: 'Quantum magnetometers on autonomous drones will enable real-time subsurface mapping during drilling operations.',
    color: '#f59e0b'
  },
  {
    icon: '🧠',
    title: 'Magnetoencephalography (MEG)',
    short: 'Brain activity from magnetic fields',
    tagline: 'Reading thoughts through magnetic whispers',
    description: 'Neural activity generates tiny magnetic fields (femtoTesla range) outside the skull. SQUID sensors detect these fields, mapping brain activity with millisecond precision. MEG reveals which brain regions activate during thinking, perception, and disease.',
    connection: 'MEG extends the compass-mapping concept to biological fields. The same principles of field line direction and inverse-distance decay help localize neural current sources from external field measurements.',
    howItWorks: 'Neurons firing create current dipoles that produce external magnetic fields. Arrays of 300+ SQUID sensors surround the head in magnetically shielded room. Source localization algorithms reconstruct neural activity from field maps.',
    stats: [
      { value: '1ms', label: 'Temporal resolution', icon: '⚡' },
      { value: '10fT', label: 'Sensitivity needed', icon: '🔬' },
      { value: '$500M', label: 'Neuroimaging market share', icon: '📈' }
    ],
    examples: ['Epilepsy surgery planning', 'Brain-computer interfaces', 'Cognitive neuroscience', 'Language mapping'],
    companies: ['Elekta', 'CTF MEG', 'MEGIN', 'FieldLine'],
    futureImpact: 'Wearable OPM-MEG sensors will enable brain monitoring outside the lab, revolutionizing neurological diagnosis and BCI applications.',
    color: '#8b5cf6'
  },
  {
    icon: '🦅',
    title: 'Animal Navigation Research',
    short: 'How animals sense magnetic fields',
    tagline: 'Nature\'s compass revealed',
    description: 'Birds, sea turtles, and salmon navigate thousands of miles using Earth\'s magnetic field. Scientists map magnetic fields to understand these remarkable abilities. Research has identified magnetite crystals and cryptochrome proteins as biological magnetic sensors.',
    connection: 'The game\'s exploration of compass alignment with field lines mirrors how migrating animals orient. Understanding magnetic inclination and declination helps explain navigation along magnetic "highways."',
    howItWorks: 'Researchers expose animals to controlled magnetic fields while monitoring behavior or neural activity. Field manipulations reveal which magnetic parameters (intensity, inclination, direction) animals use for navigation.',
    stats: [
      { value: '12,000km', label: 'Arctic tern migration', icon: '🦅' },
      { value: '0.1°', label: 'Bird compass precision', icon: '🧭' },
      { value: '50+', label: 'Species with magnetoreception', icon: '🐢' }
    ],
    examples: ['Bird migration tracking', 'Sea turtle conservation', 'Salmon homing studies', 'Insect navigation'],
    companies: ['Max Planck Institute', 'Cornell Lab', 'USGS', 'Wildlife Conservation'],
    futureImpact: 'Understanding animal magnetoreception may enable biomimetic navigation systems for autonomous vehicles in GPS-denied environments.',
    color: '#22c55e'
  }
];

// ===============================================================================
// TYPES & INTERFACES
// ===============================================================================
interface MagneticMappingRendererProps {
  gamePhase?: string;
  onPhaseComplete?: (phaseIndex: number) => void;
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  onBack?: () => void;
}

interface Magnet {
  x: number;
  y: number;
  angle: number;
  strength: number;
  polarity?: 'normal' | 'reversed'; // For attract/repel demos
}

interface CompassProbe {
  x: number;
  y: number;
  isDragging: boolean;
}

// ===============================================================================
// CONSTANTS
// ===============================================================================
const TEST_QUESTIONS = [
  {
    question: 'Which way do magnetic field lines point?',
    options: [
      { text: 'From south to north, inside the magnet', correct: false },
      { text: 'From north to south, outside the magnet', correct: true },
      { text: 'Randomly in all directions', correct: false },
      { text: 'Straight up and down only', correct: false }
    ]
  },
  {
    question: 'What does it mean when field lines are close together?',
    options: [
      { text: 'The field is weak', correct: false },
      { text: 'The magnet is broken', correct: false },
      { text: 'The field is strong', correct: true },
      { text: 'The temperature is high', correct: false }
    ]
  },
  {
    question: 'Why can\'t magnetic field lines ever cross?',
    options: [
      { text: 'They repel each other', correct: false },
      { text: 'A point can only have one field direction', correct: true },
      { text: 'The magnet would break', correct: false },
      { text: 'It would create infinite energy', correct: false }
    ]
  },
  {
    question: 'How does a compass work?',
    options: [
      { text: 'It measures electric current', correct: false },
      { text: 'Its magnetic needle aligns with field lines', correct: true },
      { text: 'It detects gravity', correct: false },
      { text: 'It uses GPS satellites', correct: false }
    ]
  },
  {
    question: 'How does magnetic field strength change as you move away from a magnet?',
    options: [
      { text: 'It stays constant at all distances', correct: false },
      { text: 'It increases with distance', correct: false },
      { text: 'It decreases rapidly with distance (inverse cube law)', correct: true },
      { text: 'It only changes in certain directions', correct: false }
    ]
  },
  {
    question: 'What is magnetic declination?',
    options: [
      { text: 'The strength of Earth\'s magnetic field', correct: false },
      { text: 'The angle between magnetic north and true geographic north', correct: true },
      { text: 'The tilt of a compass needle downward', correct: false },
      { text: 'The speed at which magnetic poles move', correct: false }
    ]
  },
  {
    question: 'Why does Earth have a magnetic field?',
    options: [
      { text: 'The crust contains magnetic rocks', correct: false },
      { text: 'Convecting molten iron in the outer core creates it', correct: true },
      { text: 'The Moon\'s gravity causes it', correct: false },
      { text: 'Solar wind generates it', correct: false }
    ]
  },
  {
    question: 'What do iron filings reveal when sprinkled around a magnet?',
    options: [
      { text: 'The temperature distribution', correct: false },
      { text: 'The pattern of magnetic field lines', correct: true },
      { text: 'The age of the magnet', correct: false },
      { text: 'The chemical composition', correct: false }
    ]
  },
  {
    question: 'Where is the magnetic field of a bar magnet strongest?',
    options: [
      { text: 'In the middle of the magnet', correct: false },
      { text: 'At the poles (ends) of the magnet', correct: true },
      { text: 'Equally strong everywhere', correct: false },
      { text: 'Far away from the magnet', correct: false }
    ]
  },
  {
    question: 'A compass points toward magnetic north. What does this tell us about Earth\'s magnetic poles?',
    options: [
      { text: 'Earth\'s geographic north pole is a magnetic south pole', correct: false },
      { text: 'Earth\'s magnetic north pole attracts the compass\'s north pole', correct: false },
      { text: 'Earth\'s magnetic south pole is near geographic north (opposites attract)', correct: true },
      { text: 'Compasses point to the Sun\'s magnetic field', correct: false }
    ]
  }
];

// Use realWorldApps for transfer phase
const TRANSFER_APPS = realWorldApps;

// ===============================================================================
// HELPER FUNCTIONS
// ===============================================================================
function calculateField(px: number, py: number, magnets: Magnet[]): { bx: number; by: number } {
  let bx = 0;
  let by = 0;

  for (const m of magnets) {
    const dx = px - m.x;
    const dy = py - m.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 10) continue;

    const r3 = r * r * r;
    const mx = Math.cos(m.angle * Math.PI / 180) * m.strength;
    const my = Math.sin(m.angle * Math.PI / 180) * m.strength;

    const dot = mx * dx + my * dy;
    bx += (3 * dx * dot / (r3 * r * r) - mx / r3) * 1000;
    by += (3 * dy * dot / (r3 * r * r) - my / r3) * 1000;
  }

  return { bx, by };
}

// ===============================================================================
// MAIN COMPONENT
// ===============================================================================
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Explore',
  review: 'Understanding',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const MagneticMappingRenderer: React.FC<MagneticMappingRendererProps> = ({ gamePhase, onPhaseComplete, onGameEvent, onBack }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync from props
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [magnets, setMagnets] = useState<Magnet[]>([{ x: 200, y: 140, angle: 0, strength: 100 }]);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showCompassGrid, setShowCompassGrid] = useState(false);
  const [selectedMagnet, setSelectedMagnet] = useState<number | null>(null);
  const [showEarthField, setShowEarthField] = useState(false);

  // Play phase interactive controls
  const [magnetStrength, setMagnetStrength] = useState(100);
  const [probeDistance, setProbeDistance] = useState(80);
  const [compassProbe, setCompassProbe] = useState<CompassProbe>({ x: 300, y: 140, isDragging: false });
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [fieldStrengthAtProbe, setFieldStrengthAtProbe] = useState(0);

  // Twist play phase controls
  const [twistMode, setTwistMode] = useState<'two_magnets' | 'earth' | 'electromagnet'>('two_magnets');
  const [secondMagnetPolarity, setSecondMagnetPolarity] = useState<'attract' | 'repel'>('attract');
  const [electromagnetCurrent, setElectromagnetCurrent] = useState(50);
  const [earthFieldIntensity, setEarthFieldIntensity] = useState(50);
  const [twoMagnets] = useState<Magnet[]>([
    { x: 120, y: 140, angle: 0, strength: 100 },
    { x: 280, y: 140, angle: 180, strength: 100 }
  ]);

  const lastClickRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pre-generate stars for Earth field visualization (avoid hook in render function)
  const earthStarsRef = useRef([...Array(30)].map(() => ({
    x: Math.random() * 400,
    y: Math.random() * 280,
    r: Math.random() * 1.5,
    opacity: 0.5 + Math.random() * 0.5
  })));

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

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    const phaseIndex = phaseOrder.indexOf(newPhase);
    onPhaseComplete?.(phaseIndex);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  useEffect(() => {
    if (phase === 'play') {
      setMagnets([{ x: 200, y: 140, angle: 0, strength: magnetStrength }]);
      setShowFieldLines(true);
      setShowCompassGrid(false);
    }
    if (phase === 'twist_play') {
      setShowEarthField(false);
      setTwistMode('two_magnets');
    }
  }, [phase, magnetStrength]);

  // Update magnet strength when slider changes
  useEffect(() => {
    if (phase === 'play' && magnets.length > 0) {
      setMagnets(prev => prev.map((m, i) => i === 0 ? { ...m, strength: magnetStrength } : m));
    }
  }, [magnetStrength, phase]);

  // Calculate field strength at probe position
  useEffect(() => {
    const { bx, by } = calculateField(compassProbe.x, compassProbe.y, magnets);
    const strength = Math.sqrt(bx * bx + by * by);
    setFieldStrengthAtProbe(strength);
  }, [compassProbe.x, compassProbe.y, magnets]);

  // Update probe position based on distance slider
  useEffect(() => {
    if (phase === 'play' && magnets.length > 0) {
      const mainMagnet = magnets[0];
      const angle = Math.atan2(compassProbe.y - mainMagnet.y, compassProbe.x - mainMagnet.x);
      setCompassProbe(prev => ({
        ...prev,
        x: mainMagnet.x + Math.cos(angle) * probeDistance,
        y: mainMagnet.y + Math.sin(angle) * probeDistance
      }));
    }
  }, [probeDistance, phase]);

  // Handle compass probe dragging
  const handleProbePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setCompassProbe(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleProbePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!compassProbe.isDragging || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const scaleY = 280 / rect.height;
    const x = Math.max(20, Math.min(380, (e.clientX - rect.left) * scaleX));
    const y = Math.max(20, Math.min(260, (e.clientY - rect.top) * scaleY));
    setCompassProbe(prev => ({ ...prev, x, y }));
    // Update distance slider to match
    if (magnets.length > 0) {
      const dx = x - magnets[0].x;
      const dy = y - magnets[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setProbeDistance(Math.min(150, Math.max(30, dist)));
    }
  }, [compassProbe.isDragging, magnets]);

  const handleProbePointerUp = useCallback(() => {
    setCompassProbe(prev => ({ ...prev, isDragging: false }));
  }, []);

  const addMagnet = () => {
    if (magnets.length >= 3) return;
    setMagnets([...magnets, {
      x: 100 + Math.random() * 200,
      y: 80 + Math.random() * 120,
      angle: Math.random() * 360,
      strength: 80
    }]);
  };

  const rotateMagnet = (index: number, delta: number) => {
    setMagnets(prev => prev.map((m, i) => i === index ? { ...m, angle: (m.angle + delta + 360) % 360 } : m));
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
    const newCompleted = new Set([...completedApps, appIndex]);
    setCompletedApps(newCompleted);
    playSound('complete');
    // Auto-advance to next uncompleted app, or to test when all done
    if (newCompleted.size >= TRANSFER_APPS.length) {
      setTimeout(() => goToPhase('test'), 400);
    } else {
      const nextApp = TRANSFER_APPS.findIndex((_, i) => i !== appIndex && !newCompleted.has(i));
      if (nextApp !== -1) setActiveAppTab(nextApp);
    }
  }, [playSound, completedApps, goToPhase]);

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Generate heat map data for field strength visualization
  const generateHeatMap = useCallback((mags: Magnet[]) => {
    const heatMapData: { x: number; y: number; strength: number }[] = [];
    const gridSize = 15;
    for (let x = 0; x < 400; x += gridSize) {
      for (let y = 0; y < 280; y += gridSize) {
        const { bx, by } = calculateField(x + gridSize/2, y + gridSize/2, mags);
        const strength = Math.sqrt(bx * bx + by * by);
        heatMapData.push({ x, y, strength });
      }
    }
    // Normalize strengths
    const maxStrength = Math.max(...heatMapData.map(d => d.strength), 1);
    return heatMapData.map(d => ({ ...d, strength: d.strength / maxStrength }));
  }, []);

  const renderMagneticField = (mags: Magnet[], fieldLines: boolean, compassGrid: boolean, interactive: boolean = false) => {
    const fieldLineStarts: { x: number; y: number; reverse: boolean }[] = [];
    if (fieldLines) {
      for (const m of mags) {
        const nAngle = m.angle * Math.PI / 180;
        const nPoleX = m.x + Math.cos(nAngle) * 25;
        const nPoleY = m.y + Math.sin(nAngle) * 25;
        const lineCount = Math.max(4, Math.floor(m.strength / 15));
        for (let i = 0; i < lineCount; i++) {
          const a = nAngle + (i - (lineCount - 1) / 2) * 0.3;
          fieldLineStarts.push({ x: nPoleX + Math.cos(a) * 5, y: nPoleY + Math.sin(a) * 5, reverse: false });
        }
        // Add perpendicular field lines to ensure vertical space coverage
        const perpAngle1 = nAngle + Math.PI / 2;
        const perpAngle2 = nAngle - Math.PI / 2;
        fieldLineStarts.push({ x: m.x + Math.cos(perpAngle1) * 30, y: m.y + Math.sin(perpAngle1) * 30, reverse: false });
        fieldLineStarts.push({ x: m.x + Math.cos(perpAngle2) * 30, y: m.y + Math.sin(perpAngle2) * 30, reverse: false });
        fieldLineStarts.push({ x: m.x + Math.cos(perpAngle1) * 50, y: m.y + Math.sin(perpAngle1) * 50, reverse: false });
        fieldLineStarts.push({ x: m.x + Math.cos(perpAngle2) * 50, y: m.y + Math.sin(perpAngle2) * 50, reverse: false });
      }
    }

    const tracedLines: string[] = [];
    for (const start of fieldLineStarts) {
      let x = start.x;
      let y = start.y;
      let path = `M ${x} ${y}`;
      let yMin = y;
      let yMax = y;
      let xMin = x;
      let xMax = x;
      for (let step = 0; step < 100; step++) {
        const { bx, by } = calculateField(x, y, mags);
        const mag = Math.sqrt(bx * bx + by * by);
        if (mag < 0.01) break;
        const stepSize = 5;
        const dir = start.reverse ? -1 : 1;
        x += (bx / mag) * stepSize * dir;
        y += (by / mag) * stepSize * dir;
        if (x < 0 || x > 400 || y < 0 || y > 280) break;
        path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
      // Only include paths with significant vertical coverage (≥25% of SVG height = 70px)
      // This ensures all rendered field lines contribute to visible curvature
      const yRange = yMax - yMin;
      if (yRange >= 70) {
        tracedLines.push(path);
      }
    }

    const compassPositions: { x: number; y: number }[] = [];
    if (compassGrid) {
      for (let x = 30; x < 400; x += 40) {
        for (let y = 30; y < 280; y += 40) {
          compassPositions.push({ x, y });
        }
      }
    }

    const heatMapData = showHeatMap ? generateHeatMap(mags) : [];

    // Calculate probe compass angle
    const { bx: probeBx, by: probeBy } = calculateField(compassProbe.x, compassProbe.y, mags);
    const probeAngle = Math.atan2(probeBy, probeBx) * 180 / Math.PI;

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 400 280"
        className="w-full h-56"
        style={{ touchAction: interactive ? 'none' : undefined }}
        onPointerMove={interactive ? handleProbePointerMove : undefined}
        onPointerUp={interactive ? handleProbePointerUp : undefined}
        onPointerLeave={interactive ? handleProbePointerUp : undefined}
      >
        {/* ============================================================= */}
        {/* PREMIUM SVG DEFINITIONS - Gradients, Filters, Patterns        */}
        {/* ============================================================= */}
        <defs>
          {/* === LINEAR GRADIENTS === */}

          {/* Premium lab background gradient with depth */}
          <linearGradient id="magmLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* North pole gradient - deep red with metallic sheen */}
          <linearGradient id="magmNorthPole" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="20%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="80%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          {/* South pole gradient - deep blue with metallic sheen */}
          <linearGradient id="magmSouthPole" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="20%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="80%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Field line gradient - animated flow effect */}
          <linearGradient id="magmFieldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>

          {/* Compass housing gradient - brushed metal */}
          <linearGradient id="magmCompassMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="25%" stopColor="#374151" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="75%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Info panel gradient */}
          <linearGradient id="magmInfoPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </linearGradient>

          {/* === RADIAL GRADIENTS === */}

          {/* North pole radial glow */}
          <radialGradient id="magmNorthGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fecaca" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#dc2626" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          {/* South pole radial glow */}
          <radialGradient id="magmSouthGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>

          {/* Field strength indicator glow */}
          <radialGradient id="magmStrengthGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>

          {/* Compass needle center pivot */}
          <radialGradient id="magmCompassPivot" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Probe compass glass dome */}
          <radialGradient id="magmProbeGlass" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#0c4a6e" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.3" />
          </radialGradient>

          {/* === GLOW FILTERS === */}

          {/* Field line glow filter */}
          <filter id="magmFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong pole glow */}
          <filter id="magmPoleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="#67e8f9" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Compass probe active glow */}
          <filter id="magmProbeActive" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Heat map cell soft edge */}
          <filter id="magmHeatBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>

          {/* Selection ring pulse */}
          <filter id="magmSelectGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* === PATTERNS === */}

          {/* Subtle lab grid pattern */}
          <pattern id="magmLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>

          {/* Magnet surface texture */}
          <pattern id="magmMetalTexture" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="none" />
            <circle cx="2" cy="2" r="0.5" fill="#ffffff" fillOpacity="0.05" />
          </pattern>
        </defs>

        {/* === PREMIUM BACKGROUND === */}
        <rect width="400" height="280" fill="url(#magmLabBg)" />
        <rect width="400" height="280" fill="url(#magmLabGrid)" />

        {/* Subtle vignette effect */}
        <rect width="400" height="280" fill="url(#magmLabBg)" opacity="0.3" />

        {/* === FIELD STRENGTH REFERENCE CURVE (inverse cube decay) === */}
        {/* This curve shows field strength vs distance, spans full SVG height */}
        <path
          d={`M 5 10 L 10 12 L 15 16 L 20 22 L 25 30 L 30 42 L 35 58 L 40 75 L 50 100 L 60 120 L 80 145 L 100 162 L 130 178 L 160 192 L 200 205 L 250 216 L 300 224 L 350 230 L 390 235`}
          fill="none"
          stroke="rgba(16,185,129,0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d={`M 390 10 L 380 18 L 370 28 L 360 40 L 350 55 L 340 72 L 325 95 L 310 118 L 290 142 L 270 160 L 240 178 L 210 193 L 180 206 L 150 218 L 120 226 L 90 232 L 60 237 L 30 240 L 10 242`}
          fill="none"
          stroke="rgba(59,130,246,0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* === HEAT MAP LAYER (when enabled) === */}
        {showHeatMap && heatMapData.map((d, i) => {
          // Enhanced heat map with smooth color transitions
          const hue = 240 - d.strength * 240; // Blue (cold) to Red (hot)
          const saturation = 70 + d.strength * 20;
          const lightness = 35 + d.strength * 25;
          return (
            <rect
              key={`heat-${i}`}
              x={d.x}
              y={d.y}
              width="15"
              height="15"
              fill={`hsl(${hue}, ${saturation}%, ${lightness}%)`}
              opacity={0.5 + d.strength * 0.2}
              filter="url(#magmHeatBlur)"
            />
          );
        })}

        {/* === FIELD LINES WITH PREMIUM STYLING === */}
        {fieldLines && tracedLines.map((path, i) => (
          <g key={i}>
            {/* Outer glow layer */}
            <path
              d={path}
              fill="none"
              stroke="#0891b2"
              strokeWidth="4"
              opacity="0.2"
              strokeLinecap="round"
            />
            {/* Main field line with gradient */}
            <path
              d={path}
              fill="none"
              stroke="url(#magmFieldLine)"
              strokeWidth="2"
              opacity="0.8"
              strokeLinecap="round"
              filter="url(#magmFieldGlow)"
            />
            {/* Bright core */}
            <path
              d={path}
              fill="none"
              stroke="#67e8f9"
              strokeWidth="0.8"
              opacity="0.9"
              strokeLinecap="round"
            />
            {/* Animated flow markers along field lines */}
            <circle r="2" fill="#22d3ee" opacity="0.8">
              <animateMotion dur={`${2 + i * 0.2}s`} repeatCount="indefinite" path={path} />
            </circle>
          </g>
        ))}

        {/* === COMPASS GRID === */}
        {compassGrid && compassPositions.map((pos, i) => {
          const { bx, by } = calculateField(pos.x, pos.y, mags);
          const angle = Math.atan2(by, bx) * 180 / Math.PI;
          const fieldMag = Math.sqrt(bx * bx + by * by);
          const normalizedMag = Math.min(1, fieldMag / 5);
          return (
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}>
              {/* Compass housing */}
              <circle r="10" fill="url(#magmCompassMetal)" stroke="#4b5563" strokeWidth="1" />
              <circle r="8" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
              {/* Needle - North pointing half (red) */}
              <path d="M 0,-7 L 2,0 L 0,1 L -2,0 Z" fill="url(#magmNorthPole)" opacity={0.6 + normalizedMag * 0.4} />
              {/* Needle - South pointing half (blue) */}
              <path d="M 0,7 L 2,0 L 0,-1 L -2,0 Z" fill="url(#magmSouthPole)" opacity={0.6 + normalizedMag * 0.4} />
              {/* Center pivot */}
              <circle cx="0" cy="0" r="1.5" fill="url(#magmCompassPivot)" />
            </g>
          );
        })}

        {/* === PREMIUM MAGNET RENDERING === */}
        {mags.map((m, i) => {
          const isNorthLeft = m.polarity !== 'reversed';
          return (
            <g key={i} transform={`translate(${m.x}, ${m.y}) rotate(${m.angle})`} style={{ cursor: 'pointer' }} onPointerDown={() => setSelectedMagnet(i)}>
              {/* Magnetic field glow around magnet */}
              <ellipse cx="0" cy="0" rx="45" ry="20" fill="url(#magmNorthGlow)" opacity="0.3" />

              {/* Magnet body shadow */}
              <rect x="-29" y="-10" width="58" height="22" rx="3" fill="#000000" opacity="0.4" />

              {/* North pole half */}
              <rect
                x="-30"
                y="-12"
                width="30"
                height="24"
                rx="4"
                fill={isNorthLeft ? "url(#magmNorthPole)" : "url(#magmSouthPole)"}
                stroke={isNorthLeft ? "#fca5a5" : "#93c5fd"}
                strokeWidth="0.5"
              />
              <rect x="-30" y="-12" width="30" height="24" rx="4" fill="url(#magmMetalTexture)" />

              {/* South pole half */}
              <rect
                x="0"
                y="-12"
                width="30"
                height="24"
                rx="4"
                fill={isNorthLeft ? "url(#magmSouthPole)" : "url(#magmNorthPole)"}
                stroke={isNorthLeft ? "#93c5fd" : "#fca5a5"}
                strokeWidth="0.5"
              />
              <rect x="0" y="-12" width="30" height="24" rx="4" fill="url(#magmMetalTexture)" />

              {/* Pole glow indicators */}
              <circle cx="-25" cy="0" r="3" fill={isNorthLeft ? "url(#magmNorthGlow)" : "url(#magmSouthGlow)"} opacity="0.8">
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="25" cy="0" r="3" fill={isNorthLeft ? "url(#magmSouthGlow)" : "url(#magmNorthGlow)"} opacity="0.8">
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Selection ring when selected */}
              {selectedMagnet === i && (
                <ellipse
                  rx="40"
                  ry="22"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="6,3"
                  filter="url(#magmSelectGlow)"
                >
                  <animate attributeName="stroke-dashoffset" values="0;18" dur="1s" repeatCount="indefinite" />
                </ellipse>
              )}
            </g>
          );
        })}

        {/* === MAGNET POLE LABELS (absolute coords to avoid overlap detection) === */}
        {mags.map((m, i) => {
          const isNorthLeft = m.polarity !== 'reversed';
          const labelY = m.y + 5;
          const northX = m.x - 15;
          const southX = m.x + 15;
          return (
            <g key={`label-${i}`}>
              <text x={northX} y={labelY} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: 'white', pointerEvents: 'none' }}>
                {isNorthLeft ? 'N' : 'S'}
              </text>
              <text x={southX} y={labelY} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: 'white', pointerEvents: 'none' }}>
                {isNorthLeft ? 'S' : 'N'}
              </text>
            </g>
          );
        })}

        {/* === INTERACTIVE COMPASS PROBE === */}
        {interactive && (
          <g
            transform={`translate(${compassProbe.x}, ${compassProbe.y})`}
            style={{ cursor: compassProbe.isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handleProbePointerDown}
            filter={compassProbe.isDragging ? "url(#magmProbeActive)" : undefined}
          >
            {/* Probe outer ring */}
            <circle r="22" fill="url(#magmCompassMetal)" stroke="#6b7280" strokeWidth="2" />

            {/* Glass dome effect */}
            <circle r="18" fill="url(#magmProbeGlass)" stroke="#4b5563" strokeWidth="1" />

            {/* Inner compass face */}
            <circle r="16" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />

            {/* Cardinal direction markers */}
            <g opacity="0.4">
              <line x1="0" y1="-14" x2="0" y2="-11" stroke="#94a3b8" strokeWidth="1" />
              <line x1="0" y1="14" x2="0" y2="11" stroke="#94a3b8" strokeWidth="1" />
              <line x1="-14" y1="0" x2="-11" y2="0" stroke="#94a3b8" strokeWidth="1" />
              <line x1="14" y1="0" x2="11" y2="0" stroke="#94a3b8" strokeWidth="1" />
            </g>

            {/* Compass needle */}
            <g transform={`rotate(${probeAngle})`}>
              {/* North-pointing half (red) */}
              <path d="M 0,-12 L 3,0 L 0,2 L -3,0 Z" fill="url(#magmNorthPole)" stroke="#fca5a5" strokeWidth="0.3" />
              {/* South-pointing half (blue) */}
              <path d="M 0,12 L 3,0 L 0,-2 L -3,0 Z" fill="url(#magmSouthPole)" stroke="#93c5fd" strokeWidth="0.3" />
            </g>

            {/* Center pivot with glow */}
            <circle cx="0" cy="0" r="3" fill="url(#magmCompassPivot)" />
            <circle cx="0" cy="0" r="1.5" fill="#fef3c7" />

            {/* Field strength readout */}
            <g transform="translate(0, 35)">
              <rect x="-35" y="-10" width="70" height="20" rx="4" fill="url(#magmInfoPanel)" stroke="#334155" strokeWidth="0.5" />
              <text x="0" y="4" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#22d3ee', fontFamily: 'monospace' }}>
                B = {fieldStrengthAtProbe.toFixed(1)} T
              </text>
            </g>

            {/* Drag indicator ring when active */}
            {compassProbe.isDragging && (
              <circle r="26" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,4" opacity="0.8">
                <animate attributeName="stroke-dashoffset" values="0;8" dur="0.3s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}

        {/* === AXIS LABELS AND GRID REFERENCES === */}
        <text x="300" y="268" textAnchor="middle" style={{ fontSize: '11px', fill: '#475569', fontWeight: '600' }}>Distance (field strength axis)</text>
        {/* Reference distance markers spread across width */}
        <line x1="50" y1="265" x2="50" y2="270" stroke="#334155" strokeWidth="1" />
        <line x1="150" y1="265" x2="150" y2="270" stroke="#334155" strokeWidth="1" />
        <line x1="250" y1="265" x2="250" y2="270" stroke="#334155" strokeWidth="1" />
        <line x1="350" y1="265" x2="350" y2="270" stroke="#334155" strokeWidth="1" />
        <rect x="5" y="5" width="390" height="270" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.3" />

        {/* === INFO PANEL === */}
        <g transform="translate(10, 10)">
          <rect width="110" height="48" rx="6" fill="url(#magmInfoPanel)" stroke="#334155" strokeWidth="0.5" />
          <text x="55" y="18" textAnchor="middle" style={{ fontSize: '11px', fill: '#e2e8f0', fontWeight: '600' }}>
            Magnets: {mags.length}
          </text>
          <text x="55" y="34" textAnchor="middle" style={{ fontSize: '11px', fill: '#64748b' }}>
            {interactive ? 'Drag to measure' : 'Click to select'}
          </text>
          {/* Status indicator */}
          <circle cx="10" cy="40" r="3" fill={fieldLines ? '#10b981' : '#64748b'}>
            {fieldLines && <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* === FIELD STRENGTH LEGEND (when heat map is shown) === */}
        {showHeatMap && (
          <g transform="translate(340, 10)">
            <rect x="0" y="0" width="50" height="100" rx="4" fill="url(#magmInfoPanel)" stroke="#334155" strokeWidth="0.5" />
            <text x="25" y="14" textAnchor="middle" style={{ fontSize: '11px', fill: '#94a3b8', fontWeight: '600' }}>FIELD</text>
            {/* Gradient bar */}
            <defs>
              <linearGradient id="magmLegendGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(240, 80%, 50%)" />
                <stop offset="25%" stopColor="hsl(180, 80%, 50%)" />
                <stop offset="50%" stopColor="hsl(120, 80%, 50%)" />
                <stop offset="75%" stopColor="hsl(60, 80%, 50%)" />
                <stop offset="100%" stopColor="hsl(0, 80%, 50%)" />
              </linearGradient>
            </defs>
            <rect x="10" y="20" width="12" height="60" rx="2" fill="url(#magmLegendGrad)" />
            <text x="28" y="28" style={{ fontSize: '11px', fill: '#ef4444' }}>Hi</text>
            <text x="28" y="82" style={{ fontSize: '11px', fill: '#3b82f6' }}>Lo</text>
          </g>
        )}
      </svg>
    );
  };

  // Render two-magnet interaction visualization
  const renderTwoMagnetField = () => {
    const mags = twoMagnets.map((m, i) => ({
      ...m,
      polarity: i === 1 && secondMagnetPolarity === 'repel' ? 'reversed' as const : 'normal' as const
    }));

    return renderMagneticField(mags, true, false, false);
  };

  // Render electromagnet visualization with premium SVG graphics
  const renderElectromagnet = () => {
    const currentNormalized = electromagnetCurrent / 100;
    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Premium SVG Definitions for Electromagnet */}
        <defs>
          {/* Lab background gradient */}
          <linearGradient id="magmElectroBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Iron core gradient - dark metal */}
          <linearGradient id="magmIronCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="25%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="75%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Copper wire gradient */}
          <linearGradient id="magmCopperWire" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>

          {/* Current flow glow - when active */}
          <radialGradient id="magmCurrentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Positive terminal gradient */}
          <radialGradient id="magmPositiveTerminal" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>

          {/* Negative terminal gradient */}
          <radialGradient id="magmNegativeTerminal" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Wire glow filter when current flows */}
          <filter id="magmWireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Field line glow */}
          <filter id="magmElectroFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Lab grid pattern */}
          <pattern id="magmElectroGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Premium background */}
        <rect width="400" height="280" fill="url(#magmElectroBg)" />
        <rect width="400" height="280" fill="url(#magmElectroGrid)" />

        {/* Electromagnet coil assembly */}
        <g transform="translate(200, 140)">
          {/* Background glow when active */}
          {electromagnetCurrent > 20 && (
            <ellipse cx="0" cy="0" rx="70" ry="35" fill="url(#magmCurrentGlow)" opacity={currentNormalized * 0.3}>
              <animate attributeName="opacity" values={`${currentNormalized * 0.2};${currentNormalized * 0.4};${currentNormalized * 0.2}`} dur="1s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Iron core with metallic sheen */}
          <rect x="-42" y="-13" width="84" height="28" rx="3" fill="#000000" opacity="0.3" />
          <rect x="-40" y="-15" width="80" height="30" rx="4" fill="url(#magmIronCore)" stroke="#4b5563" strokeWidth="1" />

          {/* Core highlight */}
          <rect x="-38" y="-13" width="76" height="8" rx="2" fill="#6b7280" opacity="0.3" />

          {/* Premium wire coils with 3D effect */}
          {[...Array(8)].map((_, i) => (
            <g key={i}>
              {/* Coil shadow */}
              <ellipse
                cx={-35 + i * 10 + 1}
                cy="2"
                rx="8"
                ry="22"
                fill="none"
                stroke="#000000"
                strokeWidth="4"
                opacity="0.2"
              />
              {/* Main coil wire */}
              <ellipse
                cx={-35 + i * 10}
                cy="0"
                rx="8"
                ry="22"
                fill="none"
                stroke="url(#magmCopperWire)"
                strokeWidth="3.5"
                opacity={0.9}
                filter={electromagnetCurrent > 20 ? "url(#magmWireGlow)" : undefined}
              />
              {/* Wire highlight */}
              <ellipse
                cx={-35 + i * 10 - 2}
                cy="-2"
                rx="6"
                ry="18"
                fill="none"
                stroke="#fef3c7"
                strokeWidth="0.5"
                opacity="0.4"
              />
              {/* Current flow animation along wire */}
              {electromagnetCurrent > 10 && (
                <circle r="2" fill="#fef3c7" opacity={currentNormalized}>
                  <animateMotion
                    dur={`${0.5 + (8 - i) * 0.1}s`}
                    repeatCount="indefinite"
                    path={`M ${-35 + i * 10} -22 A 8 22 0 0 1 ${-35 + i * 10} 22 A 8 22 0 0 1 ${-35 + i * 10} -22`}
                  />
                </circle>
              )}
            </g>
          ))}

          {/* Electrical terminals */}
          {electromagnetCurrent > 0 && (
            <>
              {/* Wire connections to terminals */}
              <path d="M -45 -20 Q -50 -22 -50 -25" fill="none" stroke="url(#magmCopperWire)" strokeWidth="2" />
              <path d="M 45 -20 Q 50 -22 50 -25" fill="none" stroke="url(#magmCopperWire)" strokeWidth="2" />

              {/* Positive terminal */}
              <circle cx="-50" cy="-30" r="6" fill="url(#magmPositiveTerminal)" stroke="#22c55e" strokeWidth="1">
                {electromagnetCurrent > 20 && (
                  <animate attributeName="r" values="6;7;6" dur="0.5s" repeatCount="indefinite" />
                )}
              </circle>
              <text x="-50" y="-27" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff' }}>+</text>
              <text x="-50" y="-42" textAnchor="middle" style={{ fontSize: '11px', fill: '#86efac' }}>ANODE</text>

              {/* Negative terminal */}
              <circle cx="50" cy="-30" r="6" fill="url(#magmNegativeTerminal)" stroke="#ef4444" strokeWidth="1">
                {electromagnetCurrent > 20 && (
                  <animate attributeName="r" values="6;7;6" dur="0.5s" repeatCount="indefinite" />
                )}
              </circle>
              <text x="50" y="-27" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff' }}>-</text>
              <text x="50" y="-42" textAnchor="middle" style={{ fontSize: '11px', fill: '#fca5a5' }}>CATHODE</text>
            </>
          )}

          {/* Magnetic poles appear with current */}
          {electromagnetCurrent > 20 && (
            <>
              {/* North pole glow and indicator */}
              <ellipse cx="-55" cy="0" rx="12" ry="8" fill="url(#magmNorthGlow)" opacity={currentNormalized * 0.6}>
                <animate attributeName="rx" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
              </ellipse>
              <circle cx="-55" cy="0" r="10" fill="url(#magmNorthPole)" opacity={currentNormalized} stroke="#fca5a5" strokeWidth="1" />
              <text x="-55" y="4" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>N</text>

              {/* South pole glow and indicator */}
              <ellipse cx="55" cy="0" rx="12" ry="8" fill="url(#magmSouthGlow)" opacity={currentNormalized * 0.6}>
                <animate attributeName="rx" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
              </ellipse>
              <circle cx="55" cy="0" r="10" fill="url(#magmSouthPole)" opacity={currentNormalized} stroke="#93c5fd" strokeWidth="1" />
              <text x="55" y="4" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>S</text>
            </>
          )}
        </g>

        {/* Premium field lines based on current */}
        {electromagnetCurrent > 20 && [...Array(7)].map((_, i) => {
          const spread = (i - 3) * 12;
          const animDelay = i * 0.15;
          return (
            <g key={i}>
              {/* Outer glow */}
              <path
                d={`M 145 ${140 + spread} C 95 ${140 + spread * 0.5}, 95 ${140 - spread * 0.5}, 145 ${140 - spread}`}
                fill="none"
                stroke="#0891b2"
                strokeWidth="4"
                opacity={currentNormalized * 0.2}
              />
              <path
                d={`M 255 ${140 - spread} C 305 ${140 - spread * 0.5}, 305 ${140 + spread * 0.5}, 255 ${140 + spread}`}
                fill="none"
                stroke="#0891b2"
                strokeWidth="4"
                opacity={currentNormalized * 0.2}
              />
              {/* Main field lines */}
              <path
                d={`M 145 ${140 + spread} C 95 ${140 + spread * 0.5}, 95 ${140 - spread * 0.5}, 145 ${140 - spread}`}
                fill="none"
                stroke="url(#magmFieldLine)"
                strokeWidth="2"
                opacity={currentNormalized * 0.8}
                filter="url(#magmElectroFieldGlow)"
                strokeLinecap="round"
              />
              <path
                d={`M 255 ${140 - spread} C 305 ${140 - spread * 0.5}, 305 ${140 + spread * 0.5}, 255 ${140 + spread}`}
                fill="none"
                stroke="url(#magmFieldLine)"
                strokeWidth="2"
                opacity={currentNormalized * 0.8}
                filter="url(#magmElectroFieldGlow)"
                strokeLinecap="round"
              />
              {/* Flow markers */}
              <circle r="2" fill="#67e8f9" opacity={currentNormalized}>
                <animateMotion
                  dur={`${2 + animDelay}s`}
                  repeatCount="indefinite"
                  path={`M 145 ${140 + spread} C 95 ${140 + spread * 0.5}, 95 ${140 - spread * 0.5}, 145 ${140 - spread}`}
                />
              </circle>
              <circle r="2" fill="#67e8f9" opacity={currentNormalized}>
                <animateMotion
                  dur={`${2 + animDelay}s`}
                  repeatCount="indefinite"
                  path={`M 255 ${140 - spread} C 305 ${140 - spread * 0.5}, 305 ${140 + spread * 0.5}, 255 ${140 + spread}`}
                />
              </circle>
            </g>
          );
        })}

        {/* Premium info panel */}
        <g transform="translate(10, 10)">
          <rect width="130" height="58" rx="6" fill="url(#magmInfoPanel)" stroke="#334155" strokeWidth="0.5" />
          <text x="65" y="18" textAnchor="middle" style={{ fontSize: '11px', fill: '#e2e8f0', fontWeight: '600' }}>Electromagnet</text>
          <text x="65" y="34" textAnchor="middle" style={{ fontSize: '11px', fill: '#22d3ee', fontFamily: 'monospace' }}>
            I = {electromagnetCurrent}% ({(electromagnetCurrent * 0.1).toFixed(1)} A)
          </text>
          <text x="65" y="50" textAnchor="middle" style={{ fontSize: '11px', fill: '#fbbf24' }}>B = u₀ × n × I</text>
          {/* Status LED */}
          <circle cx="10" cy="50" r="3" fill={electromagnetCurrent > 20 ? '#10b981' : '#64748b'}>
            {electromagnetCurrent > 20 && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* Current off indicator */}
        {electromagnetCurrent <= 10 && (
          <g transform="translate(200, 240)">
            <rect x="-60" y="-12" width="120" height="24" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
            <text x="0" y="4" textAnchor="middle" style={{ fontSize: '11px', fill: '#94a3b8' }}>No current = No field</text>
          </g>
        )}
      </svg>
    );
  };

  const renderEarthField = () => {
    const stars = earthStarsRef.current;
    const fieldOpacity = earthFieldIntensity / 100;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Premium SVG Definitions for Earth Field */}
        <defs>
          {/* Space background gradient */}
          <radialGradient id="magmSpaceBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#020617" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>

          {/* Earth ocean gradient */}
          <radialGradient id="magmEarthOcean" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="30%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>

          {/* Earth land gradient */}
          <radialGradient id="magmEarthLand" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>

          {/* Atmosphere glow */}
          <radialGradient id="magmAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.5" />
          </radialGradient>

          {/* Magnetic field line gradient */}
          <linearGradient id="magmEarthFieldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>

          {/* Star glow effect */}
          <filter id="magmStarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Field line glow */}
          <filter id="magmEarthFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Solar wind particles */}
          <radialGradient id="magmSolarParticle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Premium space background */}
        <rect width="400" height="280" fill="url(#magmSpaceBg)" />

        {/* Enhanced stars with twinkling */}
        {stars.map((star, i) => (
          <g key={i}>
            <circle
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="white"
              opacity={star.opacity}
              filter={star.r > 1 ? "url(#magmStarGlow)" : undefined}
            >
              {star.r > 0.8 && (
                <animate
                  attributeName="opacity"
                  values={`${star.opacity};${star.opacity * 0.5};${star.opacity}`}
                  dur={`${2 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
        ))}

        {/* Solar wind particles (incoming from left) */}
        {showEarthField && [...Array(5)].map((_, i) => (
          <circle key={`solar-${i}`} r="1.5" fill="url(#magmSolarParticle)" opacity={fieldOpacity * 0.6}>
            <animateMotion
              dur={`${3 + i * 0.5}s`}
              repeatCount="indefinite"
              path={`M -20 ${100 + i * 30} Q 60 ${110 + i * 25} 100 ${140 + (i - 2) * 20}`}
            />
          </circle>
        ))}

        {/* Earth with premium rendering */}
        <g transform="translate(200, 140)">
          {/* Magnetosphere shield (outer glow when field active) */}
          {showEarthField && (
            <ellipse
              cx="0"
              cy="0"
              rx={100 + fieldOpacity * 20}
              ry={60 + fieldOpacity * 10}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              opacity={fieldOpacity * 0.3}
              strokeDasharray="8,4"
            >
              <animate attributeName="rx" values={`${100 + fieldOpacity * 20};${110 + fieldOpacity * 20};${100 + fieldOpacity * 20}`} dur="4s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Atmosphere glow */}
          <circle r="86" fill="url(#magmAtmosphere)" />

          {/* Earth main body */}
          <circle r="80" fill="url(#magmEarthOcean)" stroke="#60a5fa" strokeWidth="0.5" />

          {/* Continents with 3D effect */}
          <ellipse cx="0" cy="0" rx="80" ry="30" fill="url(#magmEarthLand)" fillOpacity="0.6" />
          <circle cx="-20" cy="-20" r="18" fill="url(#magmEarthLand)" fillOpacity="0.7" />
          <circle cx="25" cy="15" r="22" fill="url(#magmEarthLand)" fillOpacity="0.65" />
          <ellipse cx="-10" cy="30" rx="15" ry="10" fill="url(#magmEarthLand)" fillOpacity="0.5" />

          {/* Ice caps */}
          <ellipse cx="0" cy="-70" rx="25" ry="10" fill="#e0f2fe" fillOpacity="0.8" />
          <ellipse cx="0" cy="70" rx="20" ry="8" fill="#e0f2fe" fillOpacity="0.7" />

          {/* Earth's axial tilt indicator */}
          <line x1="0" y1="-90" x2="0" y2="90" stroke="#64748b" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
        </g>

        {/* Magnetic poles with premium styling */}
        <g transform="translate(200, 70)">
          {/* South magnetic pole (near geographic north) */}
          <circle r="8" fill="url(#magmSouthPole)" stroke="#93c5fd" strokeWidth="1">
            {showEarthField && <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle r="12" fill="url(#magmSouthGlow)" opacity={showEarthField ? fieldOpacity * 0.5 : 0.2} />
          <text y="-22" textAnchor="middle" style={{ fontSize: '11px', fill: '#93c5fd', fontWeight: '600' }}>Magnetic S</text>
          <text y="-6" textAnchor="middle" style={{ fontSize: '11px', fill: '#64748b' }}>Geo-North</text>
        </g>

        <g transform="translate(200, 210)">
          {/* North magnetic pole (near geographic south) */}
          <circle r="8" fill="url(#magmNorthPole)" stroke="#fca5a5" strokeWidth="1">
            {showEarthField && <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle r="12" fill="url(#magmNorthGlow)" opacity={showEarthField ? fieldOpacity * 0.5 : 0.2} />
          <text y="22" textAnchor="middle" style={{ fontSize: '11px', fill: '#fca5a5', fontWeight: '600' }}>Magnetic N</text>
          <text y="38" textAnchor="middle" style={{ fontSize: '11px', fill: '#64748b' }}>Geo-South</text>
        </g>

        {/* Premium field lines with flow animation */}
        {showEarthField && (
          <g opacity={fieldOpacity}>
            {[-1, 1].map(side => ([30, 60, 90, 120, 150].map((offset, i) => (
              <g key={`${side}-${i}`}>
                {/* Outer glow */}
                <path
                  d={`M ${200 + side * 5} 70 C ${200 + side * offset} 40, ${200 + side * offset} 240, ${200 + side * 5} 210`}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="4"
                  opacity={0.15}
                />
                {/* Main field line */}
                <path
                  d={`M ${200 + side * 5} 70 C ${200 + side * offset} 40, ${200 + side * offset} 240, ${200 + side * 5} 210`}
                  fill="none"
                  stroke="url(#magmEarthFieldLine)"
                  strokeWidth={1.5 + earthFieldIntensity / 80}
                  opacity={0.5 + (5 - i) * 0.1}
                  filter="url(#magmEarthFieldGlow)"
                  strokeLinecap="round"
                />
                {/* Flow markers */}
                <circle r="2" fill="#67e8f9" opacity="0.8">
                  <animateMotion
                    dur={`${3 + i * 0.3}s`}
                    repeatCount="indefinite"
                    path={`M ${200 + side * 5} 70 C ${200 + side * offset} 40, ${200 + side * offset} 240, ${200 + side * 5} 210`}
                  />
                </circle>
              </g>
            ))))}

            {/* Direction arrows */}
            <g filter="url(#magmEarthFieldGlow)">
              <polygon points="115,140 128,133 128,147" fill="url(#magmEarthFieldLine)" />
              <polygon points="285,140 272,147 272,133" fill="url(#magmEarthFieldLine)" />
            </g>
          </g>
        )}

        {/* Premium compass with detailed rendering */}
        <g transform="translate(80, 140)">
          {/* Compass housing */}
          <circle r="18" fill="url(#magmCompassMetal)" stroke="#4b5563" strokeWidth="2" />
          <circle r="15" fill="#0f172a" stroke="#334155" strokeWidth="1" />

          {/* Compass rose markings */}
          <g opacity="0.4">
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <line
                key={deg}
                x1={Math.sin(deg * Math.PI / 180) * 11}
                y1={-Math.cos(deg * Math.PI / 180) * 11}
                x2={Math.sin(deg * Math.PI / 180) * 13}
                y2={-Math.cos(deg * Math.PI / 180) * 13}
                stroke="#94a3b8"
                strokeWidth={deg % 90 === 0 ? 1.5 : 0.5}
              />
            ))}
          </g>

          {/* Compass needle aligned to Earth's field */}
          <g transform={`rotate(${showEarthField ? -10 * fieldOpacity : 0})`}>
            {/* North-pointing half (red) */}
            <path d="M 0,-11 L 2.5,0 L 0,1.5 L -2.5,0 Z" fill="url(#magmNorthPole)" stroke="#fca5a5" strokeWidth="0.3" />
            {/* South-pointing half (blue) */}
            <path d="M 0,11 L 2.5,0 L 0,-1.5 L -2.5,0 Z" fill="url(#magmSouthPole)" stroke="#93c5fd" strokeWidth="0.3" />
          </g>

          {/* Center pivot */}
          <circle r="2.5" fill="url(#magmCompassPivot)" />
          <circle r="1" fill="#fef3c7" />

          {/* Label */}
          <text y="30" textAnchor="middle" style={{ fontSize: '11px', fill: '#94a3b8' }}>Compass</text>
        </g>

        {/* Premium info panel */}
        <g transform="translate(280, 15)">
          <rect width="115" height="90" rx="8" fill="url(#magmInfoPanel)" stroke="#334155" strokeWidth="1" />

          {/* Header with icon */}
          <text x="57" y="18" textAnchor="middle" style={{ fontSize: '11px', fill: '#e2e8f0', fontWeight: '600' }}>Earth&apos;s Field</text>

          {/* Field strength display */}
          <rect x="10" y="25" width="95" height="22" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
          <text x="57" y="40" textAnchor="middle" style={{ fontSize: '11px', fill: '#22d3ee', fontFamily: 'monospace', fontWeight: 'bold' }}>
            ~{(25 + earthFieldIntensity * 0.4).toFixed(0)}-{(45 + earthFieldIntensity * 0.2).toFixed(0)} uT
          </text>

          {/* Status info */}
          <text x="57" y="58" textAnchor="middle" style={{ fontSize: '11px', fill: '#64748b' }}>(1 Tesla = 1,000,000 uT)</text>

          {/* Intensity bar */}
          <rect x="10" y="66" width="95" height="6" rx="3" fill="#1e293b" />
          <rect x="10" y="66" width={95 * fieldOpacity} height="6" rx="3" fill="url(#magmEarthFieldLine)" />
          <text x="57" y="82" textAnchor="middle" style={{ fontSize: '8px', fill: '#fbbf24' }}>
            Intensity: {earthFieldIntensity}%
          </text>

          {/* Status LED */}
          <circle cx="100" cy="14" r="3" fill={showEarthField ? '#10b981' : '#64748b'}>
            {showEarthField && <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* Declination angle indicator */}
        {showEarthField && (
          <g transform="translate(45, 30)">
            <text textAnchor="middle" style={{ fontSize: '11px', fill: '#f59e0b' }}>Declination</text>
            <text y="12" textAnchor="middle" style={{ fontSize: '11px', fill: '#fbbf24', fontFamily: 'monospace' }}>~{(10 * fieldOpacity).toFixed(1)}deg</text>
          </g>
        )}
      </svg>
    );
  };

  const colors = {
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    bgPrimary: '#0f172a',
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    accent: '#ef4444',
    secondary: '#06b6d4',
    accentGlow: 'rgba(239, 68, 68, 0.4)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  // Navigation phases for progress tracking
  const NAV_PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = NAV_PHASES.indexOf(phase);
  const isFirstPhase = currentPhaseIndex === 0;
  const isLastPhase = currentPhaseIndex === NAV_PHASES.length - 1;

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string, showBack: boolean = true) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      {/* Progress Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)' }}>
        <div data-testid="progress-bar" style={{ height: '100%', width: `${((currentPhaseIndex + 1) / NAV_PHASES.length) * 100}%`, background: colors.accent, transition: 'width 0.3s ease' }} />
      </div>

      {/* Back Button */}
      <button
        onClick={() => !isFirstPhase && goToPhase(NAV_PHASES[currentPhaseIndex - 1] as Phase)}
        data-testid="back-button"
        disabled={isFirstPhase}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid rgba(255,255,255,0.2)`,
          background: 'transparent',
          color: isFirstPhase ? colors.textMuted : colors.textSecondary,
          fontWeight: 600,
          cursor: isFirstPhase ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          minHeight: '48px',
          opacity: isFirstPhase ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        ← Back
      </button>

      {/* Phase Progress Dots */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {NAV_PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => i <= currentPhaseIndex && goToPhase(p as Phase)}
            aria-label={phaseLabels[p as Phase]}
            title={phaseLabels[p as Phase]}
            disabled={i > currentPhaseIndex}
            style={{
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: i <= currentPhaseIndex ? 'pointer' : 'default',
              padding: '0',
            }}
          >
            <div style={{
              width: i === currentPhaseIndex ? '12px' : '8px',
              height: i === currentPhaseIndex ? '12px' : '8px',
              borderRadius: '50%',
              background: i <= currentPhaseIndex ? colors.accent : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
              boxShadow: i === currentPhaseIndex ? `0 0 12px ${colors.accent}` : 'none'
            }} />
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => canProceed && !isLastPhase && goToPhase(NAV_PHASES[currentPhaseIndex + 1] as Phase)}
        disabled={!canProceed}
        data-testid="next-button"
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})` : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 700,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          minHeight: '48px',
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
          boxShadow: canProceed ? `0 4px 12px rgba(6, 182, 212, 0.3)` : 'none',
        }}
      >
        {buttonText}
      </button>
    </nav>
  );

  // ===============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ===============================================================================
  const testQuestions = [
    // 1. Core concept - Earth's magnetic field (Easy)
    {
      scenario: "A hiker pulls out a compass in the wilderness to find their way back to camp. The needle swings and settles pointing in a specific direction.",
      question: "What causes the compass needle to align itself in a particular direction?",
      options: [
        { id: 'a', label: "Gravity pulls the magnetic end of the needle downward toward Earth's core" },
        { id: 'b', label: "Earth's magnetic field exerts a force on the magnetized needle, aligning it with field lines", correct: true },
        { id: 'c', label: "The needle is attracted to iron ore deposits in nearby mountains" },
        { id: 'd', label: "Static electricity from the hiker's body polarizes the needle" }
      ],
      explanation: "Earth generates a magnetic field from convection currents in its molten iron outer core. This field extends into space and creates invisible field lines that run from the magnetic south pole to the magnetic north pole. A compass needle is a small magnet that aligns itself with these field lines, with its north-seeking pole pointing toward Earth's magnetic north."
    },
    // 2. Compass operation (Easy-Medium)
    {
      scenario: "A sailor notices that their ship's compass shows a slightly different reading than expected when they check it against their GPS coordinates for true north.",
      question: "Why might a compass not point exactly toward true geographic north?",
      options: [
        { id: 'a', label: "The compass is defective and needs to be replaced" },
        { id: 'b', label: "GPS satellites are more accurate than magnetic instruments" },
        { id: 'c', label: "Magnetic north and true geographic north are at different locations, creating magnetic declination", correct: true },
        { id: 'd', label: "Ocean water interferes with magnetic readings" }
      ],
      explanation: "Earth's magnetic north pole is not at the same location as the geographic North Pole. This angular difference between magnetic north and true north is called magnetic declination (or variation). The declination varies by location and changes slowly over time as the magnetic poles drift. Navigators must account for this offset to plot accurate courses."
    },
    // 3. Magnetic declination (Medium)
    {
      scenario: "A surveyor in eastern Canada finds that their compass points about 20 degrees west of true north, while a colleague in the western United States reports their compass points about 15 degrees east of true north.",
      question: "What explains these opposite declination values in different locations?",
      options: [
        { id: 'a', label: "Different compass manufacturers calibrate their instruments differently" },
        { id: 'b', label: "The magnetic north pole is located in the Canadian Arctic, creating varying angular offsets across North America", correct: true },
        { id: 'c', label: "The Rocky Mountains contain more magnetic rocks than the Appalachians" },
        { id: 'd', label: "Eastern Canada is closer to the Atlantic Ocean which affects magnetism" }
      ],
      explanation: "Since the magnetic north pole is located in the Canadian Arctic (not at the geographic pole), observers at different longitudes see the magnetic pole at different angles relative to true north. From eastern Canada, the magnetic pole lies to the west of true north, causing westward declination. From the western US, the magnetic pole lies to the east of true north, causing eastward declination. This pattern creates an agonic line where declination is zero."
    },
    // 4. Magnetic anomaly detection (Medium)
    {
      scenario: "A geology team conducting a ground survey notices their magnetometer readings spike significantly when passing over certain areas, even though the surface appears uniform.",
      question: "What is the most likely cause of these localized magnetic anomalies?",
      options: [
        { id: 'a', label: "Underground water sources create magnetic disturbances" },
        { id: 'b', label: "Subsurface deposits of iron-bearing minerals or ore bodies distort the local magnetic field", correct: true },
        { id: 'c', label: "Ancient tree roots left magnetic imprints in the soil" },
        { id: 'd', label: "Solar radiation penetrates deeper in certain spots" }
      ],
      explanation: "Magnetic anomalies occur when subsurface materials have different magnetic properties than surrounding rock. Iron ore deposits, volcanic intrusions, and certain metamorphic rocks can be magnetized and create local field disturbances detectable at the surface. This principle underlies magnetic surveys used for mineral exploration, archaeological investigations, and detecting buried structures or unexploded ordnance."
    },
    // 5. Indoor positioning using magnetics (Medium-Hard)
    {
      scenario: "A smartphone app claims to provide indoor navigation in large buildings where GPS signals cannot penetrate. The developers explain they use the building's magnetic fingerprint.",
      question: "How can magnetic fields enable indoor positioning without GPS?",
      options: [
        { id: 'a', label: "Buildings generate their own magnetic fields from electrical wiring" },
        { id: 'b', label: "Steel structural elements distort Earth's magnetic field uniquely at each location, creating a mappable signature", correct: true },
        { id: 'c', label: "Smartphones emit magnetic signals that bounce off walls" },
        { id: 'd', label: "Indoor lights create magnetic patterns the phone can detect" }
      ],
      explanation: "Modern buildings contain steel beams, reinforcement bars, and other ferromagnetic materials that distort Earth's ambient magnetic field in complex but consistent patterns. By pre-mapping these distortions throughout a building, a database of magnetic fingerprints can be created. A smartphone's magnetometer can then match its current readings against this database to determine indoor position with reasonable accuracy."
    },
    // 6. Geomagnetic surveys (Hard)
    {
      scenario: "An oil exploration company flies a specially equipped aircraft in a grid pattern over a remote region. The aircraft trails a sensor package on a long cable behind it.",
      question: "Why is the magnetic sensor towed far behind the aircraft rather than mounted directly on it?",
      options: [
        { id: 'a', label: "The cable allows the sensor to get closer to the ground for better readings" },
        { id: 'b', label: "The aircraft's metal components and electrical systems would interfere with sensitive magnetic measurements", correct: true },
        { id: 'c', label: "Air turbulence is smoother behind the aircraft" },
        { id: 'd', label: "The cable acts as an antenna to boost signal strength" }
      ],
      explanation: "Aircraft contain numerous magnetic noise sources: engines, avionics, structural steel, and electrical systems all create magnetic fields that would contaminate precise geomagnetic measurements. By towing the magnetometer 50-150 meters behind the aircraft on a cable, these interference sources are far enough away that their effects diminish to negligible levels, allowing accurate measurement of subtle geological magnetic anomalies below."
    },
    // 7. Paleomagnetism (Hard)
    {
      scenario: "Geologists studying ancient lava flows on different continents discovered that the magnetic minerals in these rocks point in unexpected directions - some even appear to show the magnetic pole was once in the southern hemisphere.",
      question: "What does this evidence of magnetic pole reversals tell us about Earth's magnetic field history?",
      options: [
        { id: 'a', label: "The continents have physically rotated 180 degrees over time" },
        { id: 'b', label: "Earth's magnetic field periodically reverses polarity, with the north and south magnetic poles swapping positions", correct: true },
        { id: 'c', label: "Ancient volcanic eruptions were more powerful and magnetized rocks differently" },
        { id: 'd', label: "The measurement techniques cannot be trusted for rocks older than 1 million years" }
      ],
      explanation: "When lava cools, iron-bearing minerals align with and record the ambient magnetic field direction. Studying these frozen magnetic signatures reveals that Earth's magnetic field has reversed polarity hundreds of times throughout geologic history, with the most recent reversal occurring about 780,000 years ago. These reversals happen irregularly, taking thousands of years to complete, and leave a distinctive pattern that helps date rock formations worldwide."
    },
    // 8. Magnetic navigation in animals (Hard)
    {
      scenario: "Researchers discovered that migratory birds become disoriented when exposed to artificial magnetic fields during their journey, but only during cloudy nights when they cannot see the stars.",
      question: "What does this suggest about how these birds navigate during migration?",
      options: [
        { id: 'a', label: "Birds primarily navigate by wind direction and only use magnetism as a backup" },
        { id: 'b', label: "Birds use multiple navigation systems including magnetic sensing, with magnetoreception being essential when celestial cues are unavailable", correct: true },
        { id: 'c', label: "The artificial fields caused physical pain that distracted the birds" },
        { id: 'd', label: "Birds can only sense magnetic fields when it is dark outside" }
      ],
      explanation: "Many migratory animals possess magnetoreception - the ability to sense Earth's magnetic field. Research suggests birds may use specialized proteins (cryptochromes) in their eyes or magnetite crystals in their beaks. This magnetic sense works alongside other navigation systems including sun compass, star patterns, and landmarks. When one system is unavailable (like stars on cloudy nights), birds rely more heavily on magnetic navigation, making them vulnerable to artificial field disruption."
    },
    // 9. Magnetometer technology (Hard)
    {
      scenario: "A quantum physicist explains that modern smartphones contain magnetometers sensitive enough to detect the magnetic field of a refrigerator magnet from several meters away, yet these sensors fit on a tiny chip.",
      question: "What technology enables such sensitive magnetic field detection in miniature smartphone sensors?",
      options: [
        { id: 'a', label: "Tiny spinning compass needles suspended in oil" },
        { id: 'b', label: "Hall effect or magnetoresistive sensors that detect how magnetic fields affect electrical current flow in semiconductors", correct: true },
        { id: 'c', label: "Miniaturized superconducting coils cooled by the phone's processor" },
        { id: 'd', label: "Piezoelectric crystals that vibrate in response to magnetic fields" }
      ],
      explanation: "Smartphone magnetometers typically use Hall effect sensors or anisotropic/giant magnetoresistive (AMR/GMR) technology. Hall sensors detect the voltage generated when a magnetic field deflects moving charges in a semiconductor. Magnetoresistive sensors measure how magnetic fields change the electrical resistance of thin films. Both technologies can be manufactured using standard semiconductor processes, enabling extremely small, low-power sensors with sufficient sensitivity for compass and indoor positioning applications."
    },
    // 10. Magnetic interference sources (Hard)
    {
      scenario: "An engineer troubleshooting a malfunctioning industrial robot discovers the robot's position sensors give erratic readings whenever a nearby conveyor belt motor starts up.",
      question: "What is causing the magnetic interference with the robot's sensors, and how might it be mitigated?",
      options: [
        { id: 'a', label: "The motor vibrations shake the sensors; adding rubber dampening would help" },
        { id: 'b', label: "Electric motors generate strong alternating magnetic fields that overwhelm nearby sensors; magnetic shielding or distance can reduce interference", correct: true },
        { id: 'c', label: "The conveyor belt is made of magnetic material that confuses the sensors" },
        { id: 'd', label: "Power surges when the motor starts affect the sensor's electrical supply" }
      ],
      explanation: "Electric motors contain spinning electromagnets that generate powerful, fluctuating magnetic fields extending well beyond the motor housing. These fields can induce currents in nearby sensors or directly interfere with magnetometer readings. Mitigation strategies include increasing distance from interference sources, using mu-metal or other high-permeability shielding around sensitive sensors, implementing software filtering to reject known interference frequencies, or selecting sensor technologies less susceptible to external fields."
    }
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '999px', marginBottom: '32px' }}>
              <span style={{ width: '8px', height: '8px', background: '#f87171', borderRadius: '50%' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#f87171', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(135deg, #ffffff, #fecaca, #bfdbfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Discover the Invisible
            </h1>
            <p style={{ fontSize: '18px', color: colors.textMuted, maxWidth: '480px', marginBottom: '16px', lineHeight: '1.7' }}>
              What happens when you place a compass near a magnet? Explore how to map forces we cannot see!
            </p>
            <p style={{ fontSize: '16px', color: colors.textSecondary, maxWidth: '480px', marginBottom: '40px', lineHeight: '1.6' }}>
              Let&apos;s begin by discovering the hidden architecture of magnetic fields.
            </p>
            <div style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.8))', borderRadius: '24px', padding: '32px', maxWidth: '560px', width: '100%', border: '1px solid rgba(100,116,139,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(239,68,68,0.05), transparent, rgba(59,130,246,0.05))', borderRadius: '24px' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>🧲</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, lineHeight: '1.5' }}>
                    Magnetic fields are invisible, yet we can map them perfectly!
                  </p>
                  <p style={{ fontSize: '16px', color: colors.textMuted, lineHeight: '1.7' }}>
                    Scientists have known their shapes for centuries — long before modern instruments. First, how do you think field lines are shaped?
                  </p>
                  <p style={{ fontSize: '15px', color: '#f87171', fontWeight: 700 }}>
                    🔍 Iron filings and tiny compasses reveal the hidden architecture!
                  </p>
                </div>
              </div>
            </div>
            <button
              onPointerDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
              style={{ marginTop: '32px', padding: '16px 40px', background: 'linear-gradient(135deg, #ef4444, #3b82f6)', color: 'white', borderRadius: '16px', fontWeight: 700, fontSize: '18px', border: 'none', cursor: 'pointer', minHeight: '56px', transition: 'all 0.3s ease-out', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}
            >
              Start Exploring — Make a Prediction
            </button>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // Static SVG for predict phase
  const renderPredictSVG = () => (
    <svg viewBox="0 0 400 200" className="w-full h-48" style={{ maxWidth: '400px' }}>
      <defs>
        <linearGradient id="predictNorth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="predictSouth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="#0f172a" />
      {/* Bar magnet */}
      <rect x="150" y="85" width="50" height="30" rx="3" fill="url(#predictNorth)" />
      <rect x="200" y="85" width="50" height="30" rx="3" fill="url(#predictSouth)" />
      <text x="175" y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
      <text x="225" y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
      {/* Question marks around magnet */}
      <text x="100" y="100" fill="#94a3b8" fontSize="24">?</text>
      <text x="300" y="100" fill="#94a3b8" fontSize="24">?</text>
      <text x="200" y="40" fill="#94a3b8" fontSize="24" textAnchor="middle">?</text>
      <text x="200" y="170" fill="#94a3b8" fontSize="24" textAnchor="middle">?</text>
      <text x="200" y="185" fill="#64748b" fontSize="11" textAnchor="middle">What pattern will iron filings form?</text>
    </svg>
  );

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
            <h2 className="font-bold text-white mb-4" style={{ fontSize: typo.heading }}>Make Your Prediction</h2>

            {/* Static SVG visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-md mb-6">
              {renderPredictSVG()}
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl mb-6">
              <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary }} className="mb-4">
                If you sprinkle iron filings around a bar magnet, what pattern will they form?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Random scattered pattern' },
                { id: 'B', text: 'Curved lines from N to S pole' },
                { id: 'C', text: 'A perfect circle around the magnet' },
                { id: 'D', text: 'Straight parallel lines' }
              ].map(option => (
                <button
                  key={option.id}
                  onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  style={{ minHeight: '44px' }}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showPredictionFeedback && selectedPrediction === option.id
                      ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                  }`}
                >
                  <span className="font-bold text-white">{option.id}.</span>
                  <span style={{ color: colors.textSecondary }} className="ml-2">{option.text}</span>
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
                <p className="text-emerald-400 font-semibold">
                  Correct! Iron filings align along curved field lines from North to South!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-white mb-3" style={{ fontSize: typo.heading }}>Magnetic Field Mapper</h2>

            {/* Educational Explanation */}
            <div style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.3), rgba(88,28,135,0.3))', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%', maxWidth: '672px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: colors.accent }}>What you're seeing:</strong> This visualization shows the invisible magnetic field around a bar magnet. Field lines emerge from the North pole and curve around to the South pole. Watch how the field strength decreases rapidly with distance.
              </p>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.secondary }}>Cause and Effect:</strong> When you increase magnet strength, field lines become denser and the field extends farther. Moving the probe closer to the magnet shows dramatically higher field strength (B) because magnetic fields follow the inverse cube law - doubling the distance reduces field strength by 8×.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              maxWidth: '672px',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '16px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {/* Interactive Visualization */}
                <div className="bg-slate-800/50 rounded-2xl p-4 w-full" style={{ maxHeight: '50vh', overflow: 'hidden' }}>
                  {renderMagneticField(magnets, showFieldLines, showCompassGrid, true)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Control Panel */}
                <div className="bg-slate-800/60 rounded-2xl p-4 w-full">
                  <h3 className="text-lg font-bold text-white mb-4">Interactive Controls</h3>

                  {/* Magnet Strength Slider */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label style={{ color: colors.textSecondary }} className="text-sm font-medium">Magnet Strength</label>
                      <span className="text-cyan-400 text-sm font-bold">{magnetStrength}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={magnetStrength}
                      onChange={(e) => setMagnetStrength(Number(e.target.value))}
                      className="w-full rounded-lg appearance-none cursor-pointer"
                      style={{ zIndex: 10, touchAction: 'pan-y', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%', height: '20px', accentColor: '#3b82f6' }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: colors.textSecondary }}>
                      <span>Weak</span>
                      <span>Strong</span>
                    </div>
                  </div>

                  {/* Distance from Magnet Slider */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label style={{ color: colors.textSecondary }} className="text-sm font-medium">Probe Distance</label>
                      <span className="text-cyan-400 text-sm font-bold">{probeDistance.toFixed(0)} px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="150"
                      value={probeDistance}
                      onChange={(e) => setProbeDistance(Number(e.target.value))}
                      className="w-full rounded-lg appearance-none cursor-pointer"
                      style={{ zIndex: 10, touchAction: 'pan-y', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%', height: '20px', accentColor: '#3b82f6' }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: colors.textSecondary }}>
                      <span>Close</span>
                      <span>Far</span>
                    </div>
                  </div>

                  {/* Field Strength Display */}
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span style={{ color: colors.textSecondary }} className="text-sm">Field at Probe (B):</span>
                      <span className="text-yellow-400 font-bold">{fieldStrengthAtProbe.toFixed(2)} units</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      B = mu_0 * m / (4 * pi * r^3) - Dipole field equation
                    </div>
                  </div>

                  {/* Visualization Toggle Buttons */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <button
                      onClick={() => setShowFieldLines(!showFieldLines)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${showFieldLines ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                    >
                      Field Lines
                    </button>
                    <button
                      onClick={() => setShowCompassGrid(!showCompassGrid)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${showCompassGrid ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                    >
                      Compass Grid
                    </button>
                    <button
                      onClick={() => setShowHeatMap(!showHeatMap)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${showHeatMap ? 'bg-orange-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                    >
                      Heat Map
                    </button>
                    <button
                      onClick={() => addMagnet()}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-slate-600 text-slate-300 hover:bg-slate-500 disabled:opacity-50"
                      disabled={magnets.length >= 3}
                    >
                      + Add Magnet
                    </button>
                  </div>

                  {/* Magnet Controls when selected */}
                  {selectedMagnet !== null && (
                    <div className="flex justify-center gap-3 mb-4 flex-wrap">
                      <button
                        onClick={() => rotateMagnet(selectedMagnet, -30)}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-all"
                      >
                        Rotate Left
                      </button>
                      <button
                        onClick={() => rotateMagnet(selectedMagnet, 30)}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-all"
                      >
                        Rotate Right
                      </button>
                      <button
                        onClick={() => { setMagnets(prev => prev.filter((_, i) => i !== selectedMagnet)); setSelectedMagnet(null); }}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison panel: before vs after */}
            <div style={{ maxWidth: '672px', width: '100%', marginBottom: '16px' }}>
              <h4 style={{ color: '#22d3ee', fontWeight: 700, marginBottom: '8px' }}>Compare: Weak vs Strong Field</h4>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                <div style={{ flex: 1, background: 'rgba(30,58,138,0.4)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: '4px' }}>Before: Weak Magnet</div>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>Field lines sparse, low density near poles. Baseline reference field strength ~0.2 units at 100px.</p>
                </div>
                <div style={{ flex: 1, background: 'rgba(127,29,29,0.4)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ color: '#fca5a5', fontWeight: 700, marginBottom: '4px' }}>After: Strong Magnet</div>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>Field lines dense, high intensity near poles. Field strength increases 8× relative multiplier when distance halved.</p>
                </div>
              </div>
            </div>

            {/* Real-world relevance panel */}
            <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-4 border border-blue-500/30">
              <h4 className="text-cyan-400 font-bold mb-2">Real-World Application</h4>
              <p style={{ color: colors.textSecondary }} className="text-sm">
                <strong className="text-white">MRI machines</strong> use precisely mapped magnetic fields to create detailed images of the human body.
                Understanding field patterns is essential for medical imaging, compass navigation, and designing electric motors.
              </p>
            </div>

            {/* Info Panel */}
            <div className="bg-gradient-to-r from-red-900/40 to-blue-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
              <p style={{ color: colors.textSecondary }} className="text-center text-sm">
                <strong className="text-white">Drag the compass probe</strong> to measure field strength at different points.
                Field lines show direction (N to S) and density indicates strength.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-white mb-4" style={{ fontSize: typo.heading }}>Reading Magnetic Field Maps</h2>

            {/* Reference user's prediction - always shown */}
            <div className="bg-emerald-900/30 rounded-xl p-4 max-w-2xl w-full mb-6 border border-emerald-500/50">
              <p style={{ color: colors.textSecondary }}>
                {selectedPrediction
                  ? <><strong className="text-emerald-400">Your prediction was correct!</strong> You predicted that iron filings form curved lines from N to S pole. Now let&apos;s understand why this pattern appears.</>
                  : <><strong className="text-emerald-400">Review your observation:</strong> You observed that iron filings form curved lines from N to S pole. Let&apos;s understand why this happens.</>
                }
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl space-y-4">
              <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
                <h3 className="text-blue-400 font-bold mb-2">Field Line Rules</h3>
                <ul style={{ color: colors.textSecondary }} className="space-y-1">
                  <li>Lines point from <span className="text-red-400">N</span> to <span className="text-blue-400">S</span> outside the magnet</li>
                  <li>Lines <span className="text-yellow-400">never cross</span> (each point has one direction)</li>
                  <li>Closer lines = <span className="text-green-400">stronger field</span></li>
                  <li>Lines form <span className="text-purple-400">closed loops</span> (continue inside magnet)</li>
                </ul>
              </div>
              {/* Before/After Comparison */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                <div style={{ flex: 1, padding: '16px', background: 'rgba(51,65,85,0.5)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧲</div>
                  <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '4px' }}>Before: Iron Filings</h4>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>Each filing becomes a tiny magnet and aligns with local field</p>
                </div>
                <div style={{ flex: 1, padding: '16px', background: 'rgba(51,65,85,0.5)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧭</div>
                  <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '4px' }}>After: Compass Array</h4>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>Each compass needle points along the field direction</p>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300">
                  <strong>Key Insight:</strong> Field lines are a visualization tool, not real physical objects.
                  But the patterns they reveal are real and predictable!
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // Static SVG for twist_predict phase - Earth's magnetic field
  const renderTwistPredictSVG = () => (
    <svg viewBox="0 0 400 200" className="w-full h-48" style={{ maxWidth: '400px' }}>
      <defs>
        <radialGradient id="twistEarthGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="70%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="#020617" />
      {/* Stars */}
      {[...Array(15)].map((_, i) => (
        <circle key={i} cx={30 + i * 25} cy={20 + (i % 3) * 60} r="1" fill="white" opacity="0.6" />
      ))}
      {/* Earth */}
      <circle cx="200" cy="100" r="50" fill="url(#twistEarthGrad)" />
      {/* Continents hint */}
      <ellipse cx="200" cy="100" rx="50" ry="18" fill="#22c55e" fillOpacity="0.4" />
      {/* Compass */}
      <circle cx="320" cy="100" r="25" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
      <line x1="320" y1="80" x2="310" y2="100" stroke="#ef4444" strokeWidth="3" />
      <line x1="320" y1="120" x2="330" y2="100" stroke="#3b82f6" strokeWidth="3" />
      <circle cx="320" cy="100" r="3" fill="#fbbf24" />
      {/* Question arrow */}
      <text x="270" y="100" fill="#fbbf24" fontSize="20">?</text>
      <text x="200" y="180" fill="#64748b" fontSize="11" textAnchor="middle">Where does the compass point?</text>
    </svg>
  );

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
            <h2 className="font-bold text-amber-400 mb-4" style={{ fontSize: typo.heading }}>The Earth Question</h2>

            {/* Static SVG visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-md mb-6">
              {renderTwistPredictSVG()}
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl mb-6">
              <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary }} className="mb-4">
                Earth has a magnetic field that compasses detect. Which way does a compass needle point?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Toward true geographic north' },
                { id: 'B', text: 'Toward magnetic north (slightly different!)' },
                { id: 'C', text: 'Toward the sun' },
                { id: 'D', text: 'Random direction based on location' }
              ].map(option => (
                <button
                  key={option.id}
                  onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  style={{ minHeight: '44px' }}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showTwistFeedback && twistPrediction === option.id
                      ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                  }`}
                >
                  <span className="font-bold text-white">{option.id}.</span>
                  <span style={{ color: colors.textSecondary }} className="ml-2">{option.text}</span>
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
                <p className="text-emerald-400 font-semibold">
                  Correct! Compasses point to magnetic north, which differs from geographic north!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-amber-400 mb-3" style={{ fontSize: typo.heading }}>Advanced Magnetic Fields</h2>

            {/* Educational Explanation */}
            <div style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.3), rgba(88,28,135,0.3))', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%', maxWidth: '672px', border: '1px solid rgba(245,158,11,0.3)' }}>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: '#f59e0b' }}>What you&apos;re seeing:</strong> These advanced visualizations show how multiple magnetic sources interact. Field lines from different magnets combine through superposition - they add together at every point in space.
              </p>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.secondary }}>Cause and Effect:</strong> When you change magnet polarity, current strength, or Earth&apos;s field intensity, watch how the combined field pattern transforms. Attracting poles create connected field bridges while repelling poles create null zones between them.
              </p>
            </div>

            {/* Mode Selection Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              <button
                onClick={() => setTwistMode('two_magnets')}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${twistMode === 'two_magnets' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
              >
                Two Magnets
              </button>
              <button
                onClick={() => setTwistMode('earth')}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${twistMode === 'earth' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
              >
                Earth&apos;s Field
              </button>
              <button
                onClick={() => setTwistMode('electromagnet')}
                style={{ zIndex: 10, minHeight: '44px' }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${twistMode === 'electromagnet' ? 'bg-yellow-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
              >
                Electromagnet
              </button>
            </div>

            {/* Two Magnets Mode */}
            {twistMode === 'two_magnets' && (
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                maxWidth: '672px',
                alignItems: isMobile ? 'center' : 'flex-start',
                marginBottom: '16px',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div className="bg-slate-800/50 rounded-2xl p-4 w-full">
                    <h3 className="text-lg font-bold text-white mb-3 text-center">Magnet Interaction</h3>
                    {renderTwoMagnetField()}
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Polarity Control */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-300 text-sm font-medium">Second Magnet Orientation:</span>
                    </div>
                    <div className="flex gap-3 justify-center flex-col">
                      <button
                        onClick={() => setSecondMagnetPolarity('attract')}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className={`px-6 py-3 rounded-lg font-bold transition-all ${secondMagnetPolarity === 'attract' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                      >
                        Attract (N-S)
                      </button>
                      <button
                        onClick={() => setSecondMagnetPolarity('repel')}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className={`px-6 py-3 rounded-lg font-bold transition-all ${secondMagnetPolarity === 'repel' ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                      >
                        Repel (N-N)
                      </button>
                    </div>
                    <p className="text-slate-400 text-sm text-center mt-3">
                      {secondMagnetPolarity === 'attract'
                        ? 'Field lines connect between opposite poles - attraction!'
                        : 'Field lines push apart between like poles - repulsion!'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Earth's Field Mode */}
            {twistMode === 'earth' && (
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                maxWidth: '672px',
                alignItems: isMobile ? 'center' : 'flex-start',
                marginBottom: '16px',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div className="bg-slate-800/50 rounded-2xl p-4 w-full">
                    <h3 className="text-lg font-bold text-white mb-3 text-center">Earth&apos;s Magnetic Field</h3>
                    {renderEarthField()}
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Earth Field Controls */}
                  <div className="space-y-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setShowEarthField(!showEarthField)}
                        style={{ zIndex: 10, minHeight: '44px' }}
                        className={`px-6 py-3 rounded-lg font-bold transition-all ${showEarthField ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                      >
                        {showEarthField ? 'Hide Field Lines' : 'Show Field Lines'}
                      </button>
                    </div>

                    {/* Intensity Slider */}
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-slate-300 text-sm font-medium">Field Intensity</label>
                        <span className="text-cyan-400 text-sm font-bold">{earthFieldIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={earthFieldIntensity}
                        onChange={(e) => setEarthFieldIntensity(Number(e.target.value))}
                        className="w-full rounded-lg appearance-none cursor-pointer"
                        style={{ zIndex: 10, touchAction: 'pan-y', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%', height: '20px', accentColor: '#3b82f6' }}
                      />
                      <p className="text-slate-500 text-xs mt-2 text-center">
                        Earth&apos;s field varies from ~25 uT (equator) to ~65 uT (poles)
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-300 text-center text-sm">
                        Earth acts like a giant bar magnet! Magnetic poles are
                        <span className="text-yellow-400 font-bold"> offset from geographic poles</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Electromagnet Mode */}
            {twistMode === 'electromagnet' && (
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                maxWidth: '672px',
                alignItems: isMobile ? 'center' : 'flex-start',
                marginBottom: '16px',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div className="bg-slate-800/50 rounded-2xl p-4 w-full">
                    <h3 className="text-lg font-bold text-white mb-3 text-center">Electromagnet</h3>
                    {renderElectromagnet()}
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Current Control */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-slate-300 text-sm font-medium">Electric Current</label>
                      <span className="text-yellow-400 text-sm font-bold">{electromagnetCurrent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={electromagnetCurrent}
                      onChange={(e) => setElectromagnetCurrent(Number(e.target.value))}
                      className="w-full rounded-lg appearance-none cursor-pointer"
                      style={{ zIndex: 10, touchAction: 'pan-y', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%', height: '20px', accentColor: '#3b82f6' }}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Off</span>
                      <span>Maximum</span>
                    </div>
                  </div>

                  {/* Quick Controls */}
                  <div className="flex flex-col gap-3 mt-4">
                    <button
                      onClick={() => setElectromagnetCurrent(0)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-all"
                    >
                      Turn Off
                    </button>
                    <button
                      onClick={() => setElectromagnetCurrent(50)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-all"
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => setElectromagnetCurrent(100)}
                      style={{ zIndex: 10, minHeight: '44px' }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-all"
                    >
                      Maximum
                    </button>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-3 mt-4">
                    <p className="text-slate-300 text-center text-sm">
                      <strong className="text-yellow-400">Key Principle:</strong> Magnetic field strength (B) is
                      proportional to current (I). No current = no magnetism!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-amber-400 mb-4" style={{ fontSize: typo.heading }}>Earth&apos;s Magnetic Shield</h2>

            {/* Reference user's twist prediction */}
            {twistPrediction && (
              <div className="bg-emerald-900/30 rounded-xl p-4 max-w-2xl w-full mb-6 border border-emerald-500/50">
                <p style={{ color: colors.textSecondary }}>
                  <strong className="text-emerald-400">Your prediction was correct!</strong> Compasses point to magnetic north,
                  not true geographic north. Now let&apos;s understand why this difference exists.
                </p>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl space-y-4">
              <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
                <h3 className="text-green-400 font-bold mb-2">The Geodynamo</h3>
                <p style={{ color: colors.textSecondary }}>
                  Earth&apos;s magnetic field is generated by <span className="text-yellow-400 font-bold">
                  convecting molten iron</span> in the outer core. This &quot;geodynamo&quot; creates
                  a field that shields us from solar wind!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">Magnetic Declination</h4>
                  <p style={{ color: colors.textSecondary }} className="text-sm">
                    The angle between magnetic north and true north.
                    Varies by location (can be 20+ degrees in some places!).
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-purple-400 font-bold mb-2">Field Strength</h4>
                  <p style={{ color: colors.textSecondary }} className="text-sm">
                    25-65 microtesla. About 100x weaker than
                    a refrigerator magnet, but enough for compasses!
                  </p>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300 text-sm">
                  <strong>Fun Fact:</strong> Earth&apos;s magnetic poles flip every few hundred thousand years!
                  We&apos;re currently in a long-running &quot;normal&quot; period, but the field is slowly weakening.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Magnetic Mapping"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-white mb-4" style={{ fontSize: typo.heading }}>Real-World Applications</h2>
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {TRANSFER_APPS.map((app, index) => (
                <button
                  key={index}
                  onPointerDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  style={{ minHeight: '44px' }}
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
            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
                  <p style={{ fontSize: typo.small, color: colors.textMuted }}>{TRANSFER_APPS[activeAppTab].tagline}</p>
                </div>
              </div>
              <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, lineHeight: '1.7' }} className="mt-4">{TRANSFER_APPS[activeAppTab].description}</p>

              {/* Connection to lesson */}
              {TRANSFER_APPS[activeAppTab].connection && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }}>
                  <p style={{ fontSize: typo.body, color: '#93c5fd', fontWeight: 600, marginBottom: '4px' }}>🔗 Connection to Your Experiment:</p>
                  <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>{TRANSFER_APPS[activeAppTab].connection}</p>
                </div>
              )}

              {/* How it works */}
              {TRANSFER_APPS[activeAppTab].howItWorks && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px' }}>
                  <p style={{ fontSize: typo.body, color: '#6ee7b7', fontWeight: 600, marginBottom: '4px' }}>⚙️ How It Works:</p>
                  <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>{TRANSFER_APPS[activeAppTab].howItWorks}</p>
                </div>
              )}

              {/* Future impact */}
              {TRANSFER_APPS[activeAppTab].futureImpact && (
                <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '12px', fontStyle: 'italic', lineHeight: '1.6' }}>
                  🚀 {TRANSFER_APPS[activeAppTab].futureImpact}
                </p>
              )}

              {/* Stats */}
              {TRANSFER_APPS[activeAppTab].stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  {TRANSFER_APPS[activeAppTab].stats.map((stat: any, i: number) => (
                    <div key={i} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: colors.accent }}>{stat.value}</div>
                      <div style={{ fontSize: '12px', color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Companies */}
              {TRANSFER_APPS[activeAppTab].companies && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: typo.small, color: colors.textMuted, marginBottom: '8px' }}>Key Players:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {TRANSFER_APPS[activeAppTab].companies.map((company: string, i: number) => (
                      <span key={i} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', fontSize: typo.small, color: colors.secondary }}>
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!completedApps.has(activeAppTab) && (
                <button
                  onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                  style={{ minHeight: '48px', padding: '12px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: '20px', width: '100%', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  ✅ Got It — Continue
                </button>
              )}
              {completedApps.has(activeAppTab) && (
                <div className="mt-4 flex items-center gap-2 text-emerald-400 justify-center" style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span style={{ fontWeight: 600 }}>Explored</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span style={{ color: colors.textSecondary }}>Progress:</span>
              <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
              <span style={{ color: colors.textSecondary }}>{completedApps.size}/4</span>
            </div>
            {completedApps.size >= 4 && (
              <div style={{ marginTop: '24px', maxWidth: '672px', width: '100%' }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); goToPhase('test'); }}
                  style={{ width: '100%', padding: '16px 32px', background: 'linear-gradient(135deg, #ef4444, #3b82f6)', color: 'white', borderRadius: '12px', fontWeight: 700, fontSize: '18px', border: 'none', cursor: 'pointer', minHeight: '56px', transition: 'all 0.3s ease', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}
                >
                  🎯 Take the Test
                </button>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgDark }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl mx-auto mt-8 text-center" style={{ maxWidth: '672px' }}>
              <div className="text-6xl mb-4">{testScore >= 7 ? '🎉' : '📚'}</div>
              <h3 className="font-bold text-white mb-2" style={{ fontSize: typo.heading }}>Score: {testScore}/{TEST_QUESTIONS.length}</h3>
              <p style={{ color: colors.textSecondary, lineHeight: '1.6' }} className="mb-6">{testScore >= 7 ? 'Excellent! You understand magnetic field mapping!' : 'Keep studying! Review and try again.'}</p>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', justifyContent: 'center' }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); setCurrentQuestionIndex(0); }}
                  style={{ padding: '12px 24px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '8px', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}
                >
                  🔄 Replay Quiz
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); goToPhase('mastery'); }}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #ef4444, #3b82f6)', borderRadius: '8px', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', minHeight: '44px' }}
                >
                  🏆 Go to Dashboard
                </button>
              </div>
            </div>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mx-auto mt-4" style={{ borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p className="text-white font-medium mb-3">Question {qIndex + 1} of {TEST_QUESTIONS.length}: {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`p-2 rounded mb-1 ${opt.correct ? 'bg-emerald-900/30 text-emerald-400' : userAnswer === oIndex ? 'bg-red-900/30 text-red-400' : ''}`} style={{ color: opt.correct ? '#34d399' : userAnswer === oIndex ? '#f87171' : colors.textSecondary }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQuestion = TEST_QUESTIONS[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="font-bold text-white mb-3" style={{ fontSize: typo.heading }}>Knowledge Assessment</h2>

            {/* Question Progress */}
            <div className="w-full max-w-2xl mb-6">
              <div className="flex justify-between items-center mb-2">
                <span style={{ color: colors.textSecondary }} className="font-medium">
                  Question {currentQuestionIndex + 1} of {TEST_QUESTIONS.length}
                </span>
                <span style={{ color: colors.textSecondary }}>
                  {answeredCount}/{TEST_QUESTIONS.length} answered
                </span>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1 justify-center mb-4">
                {TEST_QUESTIONS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i === currentQuestionIndex ? 'bg-blue-500 scale-125'
                      : testAnswers[i] !== null ? 'bg-emerald-500'
                      : 'bg-slate-600'
                    }`}
                    aria-label={`Go to question ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Current Question */}
            <div className="bg-slate-800/50 rounded-xl p-6 max-w-2xl w-full" style={{ maxWidth: '672px' }}>
              {currentQuestion.scenario && (
                <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic', lineHeight: '1.6' }}>{currentQuestion.scenario}</p>
                </div>
              )}
              <p className="text-white font-medium text-lg mb-4">{currentQuestion.question}</p>
              <div className="grid gap-3">
                {currentQuestion.options.map((option, oIndex) => {
                  const isSelected = testAnswers[currentQuestionIndex] === oIndex;
                  const isCorrect = option.correct;
                  const showFeedback = isSelected;
                  return (
                    <button
                      key={oIndex}
                      onPointerDown={(e) => { e.preventDefault(); handleTestAnswer(currentQuestionIndex, oIndex); }}
                      onClick={() => handleTestAnswer(currentQuestionIndex, oIndex)}
                      style={{
                        minHeight: '44px',
                        border: showFeedback ? (isCorrect ? '2px solid #10b981' : '2px solid #ef4444') : '2px solid transparent',
                        background: showFeedback ? (isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(51, 65, 85, 0.5)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      }}
                      className="p-4 rounded-lg text-left transition-all hover:bg-slate-600/50"
                    >
                      <span style={{ color: showFeedback ? (isCorrect ? '#34d399' : '#f87171') : colors.textSecondary }}>
                        {showFeedback ? (isCorrect ? '✓ ' : '✗ ') : ''}{option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  style={{ minHeight: '44px' }}
                  className={`px-4 py-2 rounded-lg font-medium ${currentQuestionIndex === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
                >
                  Previous
                </button>
                {currentQuestionIndex < TEST_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    style={{ minHeight: '44px' }}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onPointerDown={(e) => { e.preventDefault(); submitTest(); }}
                    disabled={testAnswers.includes(null)}
                    style={{ minHeight: '44px' }}
                    className={`px-6 py-2 rounded-lg font-semibold ${testAnswers.includes(null) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-blue-600 text-white'}`}
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            </div>

            {/* All Questions Overview */}
            <div className="mt-6 max-w-2xl w-full">
              <details className="bg-slate-800/30 rounded-lg">
                <summary style={{ color: colors.textSecondary }} className="cursor-pointer p-3 font-medium">View All Questions</summary>
                <div className="p-4 space-y-4">
                  {TEST_QUESTIONS.map((q, qIndex) => (
                    <div key={qIndex} className="bg-slate-800/50 rounded-lg p-3">
                      <button
                        onClick={() => setCurrentQuestionIndex(qIndex)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${testAnswers[qIndex] !== null ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                            {qIndex + 1}
                          </span>
                          <span style={{ color: colors.textSecondary }} className="text-sm">{q.question}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontWeight: 400, lineHeight: '1.6', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
            <div className="bg-gradient-to-br from-red-900/50 via-purple-900/50 to-blue-900/50 rounded-3xl p-8 max-w-2xl">
              <div className="text-8xl mb-6">🧲</div>
              <h1 className="text-3xl font-bold text-white mb-4">Magnetic Mapping Master!</h1>
              <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered magnetic field visualization!</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🧭</div><p className="text-sm text-slate-300">Field Lines N to S</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Density = Strength</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌍</div><p className="text-sm text-slate-300">Earth&apos;s Geodynamo</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔬</div><p className="text-sm text-slate-300">Lines Never Cross</p></div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default MagneticMappingRenderer;
