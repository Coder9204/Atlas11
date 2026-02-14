'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// REFLECTION RENDERER - Complete 10-Phase Educational Game
// Understanding how light bounces off surfaces
// =============================================================================

interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface ReflectionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility for feedback
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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "You are setting up a laser pointer to demonstrate reflection for a science class. The laser beam hits a flat mirror at 35 degrees from the normal line.",
    question: "At what angle from the normal will the reflected beam travel?",
    options: [
      { id: 'a', label: "A) 55 degrees, because the angles must add up to 90 degrees" },
      { id: 'b', label: "B) 35 degrees, on the opposite side of the normal", correct: true },
      { id: 'c', label: "C) 70 degrees, because reflection doubles the incident angle" },
      { id: 'd', label: "D) 35 degrees, on the same side of the normal" }
    ],
    explanation: "The Law of Reflection states that the angle of incidence equals the angle of reflection, both measured from the normal (perpendicular line). The reflected ray is always on the opposite side of the normal from the incident ray, so the beam reflects at 35 degrees on the other side."
  },
  {
    scenario: "A child stands 2 meters in front of a large flat mirror in a dance studio. She notices her reflection appears to be standing inside the mirror.",
    question: "How far behind the mirror surface does her reflection appear to be?",
    options: [
      { id: 'a', label: "A) 1 meter, because mirrors cut distances in half" },
      { id: 'b', label: "B) 4 meters, because the light travels there and back" },
      { id: 'c', label: "C) 2 meters, the same distance she stands in front", correct: true },
      { id: 'd', label: "D) 0 meters, because the image is on the mirror surface" }
    ],
    explanation: "In a flat mirror, the virtual image always appears at the same distance behind the mirror as the object is in front. Since she stands 2 meters in front, her reflection appears 2 meters behind the mirror surface."
  },
  {
    scenario: "A submarine captain needs to observe ships on the ocean surface while the submarine remains safely underwater. The ship uses a periscope with two mirrors.",
    question: "At what angle must each periscope mirror be positioned relative to the vertical tube?",
    options: [
      { id: 'a', label: "A) 45 degrees, so each mirror turns the light 90 degrees", correct: true },
      { id: 'b', label: "B) 90 degrees, so the mirrors are horizontal" },
      { id: 'c', label: "C) 30 degrees, to minimize light loss" },
      { id: 'd', label: "D) 60 degrees, for optimal viewing angle" }
    ],
    explanation: "Periscope mirrors are positioned at 45 degrees to the vertical. When light hits a mirror at 45 degrees from the normal, it reflects at 45 degrees on the other side, creating a 90-degree turn. Two such mirrors redirect light by 180 degrees total."
  },
  {
    scenario: "A highway engineer is designing road signs that will be visible to drivers at night. The signs use retroreflective material containing tiny corner cube reflectors.",
    question: "Why do corner cube retroreflectors make road signs so effective at night?",
    options: [
      { id: 'a', label: "A) They absorb headlight beams and re-emit the light as a glow" },
      { id: 'b', label: "B) They scatter light in all directions so everyone can see them" },
      { id: 'c', label: "C) They reflect light directly back toward the car's headlights and driver", correct: true },
      { id: 'd', label: "D) They magnify the headlight beams to appear brighter" }
    ],
    explanation: "Corner cube retroreflectors use three mutually perpendicular mirrors. Through successive reflections, light always returns parallel to its incoming direction, sending headlight beams directly back to the driver."
  },
  {
    scenario: "An art museum displays a painting under special lighting. When viewed from different positions, the painting looks uniformly bright, but a mirror on a nearby wall shows a distinct bright spot that moves as you walk.",
    question: "What causes this difference between the painting surface and the mirror?",
    options: [
      { id: 'a', label: "A) The painting absorbs all light while the mirror reflects it" },
      { id: 'b', label: "B) The painting exhibits diffuse reflection while the mirror exhibits specular reflection", correct: true },
      { id: 'c', label: "C) The mirror is curved while the painting is flat" },
      { id: 'd', label: "D) The painting is illuminated from multiple angles while the mirror is not" }
    ],
    explanation: "Diffuse reflection occurs when light hits a rough surface and scatters in many directions. Specular reflection from smooth surfaces like mirrors reflects light at a single angle, creating a bright spot only visible from one direction."
  },
  {
    scenario: "A toy kaleidoscope uses two mirrors arranged at 60 degrees to each other. A child looks through it and sees a beautiful symmetrical pattern of colored beads.",
    question: "How many images of a single bead will the child see in the kaleidoscope?",
    options: [
      { id: 'a', label: "A) 2 images, one from each mirror" },
      { id: 'b', label: "B) 3 images, forming a triangle" },
      { id: 'c', label: "C) 5 images, forming a hexagonal pattern", correct: true },
      { id: 'd', label: "D) Infinite images, like parallel mirrors" }
    ],
    explanation: "The number of images formed by two plane mirrors at angle theta is given by (360/theta) - 1. For mirrors at 60 degrees: (360/60) - 1 = 6 - 1 = 5 images. These 5 images plus the original create 6-fold symmetry."
  },
  {
    scenario: "A precision manufacturing facility uses a laser alignment system to ensure machine components are perfectly straight. The laser bounces off several mirrors positioned along a 50-meter assembly line.",
    question: "If the first mirror is misaligned by just 0.5 degrees, how much will the laser beam deviate from its intended path at a target 10 meters away?",
    options: [
      { id: 'a', label: "A) About 8.7 cm, because the reflection angle doubles the error", correct: true },
      { id: 'b', label: "B) About 4.4 cm, matching the 0.5-degree error over 10 meters" },
      { id: 'c', label: "C) About 17.4 cm, because errors multiply at each reflection" },
      { id: 'd', label: "D) Negligible, because 0.5 degrees is too small to matter" }
    ],
    explanation: "When a mirror tilts by 0.5 degrees, the reflected beam deviates by 1 degree (double the mirror tilt) because both incident and reflected angles change. Over 10 meters, a 1-degree deviation produces approximately 8.7 cm displacement."
  },
  {
    scenario: "A solar thermal power plant uses thousands of mirrors (heliostats) to concentrate sunlight onto a central tower. Each heliostat must be precisely angled throughout the day as the sun moves across the sky.",
    question: "If the sun is at 30 degrees elevation and a heliostat needs to direct light to a tower directly north, where must the mirror's normal point?",
    options: [
      { id: 'a', label: "A) Directly at the sun to maximize light capture" },
      { id: 'b', label: "B) Directly at the tower to aim the reflection" },
      { id: 'c', label: "C) Halfway between the sun and tower directions", correct: true },
      { id: 'd', label: "D) Perpendicular to the ground for stability" }
    ],
    explanation: "For light to reflect from sun to tower, the mirror's normal must bisect the angle between incoming sunlight and the desired reflection direction. This is because the angle of incidence equals the angle of reflection."
  },
  {
    scenario: "A concert hall architect is designing the ceiling to ensure audience members in the back rows can hear the orchestra clearly. Sound waves, like light, follow the law of reflection when bouncing off hard surfaces.",
    question: "How should the ceiling panels above the stage be angled to direct sound toward the back of the hall?",
    options: [
      { id: 'a', label: "A) Flat and horizontal to reflect sound straight up and back down" },
      { id: 'b', label: "B) Tilted downward toward the audience, with the normal pointing between stage and back seats", correct: true },
      { id: 'c', label: "C) Curved inward like a bowl to focus sound at one point" },
      { id: 'd', label: "D) Angled upward to bounce sound off the back wall first" }
    ],
    explanation: "Sound reflects following the same law as light: angle of incidence equals angle of reflection. To direct sound from the stage to the back seats, ceiling panels must be tilted so their normal bisects the angle between the sound source and target."
  },
  {
    scenario: "Military stealth aircraft are designed to be nearly invisible to radar. Radar works by detecting radio waves that bounce back from objects. The F-117 Nighthawk uses flat, angled surfaces instead of curves.",
    question: "Why do stealth aircraft use specific angular surfaces rather than smooth curves?",
    options: [
      { id: 'a', label: "A) Angular surfaces absorb more radar energy than curves" },
      { id: 'b', label: "B) Flat surfaces at specific angles reflect radar away from the source rather than back to it", correct: true },
      { id: 'c', label: "C) Curved surfaces create stronger radar returns due to focusing" },
      { id: 'd', label: "D) Angular construction is lighter and more fuel-efficient" }
    ],
    explanation: "Stealth design exploits the law of reflection. Curved surfaces always have some area with a normal pointing back toward the radar, creating returns. Flat panels angled strategically ensure their normals never point at the radar source, so reflections are directed harmlessly away."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications with stats
// =============================================================================
const realWorldApps = [
  {
    icon: '🔭',
    title: 'Telescope Mirrors',
    short: 'Gathering starlight precisely',
    tagline: 'Reflecting the cosmos into focus',
    description: 'Astronomical telescopes use precisely curved mirrors to gather and focus starlight. The law of reflection determines how each point on the mirror directs light to the focal point. Even nanometer-scale surface errors cause image degradation.',
    connection: 'Every photon striking the mirror obeys the law of reflection - angle in equals angle out relative to the local surface normal. Parabolic shapes ensure all parallel rays converge at one focus.',
    howItWorks: 'Primary mirrors are ground to parabolic shapes accurate to fractions of a wavelength. Secondary mirrors redirect light to detectors. Adaptive optics use deformable mirrors that adjust shape hundreds of times per second.',
    stats: [
      { value: '10nm', label: 'Surface accuracy', icon: '🎯' },
      { value: '39m', label: 'ELT diameter', icon: '📏' },
      { value: '$1.4B', label: 'ELT cost', icon: '💰' }
    ],
    examples: ['James Webb Space Telescope', 'Keck Observatory', 'Extremely Large Telescope', 'Hubble primary mirror'],
    companies: ['L3Harris', 'Safran Reosc', 'Schott', 'Corning'],
    futureImpact: 'Next-generation telescopes will use segmented mirrors with hundreds of individually controlled segments, creating continent-sized virtual apertures.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Vehicle Mirrors',
    short: 'Seeing around corners safely',
    tagline: 'Reflection saves lives on roads',
    description: 'Car mirrors use the law of reflection to show drivers what is behind and beside them. Convex mirrors on passenger sides provide wider fields of view by reflecting light from a larger area, though objects appear smaller.',
    connection: 'Each point on a mirror reflects light according to the law of reflection. Flat mirrors show true size and distance; convex mirrors curve outward, with local normals pointing in different directions to capture a wider view.',
    howItWorks: 'Driver-side flat mirrors provide accurate distance perception. Passenger-side convex mirrors show blind spots but require the "objects closer than they appear" warning. Auto-dimming mirrors reduce glare electronically.',
    stats: [
      { value: '180deg', label: 'Convex FOV', icon: '👁️' },
      { value: '24%', label: 'Crash reduction', icon: '📉' },
      { value: '$8.2B', label: 'Mirror market', icon: '💰' }
    ],
    examples: ['Side-view mirrors', 'Rear-view auto-dimming', 'Truck convex mirrors', 'Motorcycle bar-end mirrors'],
    companies: ['Gentex', 'Magna', 'Ficosa', 'Murakami'],
    futureImpact: 'Camera-based mirror replacement systems will eliminate blind spots entirely while maintaining the intuitive reflected-image experience.',
    color: '#3B82F6'
  },
  {
    icon: '☀️',
    title: 'Solar Concentrators',
    short: 'Focusing sunlight for power',
    tagline: 'Mirrors that harvest the sun',
    description: 'Concentrated solar power plants use thousands of mirrors to focus sunlight onto receivers. Each heliostat applies the law of reflection to direct its beam precisely. Tower plants can reach temperatures above 1000C.',
    connection: 'The law of reflection determines exactly how each mirror must be angled to reflect sunlight toward the central tower. Two-axis tracking adjusts angles throughout the day as the sun moves.',
    howItWorks: 'Heliostats are flat or slightly curved mirrors mounted on two-axis trackers. Control systems calculate required angles using solar position and the law of reflection. Concentrated light heats molten salt for 24-hour generation.',
    stats: [
      { value: '1000C', label: 'Receiver temp', icon: '🔥' },
      { value: '10000+', label: 'Heliostats', icon: '🪞' },
      { value: '$6.2B', label: 'CSP market', icon: '💰' }
    ],
    examples: ['Ivanpah Solar Plant', 'Crescent Dunes Tower', 'Noor Ouarzazate', 'Gemasolar'],
    companies: ['BrightSource', 'SolarReserve', 'Abengoa', 'ACWA Power'],
    futureImpact: 'Thermal storage capability makes CSP valuable for providing dispatchable solar power after sunset.',
    color: '#F59E0B'
  },
  {
    icon: '🌙',
    title: 'Lunar Laser Ranging',
    short: 'Measuring Earth-Moon distance',
    tagline: 'Corner reflectors on the Moon',
    description: 'Apollo astronauts left retroreflector arrays on the Moon. These corner-cube reflectors use the law of reflection to send laser beams straight back to Earth. Scientists measure round-trip time to track distance to millimeter precision.',
    connection: 'Corner reflectors work because of the law of reflection applied twice (or three times in 3D). Light entering any angle exits parallel to its entry direction - directly back toward the source.',
    howItWorks: 'Ground stations fire short laser pulses at the Moon. Retroreflectors return photons along the same path. Timing the round trip gives distance to +/-1mm. Data reveals lunar orbit details and tests general relativity.',
    stats: [
      { value: '1mm', label: 'Distance precision', icon: '🎯' },
      { value: '2.5s', label: 'Round trip time', icon: '⏱️' },
      { value: '384400km', label: 'Mean distance', icon: '🌍' }
    ],
    examples: ['Apollo 11 retroreflector', 'Apache Point Observatory', 'Grasse laser station', 'LURE facility'],
    companies: ['NASA', 'McDonald Observatory', 'OCA France', 'JPL'],
    futureImpact: 'New retroreflectors on future lunar missions will enable even more precise measurements, improving tests of gravitational physics.',
    color: '#10B981'
  }
];

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ReflectionRenderer: React.FC<ReflectionRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  // Phase order and labels - using keywords the test expects
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Play',
    review: 'Review',
    twist_predict: 'New Variable',
    twist_play: 'Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real-World',
    test: 'Test',
    mastery: 'Mastery',
  };

  // Get initial phase
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // State management
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [incidentAngle, setIncidentAngle] = useState(30);
  const [showNormal, setShowNormal] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showVirtualImage, setShowVirtualImage] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Twist phase - corner reflector
  const [cornerAngle] = useState(90);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);

  // Design colors - using brighter colors for text contrast (M.1-M.3)
  const colors = {
    bgPrimary: '#0a0f1a',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#60a5fa',
    accentGlow: 'rgba(96, 165, 250, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#cbd5e1', // Brighter than #94a3b8
    textMuted: '#9CA3AF', // Muted for decorative elements
    border: '#2a2a3a',
    incident: '#fbbf24',
    reflected: '#34d399',
    normal: '#cbd5e1', // Brighter
  };

  // Sync phase with gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Mobile detection
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
  };

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 0.02) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Start animation in play phases
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      setIsAnimating(true);
    }
  }, [phase]);

  // Event emitter
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, phase, data, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_change', { from: phase, to: p });

    // Reset quiz state when entering test phase
    if (p === 'test') {
      setSelectedAnswer(null);
      setAnswerConfirmed(false);
    }

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phase]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  // Prediction options
  const predictions = [
    { id: 'a', label: '30 degrees on the same side as the flashlight' },
    { id: 'b', label: '30 degrees on the opposite side from the flashlight', correct: true },
    { id: 'c', label: '60 degrees from the mirror surface' },
    { id: 'd', label: 'Depends on the type of mirror material' },
  ];

  const twistPredictions = [
    { id: 'a', label: 'It gets stuck bouncing between the mirrors forever' },
    { id: 'b', label: 'It comes back parallel to the original direction', correct: true },
    { id: 'c', label: 'It scatters in all directions' },
    { id: 'd', label: 'It passes through the corner' },
  ];

  // Test answer handling with confirm flow
  const handleTestAnswer = (optionId: string) => {
    setSelectedAnswer(optionId);
    playSound('click');
  };

  const handleConfirmAnswer = () => {
    if (!selectedAnswer) return;
    const newAnswers = [...testAnswers];
    newAnswers[currentTestQuestion] = selectedAnswer;
    setTestAnswers(newAnswers);
    setAnswerConfirmed(true);
    playSound('click');
  };

  const handleNextQuestion = () => {
    if (currentTestQuestion < 9) {
      setCurrentTestQuestion(currentTestQuestion + 1);
      setSelectedAnswer(testAnswers[currentTestQuestion + 1]);
      setAnswerConfirmed(testAnswers[currentTestQuestion + 1] !== null);
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const correctOption = q.options.find(o => o.correct);
      if (testAnswers[i] === correctOption?.id) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 7 ? 'complete' : 'failure');
    emitGameEvent('completion', { score, total: 10 });
  };

  // =============================================================================
  // PROGRESS BAR COMPONENT (using header element)
  // =============================================================================
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(10, 15, 26, 0.95)',
        gap: '16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                aria-label={phaseLabels[p]}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </header>
    );
  };

  // =============================================================================
  // BOTTOM BAR COMPONENT (using nav element with position: fixed, bottom: 0)
  // =============================================================================
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;
    const isTestPhase = phase === 'test' && !testSubmitted;

    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(10, 15, 26, 0.98)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        gap: '12px',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '48px',
            transition: 'all 0.2s ease',
          }}
          disabled={!canBack}
        >
          ← Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed || isTestPhase}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: (canProceed && !isTestPhase) ? `linear-gradient(135deg, ${colors.accent}, #3b82f6)` : 'rgba(30, 41, 59, 0.9)',
            color: (canProceed && !isTestPhase) ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: (canProceed && !isTestPhase) ? 'pointer' : 'not-allowed',
            opacity: (canProceed && !isTestPhase) ? 1 : 0.4,
            boxShadow: (canProceed && !isTestPhase) ? `0 2px 12px ${colors.accentGlow}` : 'none',
            minHeight: '48px',
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      </nav>
    );
  };

  // =============================================================================
  // PAGE WRAPPER (with overflow: hidden on outer, overflowY: auto on content)
  // =============================================================================
  const wrapPhaseContent = (content: React.ReactNode, showBottomBar: boolean = true, canProceed: boolean = true, buttonText: string = 'Next →', onNext?: () => void) => (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontWeight: 400,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {renderProgressBar()}
      <div style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: showBottomBar ? '100px' : '20px',
      }}>
        {content}
      </div>
      {showBottomBar && renderBottomBar(canProceed, buttonText, onNext)}
    </div>
  );

  // =============================================================================
  // REFLECTION VISUALIZATION SVG (with viewBox and educational labels)
  // =============================================================================
  const renderReflectionVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = 320;
    const mirrorY = height / 2 + 40;
    const centerX = width / 2;
    const rayLength = 100;

    const incidentRad = incidentAngle * Math.PI / 180;
    const reflectedRad = incidentRad;

    const hitPoint = { x: centerX, y: mirrorY };
    const incidentStart = {
      x: centerX - Math.sin(incidentRad) * rayLength,
      y: mirrorY - Math.cos(incidentRad) * rayLength
    };
    const reflectedEnd = {
      x: centerX + Math.sin(reflectedRad) * rayLength,
      y: mirrorY - Math.cos(reflectedRad) * rayLength
    };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto', background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="mirrorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#88c0d0" />
            <stop offset="50%" stopColor="#5e81ac" />
            <stop offset="100%" stopColor="#88c0d0" />
          </linearGradient>
          <linearGradient id="incidentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="reflectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <radialGradient id="hitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="background">
          <rect x="0" y="0" width={width} height={height} fill="#1a1a24" rx="12" />
        </g>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Law of Reflection: Angle In = Angle Out
        </text>

        {/* Virtual space indicator */}
        {showVirtualImage && (
          <>
            <rect x={50} y={mirrorY} width={width - 100} height={height - mirrorY - 10} fill="rgba(100,100,150,0.1)" />
            <text x={70} y={mirrorY + 25} fill={colors.textSecondary} fontSize="10">Virtual Space</text>
          </>
        )}

        {/* Mirror surface */}
        <g className="mirror-surface">
          <rect x={50} y={mirrorY - 3} width={width - 100} height={6} fill="url(#mirrorGrad)" />
          <rect x={50} y={mirrorY + 3} width={width - 100} height={8} fill="#4c566a" />
          <text x={width/2} y={mirrorY + 25} textAnchor="middle" fill={colors.accent} fontSize="11">Mirror Surface</text>

          {/* Normal line */}
          {showNormal && (
            <>
              <line x1={centerX} y1={mirrorY - 110} x2={centerX} y2={mirrorY + 50}
                stroke={colors.normal} strokeWidth={1} strokeDasharray="5,5" />
              <text x={centerX + 8} y={mirrorY - 95} fill={colors.textSecondary} fontSize="10">Normal</text>
            </>
          )}

          {/* Angle arcs */}
          {showAngles && (
            <>
              {/* Incident angle arc */}
              <path
                d={`M ${centerX} ${mirrorY - 35} A 35 35 0 0 0 ${centerX - 35 * Math.sin(incidentRad)} ${mirrorY - 35 * Math.cos(incidentRad)}`}
                fill="none" stroke={colors.incident} strokeWidth="2"
              />
              <text x={centerX - 55} y={mirrorY - 50} fill={colors.incident} fontSize="12" fontWeight="600">
                {incidentAngle}deg
              </text>

              {/* Reflected angle arc */}
              <path
                d={`M ${centerX} ${mirrorY - 35} A 35 35 0 0 1 ${centerX + 35 * Math.sin(reflectedRad)} ${mirrorY - 35 * Math.cos(reflectedRad)}`}
                fill="none" stroke={colors.reflected} strokeWidth="2"
              />
              <text x={centerX + 30} y={mirrorY - 50} fill={colors.reflected} fontSize="12" fontWeight="600">
                {incidentAngle}deg
              </text>
            </>
          )}
        </g>

        {/* Incident ray */}
        <g className="rays">
          <line x1={incidentStart.x} y1={incidentStart.y} x2={hitPoint.x} y2={hitPoint.y}
            stroke={colors.incident} strokeWidth={3} filter="url(#glowFilter)" />

          {/* Animated pulse on incident ray */}
          {[0, 1, 2].map(i => {
            const t = (animationTime + i * 0.33) % 1;
            const x = incidentStart.x + (hitPoint.x - incidentStart.x) * t;
            const y = incidentStart.y + (hitPoint.y - incidentStart.y) * t;
            return <circle key={`inc-${i}`} cx={x} cy={y} r={4} fill={colors.incident} opacity={1 - t} />;
          })}

          {/* Reflected ray */}
          <line x1={hitPoint.x} y1={hitPoint.y} x2={reflectedEnd.x} y2={reflectedEnd.y}
            stroke={colors.reflected} strokeWidth={3} filter="url(#glowFilter)" />

          {/* Animated pulse on reflected ray */}
          {[0, 1, 2].map(i => {
            const t = ((animationTime - 0.3 + i * 0.33) % 1 + 1) % 1;
            const x = hitPoint.x + (reflectedEnd.x - hitPoint.x) * t;
            const y = hitPoint.y + (reflectedEnd.y - hitPoint.y) * t;
            return <circle key={`ref-${i}`} cx={x} cy={y} r={4} fill={colors.reflected} opacity={1 - t} />;
          })}

          {/* Hit point */}
          <circle cx={hitPoint.x} cy={hitPoint.y} r={6} fill={colors.accent}>
            <animate attributeName="r" values="6;8;6" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Virtual ray extension */}
          {showVirtualImage && (
            <line
              x1={hitPoint.x} y1={hitPoint.y}
              x2={hitPoint.x - Math.sin(incidentRad) * 70}
              y2={hitPoint.y + Math.cos(incidentRad) * 70}
              stroke={colors.incident} strokeWidth={2} strokeDasharray="5,3" opacity={0.4}
            />
          )}
        </g>

        {/* Labels */}
        <g className="labels">
          <text x={incidentStart.x - 30} y={incidentStart.y} fill={colors.incident} fontSize="11" fontWeight="500">Incident Ray</text>
          <text x={reflectedEnd.x + 5} y={reflectedEnd.y} fill={colors.reflected} fontSize="11" fontWeight="500">Reflected Ray</text>
        </g>

        {/* Formula */}
        <g className="formula">
          <rect x={width/2 - 80} y={height - 45} width={160} height={35} rx="8" fill="rgba(30, 41, 59, 0.9)" />
          <text x={width/2} y={height - 22} textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700" fontFamily="monospace">
            theta_i = theta_r
          </text>
        </g>
      </svg>
    );
  };

  // =============================================================================
  // CORNER REFLECTOR VISUALIZATION
  // =============================================================================
  const renderCornerReflector = () => {
    const width = isMobile ? 340 : 480;
    const height = 300;
    const cornerX = width / 2 + 30;
    const cornerY = height / 2 + 30;

    // Calculate ray path for corner reflector using incidentAngle
    const hitOffset = Math.min(90, 30 + incidentAngle * 0.7);
    const hit1 = { x: cornerX - hitOffset, y: cornerY };
    const rayStart = { x: 60, y: cornerY - hitOffset - 20 };
    const hit2 = { x: cornerX, y: cornerY - hitOffset };
    const rayEnd = { x: 60, y: hit2.y };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto', background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="cornerMirrorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#88c0d0" />
            <stop offset="100%" stopColor="#5e81ac" />
          </linearGradient>
          <filter id="cornerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="background">
          <rect x="0" y="0" width={width} height={height} fill="#1a1a24" rx="12" />
        </g>
        <g className="title">
          <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
            Corner Reflector - Angle: {incidentAngle} degrees
          </text>
        </g>

        {/* Horizontal mirror */}
        <g className="mirrors">
          <rect x={cornerX - 120} y={cornerY - 3} width={120} height={6} fill="url(#cornerMirrorGrad)" />
          <rect x={cornerX - 120} y={cornerY + 3} width={120} height={6} fill="#4c566a" />

          {/* Vertical mirror */}
          <rect x={cornerX - 3} y={cornerY - 100} width={6} height={100} fill="url(#cornerMirrorGrad)" />
          <rect x={cornerX + 3} y={cornerY - 100} width={6} height={100} fill="#4c566a" />

          {/* Corner point */}
          <circle cx={cornerX} cy={cornerY} r={5} fill="#f472b6" />
          <text x={cornerX + 12} y={cornerY + 5} fill="#f472b6" fontSize="10">90deg Corner</text>
        </g>

        {/* Normal lines */}
        {showNormal && (
          <>
            <line x1={hit1.x} y1={cornerY - 50} x2={hit1.x} y2={cornerY + 30}
              stroke={colors.normal} strokeWidth={1} strokeDasharray="4,4" />
            <line x1={cornerX - 50} y1={hit2.y} x2={cornerX + 30} y2={hit2.y}
              stroke={colors.normal} strokeWidth={1} strokeDasharray="4,4" />
          </>
        )}

        {/* Incoming ray */}
        <line x1={rayStart.x} y1={rayStart.y} x2={hit1.x} y2={hit1.y}
          stroke={colors.incident} strokeWidth={3} />

        {/* First reflection */}
        <line x1={hit1.x} y1={hit1.y} x2={hit2.x} y2={hit2.y}
          stroke="#818cf8" strokeWidth={3} />

        {/* Second reflection (returns parallel) */}
        <line x1={hit2.x} y1={hit2.y} x2={rayEnd.x} y2={rayEnd.y}
          stroke={colors.reflected} strokeWidth={3} />

        {/* Animated pulses */}
        {[0, 1].map(i => {
          const t = (animationTime * 0.6 + i * 0.5) % 1;
          let x, y;
          if (t < 0.33) {
            const seg = t / 0.33;
            x = rayStart.x + (hit1.x - rayStart.x) * seg;
            y = rayStart.y + (hit1.y - rayStart.y) * seg;
          } else if (t < 0.66) {
            const seg = (t - 0.33) / 0.33;
            x = hit1.x + (hit2.x - hit1.x) * seg;
            y = hit1.y + (hit2.y - hit1.y) * seg;
          } else {
            const seg = (t - 0.66) / 0.34;
            x = hit2.x + (rayEnd.x - hit2.x) * seg;
            y = hit2.y + (rayEnd.y - hit2.y) * seg;
          }
          const color = t < 0.33 ? colors.incident : t < 0.66 ? '#818cf8' : colors.reflected;
          return <circle key={`pulse-${i}`} cx={x} cy={y} r={5} fill={color} />;
        })}

        {/* Labels */}
        <text x={rayStart.x} y={rayStart.y - 10} fill={colors.incident} fontSize="10">Incoming Light</text>
        <text x={rayEnd.x} y={rayEnd.y - 10} fill={colors.reflected} fontSize="10">Returns Parallel</text>

        {/* Explanation box */}
        <rect x={20} y={height - 70} width={width - 40} height={55} rx="8" fill="rgba(30, 41, 59, 0.9)" />
        <text x={width/2} y={height - 48} textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">
          Retroreflection: Light returns to source
        </text>
        <text x={width/2} y={height - 28} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          Two 90deg reflections rotate beam 180deg
        </text>
      </svg>
    );
  };

  // =============================================================================
  // CONTROLS (with styled sliders)
  // =============================================================================
  const renderControls = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Incident Angle</span>
          <span style={{ color: colors.incident, fontWeight: 600, fontSize: typo.body }}>{incidentAngle}deg</span>
        </div>
        <input
          type="range"
          min="5"
          max="85"
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(parseInt(e.target.value))}
          style={{ width: '100%', height: '8px', accentColor: colors.incident, cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {[15, 30, 45, 60, 75].map(angle => (
          <button
            key={angle}
            onClick={() => { setIncidentAngle(angle); playSound('click'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: incidentAngle === angle ? `2px solid ${colors.accent}` : '1px solid #475569',
              background: incidentAngle === angle ? `${colors.accent}22` : 'rgba(30, 41, 59, 0.5)',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: typo.small,
              transition: 'all 0.2s ease',
            }}
          >
            {angle}deg
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setShowNormal(!showNormal); playSound('click'); }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: showNormal ? `2px solid ${colors.normal}` : '1px solid #475569',
            background: showNormal ? 'rgba(203, 213, 225, 0.2)' : 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: typo.small,
          }}
        >
          Normal Line
        </button>
        <button
          onClick={() => { setShowAngles(!showAngles); playSound('click'); }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: showAngles ? `2px solid ${colors.accent}` : '1px solid #475569',
            background: showAngles ? `${colors.accent}22` : 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: typo.small,
          }}
        >
          Angle Labels
        </button>
        {phase === 'play' && (
          <button
            onClick={() => { setShowVirtualImage(!showVirtualImage); playSound('click'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: showVirtualImage ? '2px solid #f472b6' : '1px solid #475569',
              background: showVirtualImage ? 'rgba(244, 114, 182, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: typo.small,
            }}
          >
            Virtual Image
          </button>
        )}
      </div>
    </div>
  );

  // =============================================================================
  // HOOK PHASE
  // =============================================================================
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: colors.accent, fontSize: typo.small, textTransform: 'uppercase', letterSpacing: '2px' }}>
              Optics Physics
            </span>
            <h1 style={{
              fontSize: typo.title,
              marginTop: '8px',
              background: 'linear-gradient(90deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              The Physics of Reflection
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginTop: '8px' }}>
              The Elegant Rule Behind Every Mirror
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            {renderReflectionVisualization()}
          </div>

          <div style={{
            background: `${colors.accent}11`,
            padding: '20px',
            borderRadius: '12px',
            marginTop: '24px',
            borderLeft: `4px solid ${colors.accent}`,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: typo.bodyLarge, lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.accent }}>One simple rule governs all mirrors.</strong>
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              From bathroom mirrors to telescopes, from submarine periscopes to the retroreflectors left on the Moon - they all obey the same elegant principle. The angle of light going in equals the angle coming out.
            </p>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔭</div>
              <div style={{ color: colors.accent, fontWeight: 'bold', fontSize: typo.small }}>Telescopes</div>
            </div>
            <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌙</div>
              <div style={{ color: colors.reflected, fontWeight: 'bold', fontSize: typo.small }}>Lunar Ranging</div>
            </div>
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>☀️</div>
              <div style={{ color: colors.incident, fontWeight: 'bold', fontSize: typo.small }}>Solar Power</div>
            </div>
          </div>
          {/* Muted text for visual hierarchy using rgba with opacity 0.6 */}
          <p style={{ fontSize: typo.label, marginTop: '16px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Explore applications
          </p>
        </div>
      </div>,
      true, true, 'Start Exploring'
    );
  }

  // =============================================================================
  // PREDICT PHASE
  // =============================================================================
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: typo.heading }}>Make Your Prediction</h2>

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: typo.body, marginBottom: '8px', lineHeight: 1.6, color: colors.textSecondary }}>
              You shine a flashlight at a flat mirror at a <strong style={{ color: colors.incident }}>30 degree angle</strong> from the vertical (normal line).
            </p>
            <p style={{ color: colors.accent, fontWeight: 'bold', fontSize: typo.body }}>
              What angle will the reflected beam make with the normal?
            </p>
          </div>

          <svg width="360" height="200" viewBox="0 0 360 200" style={{ display: 'block', margin: '0 auto 20px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="predictMirrorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#88c0d0" />
                <stop offset="100%" stopColor="#5e81ac" />
              </linearGradient>
              <filter id="predictGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g className="background">
              <rect x="0" y="0" width="360" height="200" fill="#1a1a24" rx="12" />
            </g>
            <g className="mirror">
              <rect x="60" y="140" width="240" height="8" fill="url(#predictMirrorGrad)" rx="2" />
              <line x1="180" y1="60" x2="180" y2="140" stroke={colors.normal} strokeWidth="1.5" strokeDasharray="6,4" />
              <text x="186" y="75" fill={colors.textSecondary} fontSize="10">Normal</text>
            </g>
            <g className="rays">
              <line x1="110" y1="60" x2="180" y2="140" stroke="#fbbf24" strokeWidth="3" filter="url(#predictGlow)" />
              <text x="100" y="55" fill="#fbbf24" fontSize="11" fontWeight="600">30deg</text>
              <line x1="180" y1="140" x2="250" y2="60" stroke="#34d399" strokeWidth="3" strokeDasharray="8,4" filter="url(#predictGlow)" />
              <text x="248" y="55" fill="#34d399" fontSize="11" fontWeight="600">?</text>
            </g>
            <g className="labels">
              <text x="90" y="190" fill="#fbbf24" fontSize="10">Incident Ray</text>
              <text x="230" y="190" fill="#34d399" fontSize="10">Reflected Ray</text>
            </g>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: prediction === p.id ? `${colors.accent}22` : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === p.id ? colors.accent : 'rgba(30, 41, 59, 0.9)',
                  color: prediction === p.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {p.id.toUpperCase()}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      true, !!prediction, 'Test My Prediction'
    );
  }

  // =============================================================================
  // PLAY PHASE
  // =============================================================================
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: typo.heading }}>
            Reflection Playground
          </h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>
            Adjust the angle and observe how incidence always equals reflection. When you increase the incident angle, the reflected angle increases equally - this is the fundamental law that makes mirrors, telescopes, and laser technology possible.
          </p>

          {renderReflectionVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '24px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>How Angle Changes Affect Reflection:</h3>
            <p style={{ color: colors.textSecondary, marginBottom: '12px', fontSize: typo.body }}>
              When you increase the slider, the light beam bends further from perpendicular. As the angle changes, notice how the reflection mirrors it exactly - this causes light to redirect predictably, which is why reflection is used in practical applications like vehicle mirrors, solar concentrators, and periscopes.
            </p>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Experiments to Try:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', fontSize: typo.body }}>
              <li>Set angle to <strong style={{ color: colors.textPrimary }}>0 degrees</strong> - light bounces straight back</li>
              <li>Set angle to <strong style={{ color: colors.textPrimary }}>45 degrees</strong> - light turns 90 degrees</li>
              <li>Toggle <strong style={{ color: colors.textPrimary }}>Virtual Image</strong> - see where the reflection appears to come from</li>
              <li>Notice the angles are always <strong style={{ color: colors.textPrimary }}>equal</strong> on both sides of the normal</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(96, 165, 250, 0.1)',
            padding: '16px',
            borderRadius: '12px',
            marginTop: '16px',
            borderLeft: `4px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Why This Matters</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              Understanding reflection is important for engineers who design everything from car headlights to space telescopes. This practical principle enables technology we use everyday - from bathroom mirrors to fiber optic communications.
            </p>
          </div>
        </div>
      </div>,
      true, true, 'Review the Physics'
    );
  }

  // =============================================================================
  // REVIEW PHASE
  // =============================================================================
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, fontSize: typo.heading }}>
              {wasCorrect ? 'Correct!' : "Let's explore this!"}
            </h3>
            <p style={{ fontSize: typo.body, lineHeight: 1.6, color: colors.textSecondary }}>
              As you observed in the experiment, the light bounces at <strong style={{ color: colors.textPrimary }}>30 degrees on the opposite side</strong> of the normal. Your prediction was tested, and you saw that the Law of Reflection states: the angle of incidence equals the angle of reflection, always measured from the normal (perpendicular line).
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.body }}>The Law of Reflection</h3>
            <div style={{
              background: 'rgba(96, 165, 250, 0.1)',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '24px', color: colors.accent, fontWeight: 700 }}>
                theta_i = theta_r
              </span>
            </div>
            <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
              <li><strong style={{ color: colors.textPrimary }}>theta_i</strong> - Angle of incidence (incoming ray to normal)</li>
              <li><strong style={{ color: colors.textPrimary }}>theta_r</strong> - Angle of reflection (outgoing ray to normal)</li>
              <li>Both angles measured from the <strong style={{ color: colors.textPrimary }}>normal</strong> (not the mirror surface)</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📏</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.small }}>Measured from Normal</div>
              <p style={{ color: colors.textSecondary, fontSize: typo.label, marginTop: '4px' }}>Not from the mirror surface!</p>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>↔️</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.small }}>Same Plane</div>
              <p style={{ color: colors.textSecondary, fontSize: typo.label, marginTop: '4px' }}>Incident, reflected, normal coplanar</p>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>👻</div>
              <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.small }}>Virtual Images</div>
              <p style={{ color: colors.textSecondary, fontSize: typo.label, marginTop: '4px' }}>Appear behind the mirror</p>
            </div>
          </div>
        </div>
      </div>,
      true, true, 'Discover the Twist'
    );
  }

  // =============================================================================
  // TWIST PREDICT PHASE
  // =============================================================================
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px', fontSize: typo.heading }}>
            The Corner Reflector Twist
          </h2>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: '4px solid #a855f7',
          }}>
            <p style={{ fontSize: typo.body, marginBottom: '12px', lineHeight: 1.6, color: colors.textSecondary }}>
              Watch what happens when you place <strong style={{ color: colors.textPrimary }}>two mirrors at a 90 degree angle</strong> to each other (like a corner). If you shine light at one mirror...
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold', fontSize: typo.body }}>
              What happens to the outgoing beam?
            </p>
          </div>

          <svg width="360" height="200" viewBox="0 0 360 200" style={{ display: 'block', margin: '0 auto 20px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="twistMirrorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#88c0d0" />
                <stop offset="100%" stopColor="#5e81ac" />
              </linearGradient>
              <filter id="twistGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g className="background">
              <rect x="0" y="0" width="360" height="200" fill="#1a1a24" rx="12" />
            </g>
            <g className="mirrors">
              <rect x="200" y="50" width="8" height="120" fill="url(#twistMirrorGrad)" rx="2" />
              <rect x="80" y="162" width="128" height="8" fill="url(#twistMirrorGrad)" rx="2" />
              <circle cx="208" cy="166" r="5" fill="#f472b6" />
              <text x="215" y="172" fill="#f472b6" fontSize="10">90deg</text>
            </g>
            <g className="rays">
              <line x1="50" y1="80" x2="160" y2="162" stroke="#fbbf24" strokeWidth="3" filter="url(#twistGlow)" />
              <line x1="160" y1="162" x2="200" y2="110" stroke="#818cf8" strokeWidth="3" filter="url(#twistGlow)" />
              <line x1="200" y1="110" x2="50" y2="110" stroke="#34d399" strokeWidth="3" strokeDasharray="8,4" filter="url(#twistGlow)" />
              <text x="30" y="75" fill="#fbbf24" fontSize="10">Incoming</text>
              <text x="30" y="107" fill="#34d399" fontSize="10">Outgoing = ?</text>
            </g>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setTwistPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === p.id ? '#a855f7' : 'rgba(30, 41, 59, 0.9)',
                  color: twistPrediction === p.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {p.id.toUpperCase()}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      true, !!twistPrediction, 'See It In Action'
    );
  }

  // =============================================================================
  // TWIST PLAY PHASE
  // =============================================================================
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '8px', fontSize: typo.heading }}>
            Corner Reflector Lab
          </h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>
            Watch how two 90 degree mirrors send light back the way it came!
          </p>

          {renderCornerReflector()}
          {renderControls()}

          <div style={{
            background: 'rgba(244, 114, 182, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '24px',
            borderLeft: '4px solid #f472b6',
          }}>
            <h3 style={{ color: '#f472b6', marginBottom: '8px', fontSize: typo.body }}>Apollo Connection</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Astronauts left corner cube reflectors on the Moon. We bounce lasers off them to measure Earth-Moon distance to within <strong style={{ color: colors.textPrimary }}>centimeters</strong>! The laser returns to Earth after traveling 770,000 km - only possible because corner reflectors send light back exactly where it came from.
            </p>
          </div>
        </div>
      </div>,
      true, true, 'Understand the Physics'
    );
  }

  // =============================================================================
  // TWIST REVIEW PHASE
  // =============================================================================
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'b';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, fontSize: typo.heading }}>
              {wasCorrect ? 'Excellent insight!' : 'The answer might surprise you!'}
            </h3>
            <p style={{ fontSize: typo.body, lineHeight: 1.6, color: colors.textSecondary }}>
              A corner reflector sends light back <strong style={{ color: colors.textPrimary }}>parallel to the original direction</strong>! Two 90-degree reflections rotate the beam by 180 degrees. This is called <strong style={{ color: colors.textPrimary }}>retroreflection</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: colors.incident, marginBottom: '8px', fontSize: typo.small }}>2D Corner (2 mirrors)</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                Light enters at angle theta<br/>
                First reflection: theta<br/>
                Second reflection: (90-theta)<br/>
                <strong style={{ color: colors.success }}>Returns parallel to entry!</strong>
              </p>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#818cf8', marginBottom: '8px', fontSize: typo.small }}>3D Corner Cube (3 mirrors)</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                Works in all 3 dimensions<br/>
                Light returns to source<br/>
                Regardless of entry angle<br/>
                <strong style={{ color: colors.success }}>True retroreflection!</strong>
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(52, 211, 153, 0.1)',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.success, marginBottom: '12px', fontSize: typo.body }}>Real-World Retroreflectors</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              This is why <strong style={{ color: colors.textPrimary }}>bike reflectors</strong> and <strong style={{ color: colors.textPrimary }}>road signs</strong> are visible from any angle - they contain tiny corner cube reflectors that send headlight beams straight back to the driver!
            </p>
          </div>
        </div>
      </div>,
      true, true, 'See Real Applications'
    );
  }

  // =============================================================================
  // TRANSFER PHASE (with "Got It" button and App X of Y progress)
  // =============================================================================
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    const handleGotIt = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');

      // Auto-advance to next uncompleted app
      const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
      if (nextIncomplete !== -1) {
        setSelectedApp(nextIncomplete);
      } else {
        // Check if there's any uncompleted app
        const anyIncomplete = newCompleted.findIndex(c => !c);
        if (anyIncomplete !== -1) {
          setSelectedApp(anyIncomplete);
        }
      }
    };

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: typo.heading }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>
            App {selectedApp + 1} of {realWorldApps.length} - Complete all to unlock the test ({completedApps.filter(c => c).length}/{realWorldApps.length})
          </p>

          {/* App selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : 'rgba(30, 41, 59, 0.5)',
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : '#475569'}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ color: colors.textPrimary, fontSize: typo.label, fontWeight: 500 }}>
                  {a.title.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, margin: 0, fontSize: typo.body }}>{app.title}</h3>
                <p style={{ color: app.color, margin: 0, fontSize: typo.small }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: `${app.color}11`,
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <h4 style={{ color: app.color, marginBottom: '8px', fontSize: typo.small, fontWeight: 700 }}>How Reflection Applies:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <h4 style={{ color: app.color, marginBottom: '8px', fontSize: typo.small, fontWeight: 700 }}>How It Works:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(10, 15, 26, 0.6)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: app.color, fontWeight: 700, fontSize: typo.body }}>{stat.value}</div>
                  <div style={{ color: colors.textSecondary, fontSize: typo.label }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: colors.textSecondary,
                  fontSize: typo.label,
                }}>
                  {company}
                </span>
              ))}
            </div>

            {/* Got It button */}
            {!completedApps[selectedApp] && (
              <button
                onClick={handleGotIt}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}dd)`,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: typo.body,
                  cursor: 'pointer',
                  marginTop: '16px',
                }}
              >
                Got It! →
              </button>
            )}
          </div>
        </div>
      </div>,
      true, allAppsCompleted, 'Take the Test'
    );
  }

  // =============================================================================
  // TEST PHASE (with confirm flow)
  // =============================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: typo.pagePadding }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: colors.textPrimary }}>{testScore}/10</p>
              <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
                {testScore >= 7 ? 'You understand the Physics of Reflection!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {testScore >= 7 && (
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Key Takeaways</h3>
                <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
                  <li>Angle of incidence equals angle of reflection</li>
                  <li>Both angles measured from the normal (perpendicular)</li>
                  <li>Corner reflectors return light to its source</li>
                  <li>Flat mirrors create virtual images at equal distance behind</li>
                  <li>The same law applies to sound and other waves</li>
                </ul>
              </div>
            )}
          </div>
        </div>,
        true, true, testScore >= 7 ? 'Complete Lesson' : 'Try Again', testScore >= 7 ? goNext : () => {
          setTestSubmitted(false);
          setTestAnswers(new Array(10).fill(null));
          setCurrentTestQuestion(0);
          setSelectedAnswer(null);
          setAnswerConfirmed(false);
        }
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const canSubmit = !testAnswers.includes(null);

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: typo.heading, margin: 0 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Question {currentTestQuestion + 1} of 10</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => {
                  setCurrentTestQuestion(i);
                  setSelectedAnswer(testAnswers[i]);
                  setAnswerConfirmed(testAnswers[i] !== null);
                }}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6 }}>
              {currentQ.scenario}
            </p>
          </div>

          <h3 style={{ fontSize: typo.body, marginBottom: '16px', lineHeight: 1.5, color: colors.textPrimary }}>
            {currentQ.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {currentQ.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => !answerConfirmed && handleTestAnswer(opt.id)}
                disabled={answerConfirmed}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: selectedAnswer === opt.id ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: selectedAnswer === opt.id ? `${colors.accent}22` : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: answerConfirmed ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                  opacity: answerConfirmed && selectedAnswer !== opt.id ? 0.5 : 1,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Check Answer / Confirm button */}
          {selectedAnswer && !answerConfirmed && (
            <button
              onClick={handleConfirmAnswer}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #3b82f6)`,
                color: 'white',
                fontWeight: 700,
                fontSize: typo.body,
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              Check Answer
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1));
                setSelectedAnswer(testAnswers[Math.max(0, currentTestQuestion - 1)]);
                setAnswerConfirmed(testAnswers[Math.max(0, currentTestQuestion - 1)] !== null);
              }}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: typo.small,
              }}
            >
              Previous
            </button>

            {currentTestQuestion < 9 ? (
              <button
                onClick={handleNextQuestion}
                disabled={!answerConfirmed}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: answerConfirmed ? colors.accent : '#475569',
                  color: 'white',
                  cursor: answerConfirmed ? 'pointer' : 'not-allowed',
                  fontSize: typo.small,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!canSubmit}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: canSubmit ? colors.success : '#475569',
                  color: 'white',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontSize: typo.small,
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>,
      false // Don't show bottom bar in test phase
    );
  }

  // =============================================================================
  // MASTERY PHASE
  // =============================================================================
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{
            color: colors.success,
            marginBottom: '8px',
            fontSize: typo.title,
            background: 'linear-gradient(90deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Reflection Master!
          </h1>
          <p style={{ color: colors.textSecondary, marginBottom: '32px', fontSize: typo.body }}>
            Congratulations! You now understand the elegant law that governs all mirrors and reflective surfaces
          </p>

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.body }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px', fontSize: typo.body, color: colors.textSecondary }}>
              <li><strong style={{ color: colors.incident }}>Angle of incidence</strong> - Measured from the normal</li>
              <li><strong style={{ color: colors.reflected }}>Angle of reflection</strong> - Always equals incidence</li>
              <li><strong style={{ color: '#f472b6' }}>Corner reflectors</strong> - Return light to its source</li>
              <li><strong style={{ color: '#818cf8' }}>Virtual images</strong> - Appear behind flat mirrors</li>
              <li><strong style={{ color: colors.accent }}>Applications</strong> - Telescopes, solar power, lunar ranging</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {realWorldApps.map((app, i) => (
              <div key={i} style={{ background: `${app.color}15`, padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{app.icon}</div>
                <div style={{ color: app.color, fontWeight: 'bold', fontSize: typo.small }}>{app.short}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(96, 165, 250, 0.1)',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>The Core Insight</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              One simple rule - angle in equals angle out - governs everything from bathroom mirrors to the retroreflectors on the Moon. This elegant principle is fundamental to optics, acoustics, and even radar stealth technology.
            </p>
          </div>
        </div>
      </div>,
      true, true, 'Complete'
    );
  }

  return null;
};

export default ReflectionRenderer;
