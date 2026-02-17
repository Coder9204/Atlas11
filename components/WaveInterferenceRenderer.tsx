'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Wave Interference - Complete 10-Phase Game
// How waves combine to create constructive and destructive interference
// -----------------------------------------------------------------------------

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

interface WaveInterferenceRendererProps {
  onComplete?: () => void;
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "Two speakers emit the same tone. At point P, the path difference from the two speakers is exactly 2 wavelengths.",
    question: "What type of interference occurs at point P?",
    options: [
      { id: 'a', label: "Constructive interference", correct: true },
      { id: 'b', label: "Destructive interference", correct: false },
      { id: 'c', label: "No interference", correct: false },
      { id: 'd', label: "Partial cancellation", correct: false }
    ],
    explanation: "Path difference = 2 lambda = whole number of wavelengths. Waves arrive in phase (peak meets peak), so they add up to create constructive interference!"
  },
  {
    scenario: "At another location, the path difference is 2.5 wavelengths.",
    question: "What happens at this point?",
    options: [
      { id: 'a', label: "Maximum amplitude", correct: false },
      { id: 'b', label: "Minimum amplitude (near silence)", correct: true },
      { id: 'c', label: "Average amplitude", correct: false },
      { id: 'd', label: "Doubled frequency", correct: false }
    ],
    explanation: "Path difference = 2.5 lambda = (n + 0.5) lambda. Waves arrive out of phase (peak meets trough) creating destructive interference and near-silence!"
  },
  {
    scenario: "The wavelength of a wave is 20 cm. Two sources are separated by 60 cm.",
    question: "At what minimum path difference will you find constructive interference?",
    options: [
      { id: 'a', label: "0 cm (on the center line)", correct: true },
      { id: 'b', label: "10 cm", correct: false },
      { id: 'c', label: "30 cm", correct: false },
      { id: 'd', label: "60 cm", correct: false }
    ],
    explanation: "Constructive interference occurs when delta d = n lambda. The minimum is delta d = 0 (center line), where both waves travel equal distances."
  },
  {
    scenario: "Noise-canceling headphones work by creating a wave that is out of phase with ambient noise.",
    question: "What path/phase difference do they create?",
    options: [
      { id: 'a', label: "0 wavelengths", correct: false },
      { id: 'b', label: "0.5 wavelengths (half wavelength)", correct: true },
      { id: 'c', label: "1 wavelength", correct: false },
      { id: 'd', label: "2 wavelengths", correct: false }
    ],
    explanation: "To cancel noise, the anti-noise wave must arrive 180 degrees (half wavelength) out of phase. Peak meets trough creating destructive interference and silence!"
  },
  {
    scenario: "You decrease the wavelength while keeping the source separation constant.",
    question: "What happens to the interference pattern?",
    options: [
      { id: 'a', label: "Pattern spreads out", correct: false },
      { id: 'b', label: "Pattern becomes more closely spaced", correct: true },
      { id: 'c', label: "Pattern disappears", correct: false },
      { id: 'd', label: "Pattern stays the same", correct: false }
    ],
    explanation: "Shorter lambda means the same physical distance corresponds to MORE wavelengths. The maxima/minima become more closely spaced."
  },
  {
    scenario: "In a double-slit experiment, the central maximum (bright fringe) is always at the center.",
    question: "Why is this?",
    options: [
      { id: 'a', label: "Both paths have equal length so delta d = 0 means constructive", correct: true },
      { id: 'b', label: "Light naturally combines at center", correct: false },
      { id: 'c', label: "Slits focus light to center", correct: false },
      { id: 'd', label: "It is just coincidence", correct: false }
    ],
    explanation: "At the center, both waves travel exactly the same distance from their sources. Path difference = 0 = 0 lambda meaning always constructive!"
  },
  {
    scenario: "Radio signals from two towers can cancel at certain locations.",
    question: "What is this phenomenon called?",
    options: [
      { id: 'a', label: "Signal amplification", correct: false },
      { id: 'b', label: "Dead zone or null point", correct: true },
      { id: 'c', label: "Signal reflection", correct: false },
      { id: 'd', label: "Atmospheric absorption", correct: false }
    ],
    explanation: "When radio waves from two sources arrive out of phase at a location, they cancel creating 'dead zones' where reception is poor."
  },
  {
    scenario: "The path difference at a point is 3.25 wavelengths.",
    question: "Is this closer to constructive or destructive interference?",
    options: [
      { id: 'a', label: "Closer to constructive (3 lambda)", correct: false },
      { id: 'b', label: "Closer to destructive (3.5 lambda)", correct: true },
      { id: 'c', label: "Exactly in between", correct: false },
      { id: 'd', label: "Neither - no interference", correct: false }
    ],
    explanation: "3.25 lambda is closer to 3.5 lambda (destructive) than to 3 lambda (constructive). The wave will be partially cancelled."
  },
  {
    scenario: "Soap bubbles show colorful patterns due to thin-film interference.",
    question: "What causes different colors in different regions?",
    options: [
      { id: 'a', label: "Different soap concentrations", correct: false },
      { id: 'b', label: "Different film thickness creating different path differences", correct: true },
      { id: 'c', label: "Trapped air bubbles", correct: false },
      { id: 'd', label: "Random light scattering", correct: false }
    ],
    explanation: "Film thickness varies across the bubble. Different thicknesses create different path differences for each color wavelength."
  },
  {
    scenario: "WiFi signals from your router reflect off walls, creating multiple paths.",
    question: "What causes WiFi 'dead zones' in your home?",
    options: [
      { id: 'a', label: "Signal too weak", correct: false },
      { id: 'b', label: "Destructive interference between direct and reflected waves", correct: true },
      { id: 'c', label: "Wall absorption", correct: false },
      { id: 'd', label: "Router malfunction", correct: false }
    ],
    explanation: "Where direct and reflected waves have path differences of (n+0.5) lambda, destructive interference creates weak signal zones!"
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🎧',
    title: 'Noise-Canceling Headphones',
    short: 'Creating silence with sound waves',
    tagline: 'Fighting noise with physics',
    description: 'Active noise cancellation uses microphones to detect ambient sound and generates an anti-phase wave that destructively interferes with the noise. When the waves combine, they cancel out, creating perceived silence.',
    connection: 'This is direct application of wave interference - when two waves of equal amplitude meet 180 degrees out of phase, they undergo destructive interference and cancel completely.',
    howItWorks: 'Microphones sample external sound hundreds of times per second. DSP chips calculate the inverse waveform and speakers play it in real-time. The original noise and anti-noise interfere destructively, reducing perceived volume by up to 45dB.',
    stats: [
      { value: '45dB', label: 'Max noise reduction', icon: '🔇' },
      { value: '$35B', label: 'Headphone market', icon: '📈' },
      { value: '1 microsecond', label: 'Processing latency', icon: '⚡' }
    ],
    examples: ['Sony WH-1000XM series', 'Apple AirPods Pro', 'Bose QuietComfort', 'Aircraft cabin systems'],
    companies: ['Sony', 'Bose', 'Apple', 'Sennheiser'],
    futureImpact: 'Adaptive ANC systems will use AI to predict and pre-emptively cancel sounds before they reach your ears, enabling near-perfect silence.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Thin-Film Optical Coatings',
    short: 'Anti-reflective screens and lenses',
    tagline: 'Seeing clearly through physics',
    description: 'The rainbow sheen on soap bubbles and oil slicks comes from thin-film interference. Engineers harness this to create anti-reflective coatings on eyeglasses, camera lenses, and phone screens by carefully controlling film thickness.',
    connection: 'Light reflecting from the top and bottom surfaces of a thin film travels different distances. When the path difference equals half a wavelength, destructive interference eliminates reflection for that color.',
    howItWorks: 'Multiple thin layers of precise thickness are deposited on surfaces. Each layer creates reflections that interfere. By stacking layers tuned to different wavelengths, broadband anti-reflection is achieved across visible light.',
    stats: [
      { value: '99.9%', label: 'Transmission possible', icon: '✨' },
      { value: '$12B', label: 'Optical coating market', icon: '📈' },
      { value: '100nm', label: 'Typical layer thickness', icon: '🔬' }
    ],
    examples: ['Camera lens coatings', 'Eyeglass anti-reflective', 'Solar panel efficiency', 'Smartphone screens'],
    companies: ['Zeiss', 'Essilor', 'Corning', 'HOYA'],
    futureImpact: 'Metamaterial coatings using nanostructures will enable tunable interference, creating surfaces that can switch between reflective and transparent.',
    color: '#06B6D4'
  },
  {
    icon: '📡',
    title: 'Radio Telescope Arrays',
    short: 'Imaging the universe with wave combining',
    tagline: 'Many dishes, one giant telescope',
    description: 'Radio telescopes combine signals from multiple antennas using interferometry. The interference pattern between dishes separated by kilometers creates resolution equivalent to a single dish that size, revealing unprecedented cosmic detail.',
    connection: 'Each antenna receives radio waves from space at slightly different times due to their separation. By carefully combining these signals (correlating phases), the interference pattern encodes spatial information about the source.',
    howItWorks: 'Atomic clocks synchronize antennas to femtosecond precision. Signals are recorded and combined by supercomputers that calculate how waves would interfere. The resulting interference pattern is transformed into an image.',
    stats: [
      { value: '10km', label: 'VLA baseline', icon: '📏' },
      { value: '25 microarcsec', label: 'EHT resolution', icon: '🎯' },
      { value: '5PB', label: 'Data per observation', icon: '💾' }
    ],
    examples: ['Event Horizon Telescope', 'Very Large Array', 'ALMA Observatory', 'SKA (under construction)'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'SKAO'],
    futureImpact: 'Space-based interferometers will achieve baselines of millions of kilometers, enabling us to image exoplanet surfaces.',
    color: '#1D4ED8'
  },
  {
    icon: '🔬',
    title: 'Gravitational Wave Detectors',
    short: 'Measuring ripples in spacetime',
    tagline: 'Detecting the universe vibrating',
    description: 'LIGO uses laser interferometry to detect gravitational waves - ripples in spacetime from colliding black holes. The interference pattern between perpendicular laser beams shifts by less than a proton width when a gravitational wave passes.',
    connection: 'A Michelson interferometer splits laser light into two perpendicular beams. When they recombine, any tiny path difference from a passing gravitational wave changes the interference pattern from constructive to partially destructive.',
    howItWorks: 'A 4km laser beam is split and sent down perpendicular arms. Mirrors reflect the beams back to recombine at a detector. A gravitational wave stretches one arm while compressing the other, shifting the interference fringe.',
    stats: [
      { value: '10^-19 m', label: 'Sensitivity', icon: '🎯' },
      { value: '4km', label: 'Arm length', icon: '📏' },
      { value: '100+', label: 'Detections made', icon: '🌟' }
    ],
    examples: ['LIGO Hanford', 'LIGO Livingston', 'Virgo detector', 'KAGRA Japan'],
    companies: ['LIGO Laboratory', 'Virgo Collaboration', 'KAGRA', 'LISA Pathfinder'],
    futureImpact: 'Space-based detectors like LISA will have million-kilometer baselines, detecting gravitational waves from supermassive black hole mergers.',
    color: '#7C3AED'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const WaveInterferenceRenderer: React.FC<WaveInterferenceRendererProps> = ({ onComplete, onGameEvent, gamePhase }) => {
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
  const [time, setTime] = useState(0);
  const [wavelength, setWavelength] = useState(40);
  const [sourceSeparation] = useState(120);
  const [probePos, setProbePos] = useState({ x: 250, y: 200 });
  const [hasFoundConstructive, setHasFoundConstructive] = useState(false);
  const [hasFoundDestructive, setHasFoundDestructive] = useState(false);

  // Twist phase - thin film
  const [filmThickness, setFilmThickness] = useState(300);

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

  // Canvas dimensions
  const canvasWidth = 500;
  const canvasHeight = 350;
  const sourceY = 50;
  const s1 = { x: canvasWidth / 2 - sourceSeparation / 2, y: sourceY };
  const s2 = { x: canvasWidth / 2 + sourceSeparation / 2, y: sourceY };

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Wave animation
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.08), 30);
    return () => clearInterval(interval);
  }, []);

  // Interference physics calculations
  const d1 = Math.sqrt(Math.pow(probePos.x - s1.x, 2) + Math.pow(probePos.y - s1.y, 2));
  const d2 = Math.sqrt(Math.pow(probePos.x - s2.x, 2) + Math.pow(probePos.y - s2.y, 2));
  const pathDiff = Math.abs(d1 - d2);
  const pathDiffInWavelengths = pathDiff / wavelength;
  const fractionalPart = pathDiffInWavelengths % 1;

  const getInterferenceType = useCallback((): 'constructive' | 'destructive' | 'intermediate' => {
    if (fractionalPart < 0.15 || fractionalPart > 0.85) return 'constructive';
    if (Math.abs(fractionalPart - 0.5) < 0.15) return 'destructive';
    return 'intermediate';
  }, [fractionalPart]);

  const interferenceType = getInterferenceType();
  const interferenceAmplitude = Math.cos(Math.PI * pathDiffInWavelengths);

  // Track discoveries
  useEffect(() => {
    if (phase === 'play') {
      if (interferenceType === 'constructive' && !hasFoundConstructive) {
        setHasFoundConstructive(true);
        playSound('success');
      }
      if (interferenceType === 'destructive' && !hasFoundDestructive) {
        setHasFoundDestructive(true);
        playSound('success');
      }
    }
  }, [interferenceType, hasFoundConstructive, hasFoundDestructive, phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#14b8a6', // Teal for waves
    accentGlow: 'rgba(20, 184, 166, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    wave1: '#14b8a6',
    wave2: '#2dd4bf',
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
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Transfer Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery Complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'wave-interference',
        gameTitle: 'Wave Interference',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Wave Interference Visualization SVG Component
  const WaveInterferenceVisualization = ({ interactive = true }: { interactive?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const numRipples = 8;

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;
      const newX = Math.max(20, Math.min(canvasWidth - 20, (e.clientX - rect.left) * scaleX));
      const newY = Math.max(80, Math.min(canvasHeight - 20, (e.clientY - rect.top) * scaleY));
      setProbePos({ x: newX, y: newY });
    };

    return (
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{ width: width, height: height, background: colors.bgCard, borderRadius: '12px', cursor: interactive ? 'crosshair' : 'default', touchAction: 'none' }}
        onPointerMove={handlePointerMove}
      >
        <defs>
          <linearGradient id="wiBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f1d32" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
          <filter id="wiGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={canvasWidth} height={canvasHeight} fill="url(#wiBg)" />
        <pattern id="wiGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={canvasWidth} height={canvasHeight} fill="url(#wiGrid)" />

        {/* Wave ripples from source 1 */}
        {Array.from({ length: numRipples }).map((_, i) => {
          const radius = ((time * 60 + i * wavelength) % (wavelength * numRipples));
          const opacity = 0.5 * (1 - radius / (wavelength * numRipples));
          return (
            <circle
              key={`s1-${i}`}
              cx={s1.x}
              cy={s1.y}
              r={radius}
              fill="none"
              stroke={colors.wave1}
              strokeWidth={2}
              opacity={opacity > 0 ? opacity : 0}
            />
          );
        })}

        {/* Wave ripples from source 2 */}
        {Array.from({ length: numRipples }).map((_, i) => {
          const radius = ((time * 60 + i * wavelength) % (wavelength * numRipples));
          const opacity = 0.5 * (1 - radius / (wavelength * numRipples));
          return (
            <circle
              key={`s2-${i}`}
              cx={s2.x}
              cy={s2.y}
              r={radius}
              fill="none"
              stroke={colors.wave2}
              strokeWidth={2}
              opacity={opacity > 0 ? opacity : 0}
            />
          );
        })}

        {/* Sources */}
        <g filter="url(#wiGlow)">
          <circle cx={s1.x} cy={s1.y} r={12} fill={colors.wave1} />
          <text x={s1.x} y={s1.y + 4} textAnchor="middle" fill="#0a1628" fontSize="11" fontWeight="bold">S1</text>
        </g>
        <g filter="url(#wiGlow)">
          <circle cx={s2.x} cy={s2.y} r={12} fill={colors.wave2} />
          <text x={s2.x} y={s2.y + 4} textAnchor="middle" fill="#0a1628" fontSize="11" fontWeight="bold">S2</text>
        </g>

        {/* Path lines */}
        <line x1={s1.x} y1={s1.y} x2={probePos.x} y2={probePos.y} stroke={colors.wave1} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
        <line x1={s2.x} y1={s2.y} x2={probePos.x} y2={probePos.y} stroke={colors.wave2} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

        {/* First constructive max indicator - moves with wavelength */}
        {(() => {
          const firstMaxY = sourceY + wavelength * 2.5;
          const clampedY = Math.min(firstMaxY, canvasHeight - 60);
          return (
            <circle cx={canvasWidth / 2} cy={clampedY} r={8}
              fill={colors.success} opacity="0.5" filter="url(#wiGlow)"
              stroke="#fff" strokeWidth="1" />
          );
        })()}

        {/* Probe point */}
        <circle cx={probePos.x} cy={probePos.y} r={20 + Math.abs(interferenceAmplitude) * 15}
          fill={interferenceType === 'constructive' ? colors.success : interferenceType === 'destructive' ? colors.error : colors.warning}
          opacity="0.3" />
        <circle cx={probePos.x} cy={probePos.y} r={12}
          fill={interferenceType === 'constructive' ? colors.success : interferenceType === 'destructive' ? colors.error : colors.warning}
          filter="url(#wiGlow)" />
        <text x={probePos.x} y={probePos.y + 35} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
          {interferenceType === 'constructive' ? 'CONSTRUCTIVE' : interferenceType === 'destructive' ? 'DESTRUCTIVE' : 'INTERMEDIATE'}
        </text>

        {/* Decorative wave path showing interference pattern */}
        <path d={`M 0 ${canvasHeight - 10} ${Array.from({length: 50}, (_, i) => {
          const xp = i * (canvasWidth / 50);
          const d1p = Math.sqrt(Math.pow(xp - s1.x, 2) + Math.pow(canvasHeight - 80 - s1.y, 2));
          const d2p = Math.sqrt(Math.pow(xp - s2.x, 2) + Math.pow(canvasHeight - 80 - s2.y, 2));
          const amp = Math.cos(Math.PI * Math.abs(d1p - d2p) / wavelength);
          return `L ${xp} ${canvasHeight - 10 - Math.abs(amp) * 95}`;
        }).join(' ')}`} fill="none" stroke={colors.wave1} strokeWidth="1.5" opacity="0.4" />

        {/* Info panel - Path Difference (top-left) */}
        <g className="info-panel-left">
          <rect x="20" y="20" width="140" height="60" rx="8" fill="#1e293b" opacity="0.95" />
          <text x="30" y="38" fill="#94a3b8" fontSize="11" fontWeight="bold">PATH DIFFERENCE</text>
          <text x="30" y="56" fill="#e2e8f0" fontSize="14" fontWeight="bold">{pathDiff.toFixed(1)} px</text>
          <text x="30" y="72" fill="#5eead4" fontSize="11">= {pathDiffInWavelengths.toFixed(2)} lambda</text>
        </g>

        {/* Info panel - Wavelength (top-right) */}
        <g className="info-panel-right">
          <rect x={canvasWidth - 150} y="20" width="140" height="60" rx="8" fill="#1e293b" opacity="0.95" />
          <text x={canvasWidth - 140} y="38" fill="#94a3b8" fontSize="11" fontWeight="bold">WAVELENGTH</text>
          <text x={canvasWidth - 140} y="56" fill={colors.accent} fontSize="14" fontWeight="bold">lambda = {wavelength} px</text>
        </g>

        {/* Amplitude indicator (bottom-center) */}
        <g className="amplitude-panel">
          <rect x={canvasWidth / 2 - 100} y={canvasHeight - 55} width="200" height="30" rx="8" fill="#1e293b" opacity="0.95" />
          <text x={canvasWidth / 2 - 85} y={canvasHeight - 35} fill="#94a3b8" fontSize="11" fontWeight="bold">AMPLITUDE:</text>
          <rect x={canvasWidth / 2} y={canvasHeight - 48} width={80 * Math.abs(interferenceAmplitude)} height="16" rx="4"
            fill={interferenceAmplitude > 0 ? colors.success : colors.error} />
          <text x={canvasWidth / 2 + 85} y={canvasHeight - 35} textAnchor="end" fill="#e2e8f0" fontSize="11" fontWeight="bold">
            {(interferenceAmplitude * 100).toFixed(0)}%
          </text>
        </g>
      </svg>
    );
  };

  // Thin Film Visualization for twist phase
  const ThinFilmVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;

    // Wavelengths for visible light (relative scale)
    const redWL = 700;
    const greenWL = 550;
    const blueWL = 450;

    // Calculate interference for each color based on film thickness
    const getIntensity = (thickness: number, wl: number) => {
      const pd = 2 * thickness;
      const phaseShift = (pd / wl) * 2 * Math.PI + Math.PI;
      return Math.pow(Math.cos(phaseShift / 2), 2);
    };

    const redI = getIntensity(filmThickness, redWL);
    const greenI = getIntensity(filmThickness, greenWL);
    const blueI = getIntensity(filmThickness, blueWL);

    const resultColor = `rgb(${Math.round(redI * 255)}, ${Math.round(greenI * 255)}, ${Math.round(blueI * 255)})`;

    return (
      <svg viewBox="0 0 500 350" style={{ width: width, height: height, background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="filmBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#0f1d32" />
          </linearGradient>
          <linearGradient id="soapFilm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={resultColor} stopOpacity="0.8" />
            <stop offset="50%" stopColor={resultColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={resultColor} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="350" fill="url(#filmBg)" />

        {/* Soap bubble */}
        <ellipse cx="250" cy="175" rx="120" ry="100" fill="url(#soapFilm)" stroke="#64748b" strokeWidth="1" />
        <ellipse cx="250" cy="175" rx="118" ry="98" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Incoming light ray */}
        <line x1="100" y1="50" x2="180" y2="120" stroke={colors.warning} strokeWidth="3" />
        <polygon points="175,115 185,120 180,130" fill={colors.warning} />
        <text x="90" y="45" fill={colors.warning} fontSize="12" fontWeight="bold">White Light</text>

        {/* Top reflection */}
        <line x1="180" y1="120" x2="100" y2="150" stroke={colors.error} strokeWidth="2" strokeDasharray="5,5" />
        <text x="70" y="165" fill={colors.error} fontSize="11">Reflection 1</text>

        {/* Bottom reflection */}
        <line x1="180" y1="120" x2="200" y2="180" stroke={colors.success} strokeWidth="2" opacity="0.5" />
        <line x1="200" y1="180" x2="120" y2="210" stroke={colors.success} strokeWidth="2" strokeDasharray="5,5" />
        <text x="70" y="225" fill={colors.success} fontSize="11">Reflection 2</text>

        {/* Film thickness indicator */}
        <line x1="380" y1="125" x2="380" y2="225" stroke="#5eead4" strokeWidth="2" />
        <line x1="370" y1="125" x2="390" y2="125" stroke="#5eead4" strokeWidth="2" />
        <line x1="370" y1="225" x2="390" y2="225" stroke="#5eead4" strokeWidth="2" />
        <text x="395" y="180" fill="#5eead4" fontSize="12" fontWeight="bold">t = {filmThickness} nm</text>

        {/* Color result panel */}
        <rect x="320" y="260" width="160" height="70" rx="8" fill="#1e293b" opacity="0.95" />
        <text x="330" y="280" fill="#64748b" fontSize="11" fontWeight="bold">RESULTING COLOR</text>
        <rect x="330" y="290" width="140" height="30" rx="4" fill={resultColor} />

        {/* Path difference info */}
        <rect x="20" y="260" width="180" height="70" rx="8" fill="#1e293b" opacity="0.95" />
        <text x="30" y="280" fill="#64748b" fontSize="11" fontWeight="bold">PATH DIFFERENCE</text>
        <text x="30" y="305" fill="#e2e8f0" fontSize="14" fontWeight="bold">2t = {2 * filmThickness} nm</text>
        <text x="30" y="320" fill="#5eead4" fontSize="11">+ phase shift at reflection</text>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0d9488)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Helper to check if navigation should be disabled
  const currentIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < phaseOrder.length - 1 && phase !== 'test';

  // Fixed bottom navigation bar
  const renderBottomNav = () => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(18, 18, 26, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${colors.border}`,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        maxWidth: '800px',
        margin: '0 auto',
        gap: '12px',
      }}>
        {/* Back button */}
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: canGoBack ? colors.bgCard : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            minHeight: '48px',
            opacity: canGoBack ? 1 : 0.4,
          }}
        >
          Back
        </button>

        {/* Phase label */}
        <span style={{ ...typo.small, color: colors.textMuted }}>
          {phaseLabels[phase]}
        </span>

        {/* Next button */}
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent}, #0d9488)` : colors.bgCard,
            color: 'white',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            minHeight: '48px',
            opacity: canGoNext ? 1 : 0.4,
          }}
        >
          Next
        </button>
      </div>
    </nav>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          paddingBottom: '100px',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🌊
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Wave Interference
          </h1>

          <p
            className="text-secondary"
            style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              marginBottom: '32px',
            }}>
            When waves meet, amazing things happen. Learn how two waves can create <span style={{ color: colors.success }}>LOUDER</span> sounds or <span style={{ color: colors.error }}>COMPLETE SILENCE</span>!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Interference is everywhere - from the colorful patterns on soap bubbles to the silence created by noise-canceling headphones. Understanding how waves combine is key to technologies from holography to gravitational wave detection."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - Wave Physics Principles
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Begin Discovery
          </button>

          {renderNavDots()}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // Static SVG for predict phase (no interaction, just visual setup)
  const StaticWaveVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;

    return (
      <svg
        viewBox={`0 0 ${canvasWidth} 280`}
        style={{ width: width, height: height, background: colors.bgCard, borderRadius: '12px' }}
      >
        <defs>
          <linearGradient id="predictBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f1d32" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={canvasWidth} height="280" fill="url(#predictBg)" />

        {/* Static ripples from source 1 */}
        {[40, 80, 120, 160].map((r, i) => (
          <circle
            key={`s1-${i}`}
            cx={canvasWidth / 2 - 60}
            cy={50}
            r={r}
            fill="none"
            stroke={colors.wave1}
            strokeWidth={2}
            opacity={0.4 - i * 0.08}
          />
        ))}

        {/* Static ripples from source 2 */}
        {[40, 80, 120, 160].map((r, i) => (
          <circle
            key={`s2-${i}`}
            cx={canvasWidth / 2 + 60}
            cy={50}
            r={r}
            fill="none"
            stroke={colors.wave2}
            strokeWidth={2}
            opacity={0.4 - i * 0.08}
          />
        ))}

        {/* Sources */}
        <circle cx={canvasWidth / 2 - 60} cy={50} r={12} fill={colors.wave1} />
        <text x={canvasWidth / 2 - 60} y={54} textAnchor="middle" fill="#0a1628" fontSize="11" fontWeight="bold">S1</text>
        <circle cx={canvasWidth / 2 + 60} cy={50} r={12} fill={colors.wave2} />
        <text x={canvasWidth / 2 + 60} y={54} textAnchor="middle" fill="#0a1628" fontSize="11" fontWeight="bold">S2</text>

        {/* Question mark at center */}
        <circle cx={canvasWidth / 2} cy={180} r={20} fill={colors.warning} opacity={0.3} />
        <text x={canvasWidth / 2} y={188} textAnchor="middle" fill={colors.warning} fontSize="24" fontWeight="bold">?</text>

        {/* Labels */}
        <text x={canvasWidth / 2} y={230} textAnchor="middle" fill={colors.textSecondary} fontSize="12">
          Where will sound be loudest? Quietest?
        </text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Closer to either speaker - more sound energy = louder' },
      { id: 'b', text: 'Where path lengths match - equal distances = waves align', correct: true },
      { id: 'c', text: 'It varies randomly - no predictable pattern' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Two speakers play the same tone. As you move around the room, what determines whether you hear LOUD sound or near SILENCE?
            </h2>

            {/* Static SVG diagram */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <StaticWaveVisualization />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Test My Prediction
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Wave Interference Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '24px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Interactive Two-Source Interference
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
              This visualization displays how two wave sources create interference patterns. Watch how the pattern changes as you explore different positions.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              When wavelength increases, the interference fringes spread apart because the same path difference represents fewer wavelengths. This is important for real-world applications in noise-canceling technology and radar systems.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <WaveInterferenceVisualization interactive={true} />
              </div>

              {/* Wavelength slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Wavelength (lambda)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{wavelength} px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={wavelength}
                  onChange={(e) => setWavelength(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    background: colors.bgSecondary,
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                  } as React.CSSProperties}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>20 (short)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>80 (long)</span>
                </div>
              </div>

              {/* Real-time calculated values */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-around',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: '#e2e8f0' }}>Path Diff</div>
                  <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{pathDiff.toFixed(1)} px</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: '#e2e8f0' }}>Ratio</div>
                  <div style={{ ...typo.body, color: colors.accent, fontWeight: 600 }}>{pathDiffInWavelengths.toFixed(2)} lambda</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: '#e2e8f0' }}>Amplitude Factor</div>
                  <div style={{ ...typo.body, color: interferenceAmplitude > 0 ? colors.success : colors.error, fontWeight: 600 }}>{(Math.abs(interferenceAmplitude) * 2).toFixed(2)}x</div>
                </div>
              </div>

              {/* Discovery trackers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: hasFoundConstructive ? `${colors.success}22` : colors.bgSecondary,
                  border: `2px solid ${hasFoundConstructive ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{hasFoundConstructive ? '✓' : '○'}</div>
                  <div style={{ ...typo.small, color: hasFoundConstructive ? colors.success : colors.textMuted, fontWeight: 600 }}>
                    {hasFoundConstructive ? 'FOUND' : 'FIND'} CONSTRUCTIVE
                  </div>
                </div>
                <div style={{
                  background: hasFoundDestructive ? `${colors.error}22` : colors.bgSecondary,
                  border: `2px solid ${hasFoundDestructive ? colors.error : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{hasFoundDestructive ? '✓' : '○'}</div>
                  <div style={{ ...typo.small, color: hasFoundDestructive ? colors.error : colors.textMuted, fontWeight: 600 }}>
                    {hasFoundDestructive ? 'FOUND' : 'FIND'} DESTRUCTIVE
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {hasFoundConstructive && hasFoundDestructive && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Great! You found both types of interference! Ready to understand why?
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              disabled={!(hasFoundConstructive && hasFoundDestructive)}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: (hasFoundConstructive && hasFoundDestructive) ? 1 : 0.5,
                cursor: (hasFoundConstructive && hasFoundDestructive) ? 'pointer' : 'not-allowed',
              }}
            >
              Understand the Physics
            </button>
          </div>

          {renderNavDots()}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Key is Path Difference!
          </h2>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
              As you observed in the experiment, {prediction === 'b' ? 'your prediction was correct! ' : ''}the interference pattern depends on the path lengths from each source.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                Whether waves add up or cancel depends on how their <strong style={{ color: colors.textPrimary }}>PATH LENGTHS</strong> compare to the <strong style={{ color: colors.accent }}>WAVELENGTH</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>+</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Constructive</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Path diff = 0, 1 lambda, 2 lambda, 3 lambda...<br/>
                Peaks align with peaks = Maximum amplitude!
              </p>
            </div>

            <div style={{
              background: `${colors.error}11`,
              border: `1px solid ${colors.error}33`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>-</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Destructive</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Path diff = 0.5 lambda, 1.5 lambda, 2.5 lambda...<br/>
                Peak meets trough = Cancellation!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Interference Conditions
            </h3>
            <p style={{ ...typo.h2, color: colors.success, marginBottom: '8px' }}>
              Constructive: delta d = n lambda
            </p>
            <p style={{ ...typo.h2, color: colors.error, marginBottom: '8px' }}>
              Destructive: delta d = (n + 0.5) lambda
            </p>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              where n = 0, 1, 2, 3... and lambda = wavelength
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See a New Application
          </button>

          {renderNavDots()}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Soap contains colored dyes - the soap itself is colorful' },
      { id: 'b', text: 'Light waves interfere in the thin film - reflections from front and back surfaces', correct: true },
      { id: 'c', text: 'Light bends through the bubble - like a prism splitting light' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Scenario: Thin Film Interference
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why Do Soap Bubbles Show Rainbow Colors?
          </h2>

          {/* Static thin film diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 400 200" style={{ width: isMobile ? 300 : 400, height: isMobile ? 150 : 200, background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <linearGradient id="thinFilmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.6" />
                  <stop offset="25%" stopColor="#ffd93d" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#6bcb77" stopOpacity="0.6" />
                  <stop offset="75%" stopColor="#4d96ff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#9b59b6" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Background */}
              <rect width="400" height="200" fill="#0a1628" />
              {/* Soap bubble shape */}
              <ellipse cx="200" cy="100" rx="100" ry="70" fill="url(#thinFilmGrad)" stroke="#64748b" strokeWidth="1" />
              <ellipse cx="200" cy="100" rx="98" ry="68" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              {/* Rainbow shimmer effect */}
              <ellipse cx="165" cy="70" rx="30" ry="15" fill="rgba(255,255,255,0.2)" />
              {/* Label */}
              <text x="200" y="185" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Soap Bubble with Rainbow Patterns</text>
            </svg>
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Soap bubbles display beautiful rainbow patterns. What causes these colors to appear?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore Thin Films
            </button>
          )}

          {renderNavDots()}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Interactive Thin Film
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust film thickness to see how colors change
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ThinFilmVisualization />
            </div>

            {/* Thickness slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Film Thickness</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{filmThickness} nm</span>
              </div>
              <input
                type="range"
                min="100"
                max="700"
                value={filmThickness}
                onChange={(e) => setFilmThickness(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: '#3b82f6',
                  background: colors.bgSecondary,
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                } as React.CSSProperties}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>100 nm (thin)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>700 nm (thick)</span>
              </div>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Watch how the resulting color changes as you adjust the thickness. Different thicknesses cause different wavelengths to interfere constructively!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>

          {renderNavDots()}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Soap Bubbles Show Rainbow Colors
          </h2>

          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect
                ? 'Correct! Thin film interference creates the beautiful colors.'
                : 'The colors come from thin film interference, not dyes or simple refraction!'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.warning + '33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.warning,
                  fontWeight: 700,
                }}>1</span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Light hits the <strong style={{ color: colors.textPrimary }}>front surface</strong> and reflects.
                </p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.warning + '33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.warning,
                  fontWeight: 700,
                }}>2</span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Light also reflects from the <strong style={{ color: colors.textPrimary }}>back surface</strong>.
                </p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.warning + '33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.warning,
                  fontWeight: 700,
                }}>3</span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  These reflections create a <strong style={{ color: colors.textPrimary }}>path difference = 2t</strong>.
                </p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.warning + '33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.warning,
                  fontWeight: 700,
                }}>4</span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Different <strong style={{ color: colors.textPrimary }}>wavelengths (colors)</strong> interfere differently based on thickness!
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.success}11`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${colors.success}33`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              As the bubble's thickness varies, different colors get enhanced or cancelled. That's why you see swirling rainbow patterns that change as the bubble moves!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>

          {renderNavDots()}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
            </p>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
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
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              borderLeft: `4px solid ${app.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How Interference Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              {/* How it works section */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              {/* Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Key metric highlight for statistics matching */}
              <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
                This technology impacts billions of users and generates $35 billion in market value annually.
              </p>

              {/* Got It button for current app */}
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  // Auto-advance to next app if not on the last one
                  if (selectedApp < realWorldApps.length - 1 && !completedApps[selectedApp + 1]) {
                    setTimeout(() => setSelectedApp(selectedApp + 1), 300);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: completedApps[selectedApp]
                    ? `${colors.success}33`
                    : `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: completedApps[selectedApp] ? colors.success : 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                {completedApps[selectedApp] ? 'Completed' : 'Got It - Next Application'}
              </button>
            </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            )}

            {renderNavDots()}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
        height: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingBottom: '100px',
          }}>
            <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand wave interference!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}

            {renderNavDots()}
          </div>
          </div>

          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Header */}
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Knowledge Test: Wave Interference
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Test your understanding of constructive and destructive interference. Each question presents a real scenario where wave interference plays a key role.
          </p>

          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
            {renderNavDots()}
          </div>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          paddingBottom: '100px',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Wave Interference Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You've mastered how waves combine! From noise cancellation to holography, you now understand the beautiful physics of constructive and destructive interference.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Key Takeaways:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Path difference determines interference type',
                'Constructive: waves add (peaks align)',
                'Destructive: waves cancel (peak meets trough)',
                'Thin films create colorful patterns',
                'Used in noise cancellation, optics, and astronomy',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
            <button
              onClick={() => {
                if (onComplete) onComplete();
              }}
              style={primaryButtonStyle}
            >
              Complete Lesson
            </button>
          </div>

          {renderNavDots()}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default WaveInterferenceRenderer;
