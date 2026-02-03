'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Thin Film Interference - Complete 10-Phase Game
// Teaching interference patterns in thin films like soap bubbles
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ThinFilmInterferenceRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "You're observing a soap bubble floating in sunlight. As you watch, the colors on its surface constantly shift and swirl, even though nothing seems to be touching it.",
    question: "What causes the colors in a soap bubble?",
    options: [
      { id: 'a', label: "A) Pigments dissolved in the soap solution", correct: false },
      { id: 'b', label: "B) Interference between light reflecting from the front and back surfaces of the thin film", correct: true },
      { id: 'c', label: "C) Refraction splitting white light into colors like a prism", correct: false },
      { id: 'd', label: "D) Fluorescence from soap molecules absorbing UV light", correct: false }
    ],
    explanation: "The colors arise from thin-film interference. Light reflects from both the outer and inner surfaces of the soap film. These two reflections travel slightly different paths and interfere constructively or destructively depending on the film thickness and wavelength."
  },
  {
    scenario: "A soap film is held vertically in a frame. Over time, you notice the top of the film becomes darker and eventually appears completely black, even though the rest still shows vivid colors.",
    question: "When a soap film appears black (no color), it means:",
    options: [
      { id: 'a', label: "A) The film has absorbed all incident light", correct: false },
      { id: 'b', label: "B) The film is too thick for interference effects", correct: false },
      { id: 'c', label: "C) The film is extremely thin - reflections destructively interfere for all visible wavelengths", correct: true },
      { id: 'd', label: "D) The soap molecules have evaporated completely", correct: false }
    ],
    explanation: "When the film becomes very thin (less than about 25nm), the path difference becomes negligible. Combined with the phase shift from reflection, this causes destructive interference for all visible wavelengths, making the film appear black just before it pops."
  },
  {
    scenario: "You watch a vertical soap film drain under gravity. The colors at any particular spot don't stay constant - they change progressively through a sequence.",
    question: "As a soap film drains and becomes thinner, the colors:",
    options: [
      { id: 'a', label: "A) Stay the same since the soap composition is unchanged", correct: false },
      { id: 'b', label: "B) Shift through a sequence as different wavelengths constructively interfere", correct: true },
      { id: 'c', label: "C) Always become more blue because shorter wavelengths dominate", correct: false },
      { id: 'd', label: "D) Fade uniformly to white", correct: false }
    ],
    explanation: "As thickness changes, the path difference changes, shifting which wavelengths experience constructive interference. A given spot cycles through the visible spectrum - typically from silver/white to yellow, magenta, blue, and eventually black."
  },
  {
    scenario: "An optics student sets up an experiment to measure thin-film interference. They find that tilting the film changes the observed color even though thickness hasn't changed.",
    question: "The path difference for thin-film interference depends on:",
    options: [
      { id: 'a', label: "A) Film thickness and refractive index only", correct: false },
      { id: 'b', label: "B) Film thickness, refractive index, and viewing angle", correct: true },
      { id: 'c', label: "C) Only the color of incident light", correct: false },
      { id: 'd', label: "D) Only the viewing angle", correct: false }
    ],
    explanation: "The path difference formula is 2nt·cos(θ), where n is refractive index, t is thickness, and θ is the angle of refraction inside the film. Changing viewing angle changes cos(θ), affecting which wavelengths constructively interfere."
  },
  {
    scenario: "A camera manufacturer applies thin anti-reflection coatings to their lenses. Each lens element can have 4% reflection per surface without coating, but less than 0.2% with coating.",
    question: "Anti-reflection coatings work by:",
    options: [
      { id: 'a', label: "A) Absorbing reflected light through molecular vibration", correct: false },
      { id: 'b', label: "B) Making reflections from the coating surfaces destructively interfere", correct: true },
      { id: 'c', label: "C) Bending light around the surface using gradient index", correct: false },
      { id: 'd', label: "D) Scattering light in all directions to reduce specular reflection", correct: false }
    ],
    explanation: "A quarter-wavelength coating creates a 180° phase shift between reflections from its top and bottom surfaces. With the additional phase shift from the refractive index boundary, the reflections cancel out through destructive interference."
  },
  {
    scenario: "Morpho butterfly wings display brilliant iridescent blue that seems to glow. When you crush the wing, the blue color disappears, revealing the brown pigment underneath.",
    question: "Why do butterfly wing colors change with viewing angle?",
    options: [
      { id: 'a', label: "A) The pigments are temperature-sensitive and respond to body heat", correct: false },
      { id: 'b', label: "B) The effective optical path difference changes with observation angle", correct: true },
      { id: 'c', label: "C) Light is polarized differently at different angles", correct: false },
      { id: 'd', label: "D) The wing surface acts as a curved mirror", correct: false }
    ],
    explanation: "Structural color arises from nanoscale layers in the wing scales. The path difference 2nt·cos(θ) changes with viewing angle, causing different wavelengths to constructively interfere. This iridescence is a hallmark of thin-film interference effects."
  },
  {
    scenario: "A physics lab demonstration uses a sodium vapor lamp (monochromatic yellow, λ=589nm) to illuminate a soap film. Instead of rainbow colors, the students see alternating bright and dark bands.",
    question: "For constructive interference in a thin film, the path difference should equal:",
    options: [
      { id: 'a', label: "A) Any random fraction of the wavelength", correct: false },
      { id: 'b', label: "B) An integer number of wavelengths (accounting for phase shifts at boundaries)", correct: true },
      { id: 'c', label: "C) Exactly one wavelength only", correct: false },
      { id: 'd', label: "D) Half a wavelength only", correct: false }
    ],
    explanation: "Constructive interference occurs when waves are in phase, requiring the total phase difference (from path length and boundary reflections) to equal a whole number of wavelengths. The dark bands appear where destructive interference occurs (odd half-wavelengths)."
  },
  {
    scenario: "After a rainstorm, you notice rainbow patterns in oil puddles on the parking lot. The patterns swirl and shift as the oil spreads.",
    question: "Oil on water shows rainbow colors because:",
    options: [
      { id: 'a', label: "A) Oil contains colored hydrocarbon molecules", correct: false },
      { id: 'b', label: "B) Water refracts light into a spectrum like a prism", correct: false },
      { id: 'c', label: "C) The thin oil layer creates interference patterns due to reflections from top and bottom surfaces", correct: true },
      { id: 'd', label: "D) Sunlight heats the oil causing it to glow (incandescence)", correct: false }
    ],
    explanation: "Oil films on water are typically 100-1000nm thick - perfect for visible light interference. Different thicknesses across the film create different constructive interference conditions, producing the swirling rainbow patterns."
  },
  {
    scenario: "A photographer puts on polarized sunglasses while shooting a soap bubble. She notices that certain color bands become dimmer while others remain bright.",
    question: "Polarizing sunglasses can affect thin-film colors because:",
    options: [
      { id: 'a', label: "A) They filter out specific wavelengths based on color", correct: false },
      { id: 'b', label: "B) They can reduce glare from partially polarized reflections, altering perceived brightness of some interference bands", correct: true },
      { id: 'c', label: "C) Polarization changes the actual film thickness through stress", correct: false },
      { id: 'd', label: "D) They have their own thin-film coating that interferes", correct: false }
    ],
    explanation: "Reflected light is partially polarized, especially near Brewster's angle. Polarizing filters reduce this reflected component, which can alter the relative intensities of different interference bands without eliminating the colors entirely."
  },
  {
    scenario: "An optical engineer designs a coating to eliminate reflection of green light (λ=550nm) from a display. They test it under white light.",
    question: "A coating designed to eliminate reflection of green light would appear:",
    options: [
      { id: 'a', label: "A) Green, because green light is absorbed", correct: false },
      { id: 'b', label: "B) Purple/magenta, because green is not reflected while red and blue are", correct: true },
      { id: 'c', label: "C) Black, because all reflection is eliminated", correct: false },
      { id: 'd', label: "D) Invisible and perfectly transparent", correct: false }
    ],
    explanation: "A quarter-wavelength coating at 550nm creates destructive interference specifically for green light. Red (~700nm) and blue (~450nm) wavelengths don't match this thickness condition, so they're still reflected, giving the coating a purple/magenta appearance."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📷',
    title: 'Camera Lens Coatings',
    short: 'Eliminating reflections through precise interference',
    tagline: 'Making glass invisible to light',
    description: 'Multi-layer coatings on camera lenses use thin-film interference to reduce reflections from 4% per surface to under 0.2%. Without them, a 15-element lens would lose over 50% of light to reflections.',
    connection: 'This real-world application demonstrates how quarter-wavelength films create destructive interference between surface and interface reflections, canceling the reflected light - the same physics principle you explored.',
    howItWorks: 'Multiple layers of materials with different refractive indices are deposited with nanometer precision. Each layer is tuned to specific wavelengths, together covering the entire visible spectrum.',
    stats: [
      { value: '99.8%', label: 'Light transmission', icon: '✨' },
      { value: '15+', label: 'Coating layers', icon: '📚' },
      { value: '<0.2%', label: 'Reflection per surface', icon: '🎯' }
    ],
    examples: ['Camera lenses', 'Binoculars', 'Microscopes', 'Telescope mirrors'],
    companies: ['Zeiss', 'Canon', 'Nikon', 'Leica'],
    futureImpact: 'Nanostructured moth-eye coatings will achieve perfect anti-reflection across all angles and wavelengths.',
    color: '#3B82F6'
  },
  {
    icon: '🦋',
    title: 'Structural Coloration in Nature',
    short: 'Nature\'s iridescent colors without pigments',
    tagline: 'When physics creates beauty',
    description: 'Morpho butterfly wings display brilliant blue despite having no blue pigment. Nanoscale structures create interference that selectively reflects blue light while absorbing other wavelengths.',
    connection: 'This application connects to our core physics concept - the wing scales contain tree-like nanostructures with spacing tuned to blue wavelengths, demonstrating natural thin-film interference in industry-inspiring ways.',
    howItWorks: 'Regular arrays of chitin ridges create path differences for reflected light. Only blue wavelengths constructively interfere, while others destructively interfere and are absorbed.',
    stats: [
      { value: '200nm', label: 'Structure spacing', icon: '🔬' },
      { value: '70%', label: 'Blue reflection', icon: '🔵' },
      { value: '0', label: 'Blue pigment present', icon: '🎨' }
    ],
    examples: ['Morpho butterflies', 'Peacock feathers', 'Beetle shells', 'Hummingbird throats'],
    companies: ['Qualcomm Mirasol', 'Cypris Materials', 'Sharklet Technologies', 'Bio-inspired research labs'],
    futureImpact: 'Structural color displays will replace LCD/OLED with zero-power, sunlight-readable screens.',
    color: '#8B5CF6'
  },
  {
    icon: '🛢️',
    title: 'Oil Spill Detection & Monitoring',
    short: 'Rainbow colors reveal contamination',
    tagline: 'Physics makes pollution visible',
    description: 'Oil on water creates swirling rainbow patterns because the film thickness varies across its surface. Environmental companies use this interference principle to detect and monitor oil contamination at very low levels.',
    connection: 'This real-world example shows how varying thickness traces contour lines of equal optical path length - the same physics principle that creates colors in soap films.',
    howItWorks: 'Light reflects from both the oil-air and oil-water interfaces. The path difference depends on local thickness, causing constructive interference for wavelengths where thickness equals odd multiples of quarter-wavelength.',
    stats: [
      { value: '100-1000nm', label: 'Oil film thickness', icon: '📏' },
      { value: '1.5', label: 'Oil refractive index', icon: '🔢' },
      { value: 'ppb', label: 'Detection sensitivity', icon: '🌈' }
    ],
    examples: ['Environmental monitoring', 'Oil spill response', 'Industrial leak detection', 'Marine pollution tracking'],
    companies: ['Environmental Tectonics', 'Optech', 'FLIR Systems', 'Ocean Optics'],
    futureImpact: 'Thin-film sensors will detect contamination at parts-per-billion levels through interference shifts.',
    color: '#F59E0B'
  },
  {
    icon: '☀️',
    title: 'Solar Cell Optimization',
    short: 'Trapping light with interference coatings',
    tagline: 'Every photon counts for efficiency',
    description: 'Solar cells use anti-reflection coatings to capture more sunlight. Silicon\'s high refractive index causes 30% reflection without treatment. Thin-film coatings reduce this to under 3%, a critical application in the renewable energy industry.',
    connection: 'The coating creates destructive interference for reflected light, redirecting energy into the cell where it generates electricity - applying the same principle you learned about thin films.',
    howItWorks: 'Silicon nitride films of precisely controlled thickness create optimal anti-reflection at the peak of the solar spectrum. Multi-layer stacks extend the effect across broader wavelengths.',
    stats: [
      { value: '3%', label: 'Reflection with coating', icon: '📉' },
      { value: '30%', label: 'Reflection without', icon: '📈' },
      { value: '2-3%', label: 'Efficiency gain', icon: '⚡' }
    ],
    examples: ['Monocrystalline panels', 'Thin-film cells', 'Concentrated solar', 'Space solar arrays'],
    companies: ['First Solar', 'SunPower', 'LONGi', 'Canadian Solar'],
    futureImpact: 'Tandem cells with optimized interference layers will push efficiency above 50%.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ThinFilmInterferenceRenderer: React.FC<ThinFilmInterferenceRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [thickness, setThickness] = useState(400);
  const [viewAngle, setViewAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
      if (isAnimating) {
        setThickness(prev => {
          const newThickness = prev - 2;
          return newThickness < 100 ? 800 : newThickness;
        });
      }
    }, 50);
    return () => clearInterval(timer);
  }, [isAnimating]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    filmTop: '#60a5fa',
    filmBottom: '#3b82f6',
    lightRay: '#fbbf24',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Lab',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate interference color based on thickness and angle
  const calculateInterferenceColor = (t: number, angle: number = 0): string => {
    const n = 1.33;
    const cosAngle = Math.cos((angle * Math.PI) / 180);
    const pathDiff = 2 * n * t * cosAngle;
    const wavelengthR = 650;
    const wavelengthG = 550;
    const wavelengthB = 450;
    const intensityR = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthR), 2);
    const intensityG = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthG), 2);
    const intensityB = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthB), 2);
    return `rgb(${Math.round(intensityR * 255)}, ${Math.round(intensityG * 255)}, ${Math.round(intensityB * 255)})`;
  };

  // Prediction options
  const predictions = [
    { id: 'pigment', label: 'A) The colors come from pigments dissolved in the soap' },
    { id: 'rainbow', label: 'B) Light is splitting into a rainbow like a prism' },
    { id: 'interference', label: 'C) Reflections from front and back surfaces interfere' },
    { id: 'absorption', label: 'D) The soap absorbs certain colors from white light' },
  ];

  const twistPredictions = [
    { id: 'brighter', label: 'A) The colors become brighter and more vivid' },
    { id: 'darker', label: 'B) Some colors become darker or disappear' },
    { id: 'same', label: 'C) Nothing changes - polarization has no effect' },
    { id: 'rainbow', label: 'D) A new rainbow appears' },
  ];

  // Handle test answers
  const handleTestAnswer = (answerId: string) => {
    playSound('click');
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = answerId;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    playSound('complete');
    let score = 0;
    testQuestions.forEach((q, i) => {
      const userAnswer = testAnswers[i];
      const correctOption = q.options.find(opt => opt.correct);
      if (userAnswer === correctOption?.id) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (onGameEvent) {
      onGameEvent({
        eventType: score >= 7 ? 'correct_answer' : 'incorrect_answer',
        gameType: 'thin-film-interference',
        gameTitle: 'Thin Film Interference',
        details: { score, total: 10 },
        timestamp: Date.now()
      });
    }
  };

  // Visualization Component
  const ThinFilmVisualization = ({ interactive = false }: { interactive?: boolean }) => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 320 : 400;
    const filmLeft = 100;
    const filmRight = isMobile ? 280 : 360;
    const filmTop = 80;
    const filmHeight = 160;

    const gradientStops = [];
    for (let i = 0; i <= 10; i++) {
      const t = thickness - (i * 50);
      const color = calculateInterferenceColor(Math.max(t, 50), viewAngle);
      gradientStops.push({ offset: i * 10, color });
    }

    return (
      <svg width={width} height={height} viewBox={`0 0 ${isMobile ? 340 : 500} ${isMobile ? 320 : 400}`} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block', margin: '0 auto' }}>
        <defs>
          {/* Lab background gradient */}
          <linearGradient id="tfiLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Light source glow */}
          <radialGradient id="tfiLightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* Light beam gradient */}
          <linearGradient id="tfiBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
          </linearGradient>

          {/* Film iridescent gradient */}
          <linearGradient id="tfiFilmColors" x1="0%" y1="0%" x2="0%" y2="100%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity="0.85" />
            ))}
          </linearGradient>

          {/* Reflected rays */}
          <linearGradient id="tfiRay1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="tfiRay2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="tfiGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tfiRayGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#tfiLabBg)" />

        {/* Title */}
        <text x={isMobile ? 170 : 250} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="600" textAnchor="middle">
          Thin-Film Interference
        </text>
        <text x={isMobile ? 170 : 250} y={42} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Soap Film Cross-Section
        </text>

        {/* Light source */}
        <g transform="translate(40, 55)">
          <circle cx="0" cy="0" r="25" fill="url(#tfiLightGlow)" filter="url(#tfiGlow)" />
          <circle cx="0" cy="0" r="15" fill="#fef3c7" />
          <circle cx="-3" cy="-3" r="6" fill="#ffffff" opacity="0.8" />
        </g>
        <text x={40} y={90} fill={colors.textSecondary} fontSize="10" textAnchor="middle">White Light</text>

        {/* Incident beam */}
        <line x1={60} y1={60} x2={filmLeft + 40} y2={filmTop + 20} stroke="url(#tfiBeam)" strokeWidth="4" filter="url(#tfiRayGlow)" />

        {/* Soap film body */}
        <rect x={filmLeft} y={filmTop} width={filmRight - filmLeft} height={filmHeight} fill="url(#tfiFilmColors)" rx="6" stroke="#60a5fa" strokeWidth="1" opacity="0.8" />

        {/* Surface labels */}
        <text x={filmRight + 10} y={filmTop + 10} fill="#60a5fa" fontSize="10">Top Surface</text>
        <text x={filmRight + 10} y={filmTop + filmHeight - 5} fill="#3b82f6" fontSize="10">Bottom Surface</text>

        {/* Ray 1 - top surface reflection */}
        <line x1={filmLeft + 40} y1={filmTop + 20} x2={filmLeft + 90} y2={filmTop - 35} stroke="url(#tfiRay1)" strokeWidth="3" filter="url(#tfiRayGlow)" />
        <text x={filmLeft + 90} y={filmTop - 40} fill="#93c5fd" fontSize="9" textAnchor="middle">Ray 1</text>

        {/* Light through film */}
        <line x1={filmLeft + 40} y1={filmTop + 20} x2={filmLeft + 60} y2={filmTop + filmHeight - 20} stroke="url(#tfiBeam)" strokeWidth="2" opacity="0.6" />

        {/* Ray 2 - bottom surface reflection */}
        <line x1={filmLeft + 60} y1={filmTop + filmHeight - 20} x2={filmLeft + 115} y2={filmTop - 35} stroke="url(#tfiRay2)" strokeWidth="3" filter="url(#tfiRayGlow)" />
        <text x={filmLeft + 120} y={filmTop - 40} fill="#60a5fa" fontSize="9" textAnchor="middle">Ray 2</text>

        {/* Path difference indicator */}
        <line x1={filmLeft + 70} y1={filmTop + 25} x2={filmLeft + 70} y2={filmTop + filmHeight - 25} stroke="#a855f7" strokeWidth="2" strokeDasharray="4,3" />
        <text x={filmLeft + 85} y={filmTop + filmHeight / 2} fill="#d8b4fe" fontSize="9">Path Δ</text>

        {/* Observer eye */}
        <g transform={`translate(${filmLeft + 100}, ${filmTop - 60})`}>
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <circle cx="0" cy="0" r="5" fill="#0c4a6e" />
          <circle cx="0" cy="0" r="2" fill="#0f172a" />
          <circle cx="-2" cy="-1" r="1.5" fill="#ffffff" opacity="0.7" />
        </g>
        <text x={filmLeft + 100} y={filmTop - 75} fill={colors.textSecondary} fontSize="9" textAnchor="middle">Observer</text>

        {/* Result color display */}
        <g transform={`translate(${filmLeft + 30}, ${filmTop + filmHeight + 25})`}>
          <rect x="0" y="0" width="100" height="40" fill={calculateInterferenceColor(thickness, viewAngle)} rx="8" filter="url(#tfiGlow)" />
          <rect x="0" y="0" width="100" height="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" rx="8" />
        </g>
        <text x={filmLeft + 80} y={filmTop + filmHeight + 80} fill={colors.textPrimary} fontSize="10" textAnchor="middle">Resulting Color</text>

        {/* Info panel */}
        <g transform={`translate(15, ${height - 60})`}>
          <rect x="0" y="0" width="130" height="50" rx="8" fill="rgba(30, 41, 59, 0.8)" stroke="#334155" strokeWidth="1" />
          <text x="10" y="20" fill={colors.textSecondary} fontSize="10">Thickness: <tspan fill={colors.accent}>{thickness.toFixed(0)} nm</tspan></text>
          <text x="10" y="38" fill={colors.textSecondary} fontSize="10">Angle: <tspan fill={colors.accent}>{viewAngle.toFixed(0)}°</tspan></text>
        </g>
      </svg>
    );
  };

  // Controls component
  const InteractiveControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Film Thickness: {thickness.toFixed(0)} nm
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="10"
          value={thickness}
          onChange={(e) => setThickness(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Viewing Angle: {viewAngle.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={viewAngle}
          onChange={(e) => setViewAngle(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => { playSound('click'); setIsAnimating(!isAnimating); }}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: isAnimating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          {isAnimating ? 'Stop Draining' : 'Simulate Draining'}
        </button>
        <button
          onClick={() => { playSound('click'); setThickness(400); setViewAngle(0); setIsAnimating(false); }}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `2px solid ${colors.accent}`,
            background: 'transparent',
            color: colors.accent,
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );

  // Navigation dots
  const NavigationDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          aria-label={phaseLabels[p]}
          title={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: 'none',
            background: phase === p ? colors.accent : phaseOrder.indexOf(phase) > i ? colors.success : colors.border,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );

  // Progress bar
  const ProgressBar = () => {
    const progress = ((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 1000 }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`, transition: 'width 0.3s ease' }} />
      </div>
    );
  };

  // Primary CTA button
  const PrimaryButton = ({ onClick, disabled = false, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      onClick={() => { if (!disabled) { playSound('click'); onClick(); } }}
      disabled={disabled}
      style={{
        padding: '16px 32px',
        borderRadius: '12px',
        border: 'none',
        background: disabled ? colors.textMuted : `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
        color: 'white',
        fontWeight: '700',
        fontSize: '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: disabled ? 'none' : `0 4px 20px ${colors.accentGlow}`,
      }}
    >
      {children}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  const renderHook = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '12px' }}>The Colors of Nothing</h1>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
        Where do the swirling colors in a soap bubble come from?
      </p>
      <ThinFilmVisualization interactive />
      <InteractiveControls />
      <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', margin: '16px', textAlign: 'left' }}>
        <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '12px' }}>
          Dip a wire loop in soap solution and hold it up to the light. Brilliant colors swirl across the surface - colors that shift and change as the film drains and thins.
        </p>
        <p style={{ ...typo.small, color: colors.textSecondary }}>
          The soap has no pigment. Where do these colors come from?
        </p>
      </div>
      <PrimaryButton onClick={nextPhase}>Start Discovery</PrimaryButton>
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        What Do You Think Will Happen?
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
        Make a prediction before we explore the physics
      </p>
      <ThinFilmVisualization />
      <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px' }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
          Why does a soap film show swirling colors?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              onClick={() => { playSound('click'); setPrediction(p.id); }}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: prediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: prediction === p.id ? colors.accentGlow : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                transition: 'all 0.2s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <PrimaryButton onClick={nextPhase} disabled={!prediction}>
          Test My Prediction
        </PrimaryButton>
      </div>
    </div>
  );

  // PLAY PHASE
  const renderPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        Explore Thin-Film Interference
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px', textAlign: 'center' }}>
        Adjust thickness and angle to see how colors change
      </p>
      <ThinFilmVisualization interactive />
      <InteractiveControls />
      <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px' }}>
        <h4 style={{ color: colors.accent, marginBottom: '10px' }}>Try These Experiments:</h4>
        <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
          <li>Slowly decrease thickness - watch colors cycle through the spectrum</li>
          <li>At very thin (~100nm) the film appears dark</li>
          <li>Change viewing angle - same thickness gives different colors!</li>
          <li>Start the draining animation to see colors flow</li>
        </ul>
      </div>
      <div style={{ textAlign: 'center' }}>
        <PrimaryButton onClick={nextPhase}>Continue to Understanding</PrimaryButton>
      </div>
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => {
    const wasCorrect = prediction === 'interference';
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Your prediction was correct!' : 'Not quite - but now you understand why!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            The colors arise from interference between reflections from the top and bottom surfaces!
          </p>
        </div>

        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>The Physics Explained</h3>
          <div style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Two Reflections:</strong> When light hits a thin film, part reflects from the top surface (Ray 1) and part enters, reflects from the bottom, and exits (Ray 2). These two rays can interfere.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Path Difference:</strong> Ray 2 travels extra distance through the film. This path difference determines which wavelengths constructively or destructively interfere.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>The Formula:</strong> Path difference = 2nt·cos(θ), where n is refractive index, t is thickness, and θ is the angle inside the film.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Why Colors Change:</strong> Different thicknesses create different path differences. A 400nm film might boost blue while canceling red. As thickness changes, so does the color!
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PrimaryButton onClick={nextPhase}>Next: A Twist!</PrimaryButton>
        </div>
      </div>
    );
  };

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>
        The New Variable
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
        What if you view the soap film through polarizing sunglasses?
      </p>
      <ThinFilmVisualization />
      <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px' }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
          Through polarizing sunglasses, what do you expect to happen to the colors?
        </h3>
        <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
          Think about how polarizers interact with reflected light...
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              onClick={() => { playSound('click'); setTwistPrediction(p.id); }}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                transition: 'all 0.2s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <PrimaryButton onClick={nextPhase} disabled={!twistPrediction}>
          Test My Prediction
        </PrimaryButton>
      </div>
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>
        Polarization Effect
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px', textAlign: 'center' }}>
        Observe how polarization affects the brightness of reflections
      </p>
      <ThinFilmVisualization interactive />
      <InteractiveControls />
      <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '12px', margin: '16px', borderLeft: `3px solid ${colors.warning}` }}>
        <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
          Polarizing filters reduce glare from reflections. Since thin-film colors come from reflected light, the filter can reduce the brightness of certain reflections more than others, altering the apparent intensity but not eliminating the colors entirely.
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <PrimaryButton onClick={nextPhase}>See the Explanation</PrimaryButton>
      </div>
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'darker';
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct prediction!' : 'Interesting - here\'s the physics!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            Polarizing filters can reduce the brightness of reflections, making some interference bands appear darker!
          </p>
        </div>

        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>Polarization and Thin Films</h3>
          <div style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Partial Polarization:</strong> Light reflecting from surfaces becomes partially polarized, especially near Brewster's angle. This is why polarized sunglasses reduce glare.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Selective Reduction:</strong> Polarizing filters block horizontally polarized light (glare). This reduces the intensity of some reflections more than others, depending on their polarization state.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Colors Persist:</strong> The interference colors don't disappear because they depend on path difference, not polarization. But overall brightness and contrast can change significantly!
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PrimaryButton onClick={nextPhase}>Apply This Knowledge</PrimaryButton>
        </div>
      </div>
    );
  };

  // TRANSFER PHASE
  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allComplete = completedApps.every(c => c);
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
          See how thin-film interference is used in industry and nature
        </p>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => { playSound('click'); setSelectedApp(i); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                background: selectedApp === i ? `${a.color}22` : 'transparent',
                color: selectedApp === i ? a.color : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
            >
              {a.icon} {a.title}
            </button>
          ))}
        </div>

        {/* Selected app content */}
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...typo.h3, color: app.color, margin: 0 }}>{app.title}</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>{app.description}</p>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ ...typo.small, color: colors.accent, fontWeight: '600', marginBottom: '4px' }}>Connection to Physics Principle:</p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>{app.connection}</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ background: colors.bgSecondary, padding: '12px', borderRadius: '8px', flex: '1', minWidth: '90px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: app.color }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Companies */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Companies using this:</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{ background: colors.border, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: colors.textSecondary }}>
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Mark complete button */}
          {!completedApps[selectedApp] ? (
            <button
              onClick={() => {
                playSound('success');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${app.color}`,
                background: 'transparent',
                color: app.color,
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              Mark as Reviewed
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: colors.success, padding: '12px' }}>
              <span>✓</span> Reviewed
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>
            {completedApps.filter(c => c).length}/4 applications reviewed
          </p>
          <PrimaryButton onClick={nextPhase} disabled={!allComplete}>
            {allComplete ? 'Continue to Test' : 'Review All Applications'}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ padding: '20px' }}>
          <div style={{
            background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: passed ? colors.success : colors.error, marginBottom: '8px' }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: '700' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {passed ? 'You\'ve demonstrated strong understanding!' : 'Review the concepts and try again.'}
            </p>
          </div>

          {/* Show answers */}
          <div style={{ marginBottom: '20px' }}>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const correctOption = q.options.find(opt => opt.correct);
              const isCorrect = userAnswer === correctOption?.id;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: '8px' }}>
                    {i + 1}. {q.question}
                  </p>
                  <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px' }}>
                    {isCorrect ? '✓ Correct' : `✗ Your answer: ${q.options.find(o => o.id === userAnswer)?.label || 'None'}`}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '14px' }}>
                      Correct: {correctOption?.label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <PrimaryButton onClick={nextPhase}>
              {passed ? 'Complete Mastery' : 'Review & Continue'}
            </PrimaryButton>
          </div>
        </div>
      );
    }

    const q = testQuestions[currentQuestion];
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...typo.h3, color: colors.textPrimary }}>Knowledge Test</h2>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>{currentQuestion + 1} of 10</span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentQuestion(i)}
              style={{
                width: '24px',
                height: '6px',
                borderRadius: '3px',
                background: testAnswers[i] ? colors.accent : i === currentQuestion ? colors.textMuted : colors.border,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Scenario */}
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontStyle: 'italic', marginBottom: '12px' }}>
            {q.scenario}
          </p>
          <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>{q.question}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {q.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleTestAnswer(opt.id)}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: testAnswers[currentQuestion] === opt.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: testAnswers[currentQuestion] === opt.id ? colors.accentGlow : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => { playSound('click'); setCurrentQuestion(Math.max(0, currentQuestion - 1)); }}
            disabled={currentQuestion === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: currentQuestion === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            Previous
          </button>

          {currentQuestion < 9 ? (
            <button
              onClick={() => { playSound('click'); setCurrentQuestion(currentQuestion + 1); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
      <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '12px' }}>
        Congratulations! Mastery Complete!
      </h1>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
        You have successfully learned and mastered thin-film interference!
      </p>

      <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
        <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
          <li>Interference between front and back surface reflections creates colors</li>
          <li>Path difference formula: 2nt·cos(θ) determines which wavelengths interfere</li>
          <li>Thickness and viewing angle both affect the observed colors</li>
          <li>Real applications: anti-reflection coatings, structural color, solar cells</li>
          <li>Polarization can modify but not eliminate interference effects</li>
        </ul>
      </div>

      <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
          Multi-layer coatings stack many thin films to create highly selective filters - like the dichroic mirrors in projectors. Interference filters can transmit only a narrow band of wavelengths, crucial for spectroscopy and laser optics. Nature uses similar structures in butterfly wings and peacock feathers for camouflage and communication!
        </p>
      </div>

      <ThinFilmVisualization interactive />
      <InteractiveControls />

      <div style={{ marginTop: '24px' }}>
        <PrimaryButton onClick={() => {
          playSound('complete');
          if (onGameEvent) {
            onGameEvent({
              eventType: 'game_completed',
              gameType: 'thin-film-interference',
              gameTitle: 'Thin Film Interference',
              details: { finalScore: testScore },
              timestamp: Date.now()
            });
          }
        }}>
          Complete Game
        </PrimaryButton>
      </div>
    </div>
  );

  // Render current phase
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
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ProgressBar />
      <NavigationDots />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default ThinFilmInterferenceRenderer;
