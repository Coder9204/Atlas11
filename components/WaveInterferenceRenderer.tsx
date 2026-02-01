'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const realWorldApps = [
  {
    icon: '🎧',
    title: 'Noise-Canceling Headphones',
    short: 'Creating silence with sound waves',
    tagline: 'Fighting noise with physics',
    description: 'Active noise cancellation uses microphones to detect ambient sound and generates an anti-phase wave that destructively interferes with the noise. When the waves combine, they cancel out, creating perceived silence.',
    connection: 'This is direct application of wave interference - when two waves of equal amplitude meet 180° out of phase, they undergo destructive interference and cancel completely.',
    howItWorks: 'Microphones sample external sound hundreds of times per second. DSP chips calculate the inverse waveform and speakers play it in real-time. The original noise and anti-noise interfere destructively, reducing perceived volume by up to 45dB.',
    stats: [
      { value: '45dB', label: 'Max noise reduction', icon: '🔇' },
      { value: '$35B', label: 'Headphone market', icon: '📈' },
      { value: '1μs', label: 'Processing latency', icon: '⚡' }
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
      { value: '25μas', label: 'EHT resolution', icon: '🎯' },
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
      { value: '10⁻¹⁹m', label: 'Sensitivity', icon: '🎯' },
      { value: '4km', label: 'Arm length', icon: '📏' },
      { value: '100+', label: 'Detections made', icon: '🌟' }
    ],
    examples: ['LIGO Hanford', 'LIGO Livingston', 'Virgo detector', 'KAGRA Japan'],
    companies: ['LIGO Laboratory', 'Virgo Collaboration', 'KAGRA', 'LISA Pathfinder'],
    futureImpact: 'Space-based detectors like LISA will have million-kilometer baselines, detecting gravitational waves from supermassive black hole mergers.',
    color: '#7C3AED'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

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

interface WaveInterferenceRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// --- MAIN COMPONENT ---
const WaveInterferenceRenderer: React.FC<WaveInterferenceRendererProps> = ({ onComplete, onGameEvent, gamePhase, onPhaseComplete }) => {
  // --- PHASE MANAGEMENT ---
  const [phase, setPhase] = useState<Phase>('hook');
  const lastClickRef = useRef(0);

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Web Audio API sound
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

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [sourceSeparation] = useState(120);
  const [wavelength, setWavelength] = useState(40);
  const [probePos, setProbePos] = useState({ x: 250, y: 200 });
  const [hasFoundConstructive, setHasFoundConstructive] = useState(false);
  const [hasFoundDestructive, setHasFoundDestructive] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [filmThickness, setFilmThickness] = useState(300);

  // Canvas dimensions
  const canvasWidth = 500;
  const canvasHeight = 350;
  const sourceY = 50;
  const s1 = { x: canvasWidth / 2 - sourceSeparation / 2, y: sourceY };
  const s2 = { x: canvasWidth / 2 + sourceSeparation / 2, y: sourceY };

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  // --- WAVE ANIMATION ---
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.08), 30);
    return () => clearInterval(interval);
  }, []);

  // --- INTERFERENCE PHYSICS ---
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

  // --- EVENT EMITTER ---
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // --- NAVIGATION ---
  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;

    lastClickRef.current = now;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);

    if (newPhase === 'play' || newPhase === 'twist_play') {
      setProbePos({ x: 250, y: 200 });
    }
  }, [emitEvent, phase, playSound, onPhaseComplete]);

  // --- MILESTONE TRACKING ---
  useEffect(() => {
    if (interferenceType === 'constructive' && !hasFoundConstructive) {
      setHasFoundConstructive(true);
      emitEvent('simulation_started', { type: 'found_constructive' });
    }
    if (interferenceType === 'destructive' && !hasFoundDestructive) {
      setHasFoundDestructive(true);
      emitEvent('simulation_started', { type: 'found_destructive' });
    }
  }, [interferenceType, hasFoundConstructive, hasFoundDestructive, emitEvent]);

  // --- TEST QUESTIONS ---
  const testQuestions = useMemo(() => [
    {
      scenario: "Two speakers emit the same tone. At point P, the path difference from the two speakers is exactly 2 wavelengths.",
      question: "What type of interference occurs at point P?",
      options: [
        { text: "Constructive interference", correct: true },
        { text: "Destructive interference", correct: false },
        { text: "No interference", correct: false },
        { text: "Partial cancellation", correct: false }
      ],
      explanation: "Path difference = 2\u03bb = whole number of wavelengths. Waves arrive in phase (peak meets peak), so they add up \u2192 constructive interference!"
    },
    {
      scenario: "At another location, the path difference is 2.5 wavelengths.",
      question: "What happens at this point?",
      options: [
        { text: "Maximum amplitude", correct: false },
        { text: "Minimum amplitude (near silence)", correct: true },
        { text: "Average amplitude", correct: false },
        { text: "Doubled frequency", correct: false }
      ],
      explanation: "Path difference = 2.5\u03bb = (n + 0.5)\u03bb. Waves arrive out of phase (peak meets trough) \u2192 destructive interference, near-silence!"
    },
    {
      scenario: "The wavelength of a wave is 20 cm. Two sources are separated by 60 cm.",
      question: "At what minimum path difference will you find constructive interference?",
      options: [
        { text: "0 cm (on the center line)", correct: true },
        { text: "10 cm", correct: false },
        { text: "30 cm", correct: false },
        { text: "60 cm", correct: false }
      ],
      explanation: "Constructive interference occurs when \u0394d = n\u03bb. The minimum is \u0394d = 0 (center line), where both waves travel equal distances."
    },
    {
      scenario: "Noise-canceling headphones work by creating a wave that is out of phase with ambient noise.",
      question: "What path/phase difference do they create?",
      options: [
        { text: "0 wavelengths", correct: false },
        { text: "0.5 wavelengths (half wavelength)", correct: true },
        { text: "1 wavelength", correct: false },
        { text: "2 wavelengths", correct: false }
      ],
      explanation: "To cancel noise, the anti-noise wave must arrive 180\u00b0 (half wavelength) out of phase. Peak meets trough \u2192 destructive interference \u2192 silence!"
    },
    {
      scenario: "You decrease the wavelength while keeping the source separation constant.",
      question: "What happens to the interference pattern?",
      options: [
        { text: "Pattern spreads out", correct: false },
        { text: "Pattern becomes more closely spaced", correct: true },
        { text: "Pattern disappears", correct: false },
        { text: "Pattern stays the same", correct: false }
      ],
      explanation: "Shorter \u03bb means the same physical distance corresponds to MORE wavelengths. The maxima/minima become more closely spaced."
    },
    {
      scenario: "In a double-slit experiment, the central maximum (bright fringe) is always at the center.",
      question: "Why is this?",
      options: [
        { text: "Both paths have equal length \u2192 \u0394d = 0 \u2192 constructive", correct: true },
        { text: "Light naturally combines at center", correct: false },
        { text: "Slits focus light to center", correct: false },
        { text: "It's just coincidence", correct: false }
      ],
      explanation: "At the center, both waves travel exactly the same distance from their sources. Path difference = 0 = 0\u03bb \u2192 always constructive!"
    },
    {
      scenario: "Radio signals from two towers can cancel at certain locations.",
      question: "What is this phenomenon called?",
      options: [
        { text: "Signal amplification", correct: false },
        { text: "Dead zone or null point", correct: true },
        { text: "Signal reflection", correct: false },
        { text: "Atmospheric absorption", correct: false }
      ],
      explanation: "When radio waves from two sources arrive out of phase at a location, they cancel \u2192 creating 'dead zones' where reception is poor."
    },
    {
      scenario: "The path difference at a point is 3.25\u03bb.",
      question: "Is this closer to constructive or destructive interference?",
      options: [
        { text: "Closer to constructive (3\u03bb)", correct: false },
        { text: "Closer to destructive (3.5\u03bb)", correct: true },
        { text: "Exactly in between", correct: false },
        { text: "Neither - no interference", correct: false }
      ],
      explanation: "3.25\u03bb is closer to 3.5\u03bb (destructive) than to 3\u03bb (constructive). The wave will be partially cancelled."
    },
    {
      scenario: "Soap bubbles show colorful patterns due to thin-film interference.",
      question: "What causes different colors in different regions?",
      options: [
        { text: "Different soap concentrations", correct: false },
        { text: "Different film thickness \u2192 different path differences", correct: true },
        { text: "Trapped air bubbles", correct: false },
        { text: "Random light scattering", correct: false }
      ],
      explanation: "Film thickness varies across the bubble. Different thicknesses create different path differences for each color wavelength."
    },
    {
      scenario: "WiFi signals from your router reflect off walls, creating multiple paths.",
      question: "What causes WiFi 'dead zones' in your home?",
      options: [
        { text: "Signal too weak", correct: false },
        { text: "Destructive interference between direct and reflected waves", correct: true },
        { text: "Wall absorption", correct: false },
        { text: "Router malfunction", correct: false }
      ],
      explanation: "Where direct and reflected waves have path differences of (n+\u00bd)\u03bb, destructive interference creates weak signal zones!"
    },
  ], []);

  // --- APPLICATION DATA ---
  const applications = useMemo(() => [
    {
      id: 'noise',
      title: 'Noise Cancellation',
      icon: '\ud83c\udfa7',
      description: 'How headphones create silence from sound.',
      physics: 'Microphones detect ambient noise. Processors generate an anti-phase signal (shifted by \u03bb/2). When this meets the original noise, destructive interference cancels it.',
      formula: 'Anti-noise phase = Original + \u03bb/2',
    },
    {
      id: 'coating',
      title: 'Anti-reflective Coatings',
      icon: '\ud83d\udc53',
      description: 'How camera lenses and glasses reduce glare.',
      physics: 'A thin coating creates two reflections: from the top and bottom surfaces. When coating thickness = \u03bb/4, reflected waves are exactly out of phase and cancel.',
      formula: 't = \u03bb/(4n)',
    },
    {
      id: 'holography',
      title: 'Holography',
      icon: '\ud83c\udf1f',
      description: 'Creating 3D images using interference patterns.',
      physics: 'A reference beam interferes with light reflected from an object. The interference pattern encodes 3D information. When illuminated, it recreates the original wavefront.',
      formula: 'I = |E_ref + E_obj|^2',
    },
    {
      id: 'radio',
      title: 'Radio Antennas',
      icon: '\ud83d\udce1',
      description: 'How antenna arrays create directional beams.',
      physics: 'Multiple antennas emit signals with controlled phase differences. Constructive interference creates strong beams in desired directions, while destructive interference reduces signals elsewhere.',
      formula: '\u03b8_max = arcsin(m\u03bb/d)',
    },
  ], []);

  // --- SVG VISUALIZER ---
  const renderInterferenceVisualizer = (interactive: boolean = true) => {
    const numRipples = 8;

    return (
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full h-full cursor-crosshair"
        onMouseMove={interactive ? (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const scaleX = canvasWidth / rect.width;
          const scaleY = canvasHeight / rect.height;
          const newX = Math.max(20, Math.min(canvasWidth - 20, (e.clientX - rect.left) * scaleX));
          const newY = Math.max(80, Math.min(canvasHeight - 20, (e.clientY - rect.top) * scaleY));
          setProbePos({ x: newX, y: newY });
        } : undefined}
        onTouchMove={interactive ? (e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const scaleX = canvasWidth / rect.width;
          const scaleY = canvasHeight / rect.height;
          const newX = Math.max(20, Math.min(canvasWidth - 20, (touch.clientX - rect.left) * scaleX));
          const newY = Math.max(80, Math.min(canvasHeight - 20, (touch.clientY - rect.top) * scaleY));
          setProbePos({ x: newX, y: newY });
        } : undefined}
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
              stroke="#14b8a6"
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
              stroke="#2dd4bf"
              strokeWidth={2}
              opacity={opacity > 0 ? opacity : 0}
            />
          );
        })}

        {/* Sources */}
        <g filter="url(#wiGlow)">
          <circle cx={s1.x} cy={s1.y} r={12} fill="#14b8a6" />
          <text x={s1.x} y={s1.y + 4} textAnchor="middle" fill="#0a1628" fontSize="10" fontWeight="bold">S\u2081</text>
        </g>
        <g filter="url(#wiGlow)">
          <circle cx={s2.x} cy={s2.y} r={12} fill="#2dd4bf" />
          <text x={s2.x} y={s2.y + 4} textAnchor="middle" fill="#0a1628" fontSize="10" fontWeight="bold">S\u2082</text>
        </g>

        {/* Path lines */}
        <line x1={s1.x} y1={s1.y} x2={probePos.x} y2={probePos.y} stroke="#14b8a6" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
        <line x1={s2.x} y1={s2.y} x2={probePos.x} y2={probePos.y} stroke="#2dd4bf" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

        {/* Probe point */}
        <g transform={`translate(${probePos.x}, ${probePos.y})`}>
          <circle r={20 + Math.abs(interferenceAmplitude) * 15}
            fill={interferenceType === 'constructive' ? '#22c55e' : interferenceType === 'destructive' ? '#ef4444' : '#f59e0b'}
            opacity="0.3" />
          <circle r={12} fill={interferenceType === 'constructive' ? '#22c55e' : interferenceType === 'destructive' ? '#ef4444' : '#f59e0b'} />
          <text y={35} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
            {interferenceType === 'constructive' ? '\u2713 CONSTRUCTIVE' : interferenceType === 'destructive' ? '\u2717 DESTRUCTIVE' : '~ INTERMEDIATE'}
          </text>
        </g>

        {/* Info panels */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="130" height="55" rx="8" fill="#1e293b" opacity="0.95" />
          <text x="10" y="18" fill="#64748b" fontSize="9" fontWeight="bold">PATH DIFFERENCE</text>
          <text x="10" y="38" fill="#e2e8f0" fontSize="14" fontWeight="bold">{pathDiff.toFixed(1)} px</text>
          <text x="70" y="38" fill="#5eead4" fontSize="11">= {pathDiffInWavelengths.toFixed(2)}\u03bb</text>
        </g>

        <g transform={`translate(${canvasWidth - 150}, 20)`}>
          <rect x="0" y="0" width="130" height="55" rx="8" fill="#1e293b" opacity="0.95" />
          <text x="10" y="18" fill="#64748b" fontSize="9" fontWeight="bold">WAVELENGTH</text>
          <text x="10" y="38" fill="#14b8a6" fontSize="14" fontWeight="bold">\u03bb = {wavelength} px</text>
        </g>

        {/* Amplitude indicator */}
        <g transform={`translate(${canvasWidth / 2}, ${canvasHeight - 40})`}>
          <rect x="-100" y="-15" width="200" height="30" rx="8" fill="#1e293b" opacity="0.95" />
          <text x="-85" y="5" fill="#64748b" fontSize="9" fontWeight="bold">AMPLITUDE:</text>
          <rect x="0" y="-8" width={80 * Math.abs(interferenceAmplitude)} height="16" rx="4"
            fill={interferenceAmplitude > 0 ? '#22c55e' : '#ef4444'} />
          <text x="85" y="5" textAnchor="end" fill="#e2e8f0" fontSize="10" fontWeight="bold">
            {(interferenceAmplitude * 100).toFixed(0)}%
          </text>
        </g>
      </svg>
    );
  };

  // --- THIN FILM VISUALIZER ---
  const renderThinFilmVisualizer = () => {
    // Wavelengths for visible light (relative scale)
    const redWL = 700;
    const greenWL = 550;
    const blueWL = 450;

    // Calculate interference for each color based on film thickness
    const getIntensity = (thickness: number, wavelength: number) => {
      const pathDiff = 2 * thickness;
      const phaseShift = (pathDiff / wavelength) * 2 * Math.PI + Math.PI; // +PI for phase change at reflection
      return Math.pow(Math.cos(phaseShift / 2), 2);
    };

    const redI = getIntensity(filmThickness, redWL);
    const greenI = getIntensity(filmThickness, greenWL);
    const blueI = getIntensity(filmThickness, blueWL);

    const resultColor = `rgb(${Math.round(redI * 255)}, ${Math.round(greenI * 255)}, ${Math.round(blueI * 255)})`;

    return (
      <svg viewBox="0 0 500 350" className="w-full h-full">
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
        <line x1="100" y1="50" x2="180" y2="120" stroke="#f59e0b" strokeWidth="3" />
        <polygon points="175,115 185,120 180,130" fill="#f59e0b" />
        <text x="90" y="45" fill="#f59e0b" fontSize="12" fontWeight="bold">White Light</text>

        {/* Top reflection */}
        <line x1="180" y1="120" x2="100" y2="150" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
        <text x="70" y="165" fill="#ef4444" fontSize="10">Reflection 1</text>

        {/* Bottom reflection */}
        <line x1="180" y1="120" x2="200" y2="180" stroke="#22c55e" strokeWidth="2" opacity="0.5" />
        <line x1="200" y1="180" x2="120" y2="210" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
        <text x="70" y="225" fill="#22c55e" fontSize="10">Reflection 2</text>

        {/* Film thickness indicator */}
        <line x1="380" y1="125" x2="380" y2="225" stroke="#5eead4" strokeWidth="2" />
        <line x1="370" y1="125" x2="390" y2="125" stroke="#5eead4" strokeWidth="2" />
        <line x1="370" y1="225" x2="390" y2="225" stroke="#5eead4" strokeWidth="2" />
        <text x="395" y="180" fill="#5eead4" fontSize="12" fontWeight="bold">t = {filmThickness} nm</text>

        {/* Color result panel */}
        <rect x="320" y="260" width="160" height="70" rx="8" fill="#1e293b" opacity="0.95" />
        <text x="330" y="280" fill="#64748b" fontSize="10" fontWeight="bold">RESULTING COLOR</text>
        <rect x="330" y="290" width="140" height="30" rx="4" fill={resultColor} />

        {/* Path difference info */}
        <rect x="20" y="260" width="180" height="70" rx="8" fill="#1e293b" opacity="0.95" />
        <text x="30" y="280" fill="#64748b" fontSize="10" fontWeight="bold">PATH DIFFERENCE</text>
        <text x="30" y="305" fill="#e2e8f0" fontSize="14" fontWeight="bold">2t = {2 * filmThickness} nm</text>
        <text x="30" y="320" fill="#5eead4" fontSize="10">+ phase shift at reflection</text>
      </svg>
    );
  };

  // --- APPLICATION SVG GRAPHICS ---
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'noise':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Headphones */}
            <path d="M60,80 Q60,30 100,30 Q140,30 140,80" fill="none" stroke="#374151" strokeWidth="8" />
            <ellipse cx="55" cy="85" rx="15" ry="20" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <ellipse cx="145" cy="85" rx="15" ry="20" fill="#1f2937" stroke="#374151" strokeWidth="2" />

            {/* Noise waves (red) */}
            <path d="M10,60 Q25,40 40,60 Q55,80 70,60" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.7">
              <animate attributeName="d" values="M10,60 Q25,40 40,60 Q55,80 70,60;M10,65 Q25,45 40,65 Q55,85 70,65;M10,60 Q25,40 40,60 Q55,80 70,60" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Anti-noise waves (green, inverted) */}
            <path d="M45,60 Q60,80 75,60 Q90,40 105,60" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.7">
              <animate attributeName="d" values="M45,60 Q60,80 75,60 Q90,40 105,60;M45,65 Q60,85 75,65 Q90,45 105,65;M45,60 Q60,80 75,60 Q90,40 105,60" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Cancelled result (flat line) */}
            <line x1="80" y1="60" x2="120" y2="60" stroke="#64748b" strokeWidth="2" strokeDasharray="4,4" />

            {/* Speaker icon */}
            <rect x="5" y="50" width="15" height="20" rx="2" fill="#6b7280" />
            <path d="M20,50 L30,40 L30,80 L20,70 Z" fill="#6b7280" />

            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Destructive Interference \u2192 Silence</text>
          </svg>
        );

      case 'coating':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Lens */}
            <ellipse cx="100" cy="60" rx="60" ry="40" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" />

            {/* Coating layer */}
            <ellipse cx="100" cy="60" rx="62" ry="42" fill="none" stroke="#8b5cf6" strokeWidth="3" opacity="0.7" />

            {/* Incoming light */}
            <line x1="40" y1="20" x2="70" y2="45" stroke="#f59e0b" strokeWidth="2" />
            <polygon points="68,42 75,45 70,52" fill="#f59e0b" />

            {/* Reflection 1 (from coating) */}
            <line x1="70" y1="45" x2="40" y2="60" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            {/* Reflection 2 (from glass, cancelled) */}
            <line x1="72" y1="48" x2="42" y2="65" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            {/* Transmitted light */}
            <line x1="70" y1="45" x2="130" y2="75" stroke="#22c55e" strokeWidth="2" />
            <polygon points="128,72 135,77 127,80" fill="#22c55e" />

            <text x="30" y="80" fill="#ef4444" fontSize="8">Reflections cancel</text>
            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Coating thickness = \u03bb/4</text>
          </svg>
        );

      case 'holography':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Laser source */}
            <rect x="10" y="45" width="25" height="20" rx="3" fill="#ef4444" />
            <text x="22" y="58" textAnchor="middle" fill="white" fontSize="8">LASER</text>

            {/* Reference beam */}
            <line x1="35" y1="55" x2="150" y2="55" stroke="#ef4444" strokeWidth="2" />

            {/* Object */}
            <path d="M80,80 L95,70 L110,80 L95,90 Z" fill="#22c55e" stroke="#22c55e" strokeWidth="2" />
            <text x="95" y="105" textAnchor="middle" fill="#22c55e" fontSize="8">Object</text>

            {/* Object beam (scattered) */}
            <line x1="95" y1="75" x2="150" y2="55" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,2" />

            {/* Holographic plate */}
            <rect x="150" y="30" width="5" height="50" fill="#64748b" />

            {/* Interference pattern */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={i} x1="155" y1={32 + i * 5} x2="160" y2={32 + i * 5} stroke="#8b5cf6" strokeWidth="1" />
            ))}

            {/* 3D reconstruction */}
            <path d="M175,55 L185,50 L195,55 L185,60 Z" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" />

            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Reference + Object \u2192 3D Pattern</text>
          </svg>
        );

      case 'radio':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Antenna array */}
            {[40, 80, 120, 160].map((x, i) => (
              <g key={i}>
                <line x1={x} y1="90" x2={x} y2="60" stroke="#374151" strokeWidth="3" />
                <circle cx={x} cy="55" r="5" fill="#14b8a6" />
              </g>
            ))}

            {/* Constructive beam (main lobe) */}
            <path d="M100,55 Q100,20 100,10" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.8" />
            <path d="M80,55 Q90,25 100,10" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5" />
            <path d="M120,55 Q110,25 100,10" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5" />

            {/* Side lobes (weaker) */}
            <path d="M40,55 Q30,35 20,30" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4" />
            <path d="M160,55 Q170,35 180,30" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4" />

            {/* Phase indicators */}
            <text x="40" y="105" textAnchor="middle" fill="#64748b" fontSize="8">0\u00b0</text>
            <text x="80" y="105" textAnchor="middle" fill="#64748b" fontSize="8">90\u00b0</text>
            <text x="120" y="105" textAnchor="middle" fill="#64748b" fontSize="8">180\u00b0</text>
            <text x="160" y="105" textAnchor="middle" fill="#64748b" fontSize="8">270\u00b0</text>

            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Phase Control \u2192 Beam Steering</text>
          </svg>
        );

      default:
        return null;
    }
  };

  // --- RENDER HOOK PHASE ---
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-teal-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-teal-100 to-cyan-200 bg-clip-text text-transparent">
        Wave Interference
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        When waves meet, amazing things happen. Learn how two waves can create <span className="text-emerald-400 font-semibold">LOUDER</span> sounds or <span className="text-red-400 font-semibold">COMPLETE SILENCE</span>!
      </p>

      {/* Premium card with animation */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <span className="text-5xl">\ud83c\udf0a</span>
          </div>

          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            Discover why soap bubbles shimmer with colors, how noise-canceling headphones work, and the physics behind holograms!
          </p>

          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { icon: '\u2795', label: 'Constructive' },
              { icon: '\u2796', label: 'Destructive' },
              { icon: '\ud83d\udccf', label: 'Path Diff' },
              { icon: '\ud83c\udf08', label: 'Colors' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs text-slate-400 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Exploring
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="mt-8 text-sm text-slate-500">~8 minutes | Interactive simulation | 10 mastery questions</p>
    </div>
  );

  // --- RENDER PREDICT PHASE ---
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <p className="text-xs font-bold text-teal-400 tracking-widest mb-2">STEP 1 | MAKE YOUR PREDICTION</p>
      <h2 className="text-2xl font-bold text-white mb-2">What Happens When Two Waves Meet?</h2>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        Two speakers play the same tone. As you move around the room, what determines whether you hear LOUD sound or near SILENCE?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xl mb-6">
        {[
          { id: 'closer', label: 'Closer to either speaker', desc: 'More sound energy = louder', icon: '\ud83d\udccd' },
          { id: 'path_diff', label: 'Where path lengths match', desc: 'Equal distances = waves align', icon: '\ud83d\udccf' },
          { id: 'random', label: 'It varies randomly', desc: 'No predictable pattern', icon: '\ud83c\udfb2' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setPrediction(opt.id);
              emitEvent('prediction_made', { prediction: opt.id, label: opt.label });
            }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === opt.id
                ? 'bg-teal-500/20 border-2 border-teal-400'
                : 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <p className={`font-semibold ${prediction === opt.id ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-xl border border-slate-700/50">
        <p className="text-xs font-bold text-cyan-400 mb-1">\ud83d\udca1 THINK ABOUT IT</p>
        <p className="text-sm text-slate-400">When two ripples meet in a pond, do they always make bigger waves? Or do they sometimes cancel out?</p>
      </div>

      <button
        onClick={() => prediction && goToPhase('play')}
        disabled={!prediction}
        style={{ position: 'relative', zIndex: 10 }}
        className={`mt-8 px-8 py-4 rounded-xl font-semibold transition-all ${
          prediction
            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-lg hover:shadow-teal-500/25'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        See the Pattern \u2192
      </button>
    </div>
  );

  // --- RENDER PLAY PHASE ---
  const renderPlay = () => (
    <div className="flex flex-col items-center p-4">
      <p className="text-xs font-bold text-teal-400 tracking-widest mb-2">STEP 2 | EXPLORE THE PATTERN</p>
      <h2 className="text-xl font-bold text-white mb-4">Interactive Two-Source Interference</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl border border-slate-700/50">
        <div className="aspect-[500/350] w-full">
          {renderInterferenceVisualizer(true)}
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">Move your cursor/finger to explore the interference pattern</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
        <div className={`p-4 rounded-xl text-center transition-all ${
          hasFoundConstructive ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <p className={`text-xs font-bold ${hasFoundConstructive ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasFoundConstructive ? '\u2713 FOUND' : '\u25cb FIND'} CONSTRUCTIVE
          </p>
        </div>
        <div className={`p-4 rounded-xl text-center transition-all ${
          hasFoundDestructive ? 'bg-red-500/20 border border-red-500' : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <p className={`text-xs font-bold ${hasFoundDestructive ? 'text-red-400' : 'text-slate-500'}`}>
            {hasFoundDestructive ? '\u2713 FOUND' : '\u25cb FIND'} DESTRUCTIVE
          </p>
        </div>
      </div>

      <button
        onClick={() => (hasFoundConstructive && hasFoundDestructive) && goToPhase('review')}
        disabled={!(hasFoundConstructive && hasFoundDestructive)}
        style={{ position: 'relative', zIndex: 10 }}
        className={`px-8 py-4 rounded-xl font-semibold transition-all ${
          hasFoundConstructive && hasFoundDestructive
            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-lg hover:shadow-teal-500/25'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        Understand Why \u2192
      </button>
    </div>
  );

  // --- RENDER REVIEW PHASE ---
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-bold text-emerald-400 tracking-widest mb-2">STEP 3 | UNDERSTANDING THE PHYSICS</p>
      <h2 className="text-2xl font-bold text-white mb-2">The Key is Path Difference!</h2>
      <p className="text-slate-400 mb-8 max-w-lg text-center">
        Whether waves add up or cancel depends on how their PATH LENGTHS compare to the WAVELENGTH.
      </p>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl w-full mb-8`}>
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl mb-3">\u2795</div>
          <p className="font-bold text-emerald-400 mb-2">Constructive Interference</p>
          <p className="text-sm text-slate-400">Path diff = 0, 1\u03bb, 2\u03bb, 3\u03bb...<br/>Peaks align with peaks \u2192 Maximum amplitude!</p>
        </div>
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl mb-3">\u2796</div>
          <p className="font-bold text-red-400 mb-2">Destructive Interference</p>
          <p className="text-sm text-slate-400">Path diff = 0.5\u03bb, 1.5\u03bb, 2.5\u03bb...<br/>Peak meets trough \u2192 Cancellation!</p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
        <p className="text-xs font-bold text-slate-500 tracking-widest mb-3">INTERFERENCE CONDITIONS</p>
        <p className="text-2xl font-bold text-white mb-2">
          <span className="text-emerald-400">Constructive:</span> \u0394d = n\u03bb
        </p>
        <p className="text-2xl font-bold text-white">
          <span className="text-red-400">Destructive:</span> \u0394d = (n+\u00bd)\u03bb
        </p>
        <p className="text-sm text-slate-500 mt-4">where n = 0, 1, 2, 3... and \u03bb = wavelength</p>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
      >
        See a New Application \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_PREDICT PHASE ---
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <p className="text-xs font-bold text-amber-400 tracking-widest mb-2">STEP 4 | THIN FILM INTERFERENCE</p>
      <h2 className="text-2xl font-bold text-white mb-2">Why Do Soap Bubbles Show Colors?</h2>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        Soap bubbles display beautiful rainbow patterns. What causes these colors to appear?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xl mb-6">
        {[
          { id: 'dye', label: 'Soap contains colored dyes', desc: 'The soap itself is colorful', icon: '\ud83c\udfa8' },
          { id: 'interference', label: 'Light waves interfere in the thin film', desc: 'Reflections from front and back surfaces', icon: '\ud83c\udf0a' },
          { id: 'refraction', label: 'Light bends through the bubble', desc: 'Like a prism splitting light', icon: '\ud83d\udd2e' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setTwistPrediction(opt.id);
              emitEvent('twist_prediction_made', { prediction: opt.id });
            }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === opt.id
                ? 'bg-amber-500/20 border-2 border-amber-400'
                : 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <p className={`font-semibold ${twistPrediction === opt.id ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-xl border border-slate-700/50">
        <p className="text-xs font-bold text-cyan-400 mb-1">\ud83d\udca1 HINT</p>
        <p className="text-sm text-slate-400">Think about where light reflects when it hits a soap bubble. What happens when those reflections meet?</p>
      </div>

      <button
        onClick={() => twistPrediction && goToPhase('twist_play')}
        disabled={!twistPrediction}
        style={{ position: 'relative', zIndex: 10 }}
        className={`mt-4 px-8 py-4 rounded-xl font-semibold transition-all ${
          twistPrediction
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        Explore Thin Films \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_PLAY PHASE ---
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4">
      <p className="text-xs font-bold text-amber-400 tracking-widest mb-2">STEP 5 | INTERACTIVE THIN FILM</p>
      <h2 className="text-xl font-bold text-white mb-4">Adjust Film Thickness</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl border border-slate-700/50">
        <div className="aspect-[500/350] w-full">
          {renderThinFilmVisualizer()}
        </div>
      </div>

      <div className="w-full max-w-md mb-6">
        <p className="text-sm font-semibold text-amber-400 mb-2">
          Film Thickness: <span className="text-white">{filmThickness} nm</span>
        </p>
        <input
          type="range"
          min="100"
          max="700"
          value={filmThickness}
          onChange={(e) => setFilmThickness(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-amber-500"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-500">100 nm (thin)</span>
          <span className="text-xs text-slate-500">700 nm (thick)</span>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-md border border-slate-700/50 mb-6">
        <p className="text-xs font-bold text-cyan-400 mb-1">\ud83d\udd2c OBSERVE</p>
        <p className="text-sm text-slate-400">Watch how the resulting color changes as you adjust the thickness. Different thicknesses cause different wavelengths to interfere constructively!</p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
      >
        Understand the Physics \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_REVIEW PHASE ---
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-bold text-cyan-400 tracking-widest mb-2">STEP 6 | THE SCIENCE OF SOAP BUBBLES</p>
      <h2 className="text-2xl font-bold text-white mb-2">Why Soap Bubbles Show Rainbow Colors</h2>
      <p className="text-slate-400 mb-8 max-w-lg text-center">
        {twistPrediction === 'interference'
          ? '\u2705 Correct! Thin film interference creates the beautiful colors.'
          : 'The colors come from thin film interference, not dyes or simple refraction!'}
      </p>

      <div className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 rounded-2xl p-8 max-w-lg w-full border border-amber-500/20 mb-8">
        <p className="text-xs font-bold text-amber-400 tracking-widest mb-4">HOW IT WORKS</p>
        <div className="space-y-4 text-left">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">1</div>
            <p className="text-sm text-slate-300">Light hits the <span className="text-white font-semibold">front surface</span> of the soap film and reflects.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">2</div>
            <p className="text-sm text-slate-300">Light also passes through and reflects from the <span className="text-white font-semibold">back surface</span>.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">3</div>
            <p className="text-sm text-slate-300">These two reflections travel different distances, creating a <span className="text-white font-semibold">path difference = 2t</span>.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">4</div>
            <p className="text-sm text-slate-300">Different wavelengths (colors) interfere differently based on the film thickness!</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg border border-slate-700/50">
        <p className="text-xs font-bold text-emerald-400 mb-1">\ud83c\udf93 KEY INSIGHT</p>
        <p className="text-sm text-slate-400">
          As the bubble's thickness varies, different colors get enhanced or cancelled. That's why you see swirling rainbow patterns that change as the bubble moves!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
      >
        Real-World Applications \u2192
      </button>
    </div>
  );

  // --- RENDER TRANSFER PHASE ---
  const renderTransfer = () => {
    const app = applications[activeApp];

    return (
      <div className="flex flex-col p-4">
        <p className="text-xs font-bold text-blue-400 tracking-widest mb-2">STEP 7 | REAL-WORLD APPLICATIONS</p>
        <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-4`}>Interference in Action</h2>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {applications.map((a, i) => {
            const isUnlocked = i === 0 || completedApps.has(i - 1);
            return (
              <button
                key={a.id}
                onClick={() => isUnlocked && setActiveApp(i)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  activeApp === i
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
                    : isUnlocked
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
              >
                {completedApps.has(i) && <span>\u2713</span>}
                <span>{a.icon}</span>
                <span>{isMobile ? a.id : a.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          {/* SVG Graphic */}
          <div className="mb-4 rounded-xl bg-slate-900/50 p-3">
            {renderAppGraphic(app.id)}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-teal-500/20 flex items-center justify-center text-3xl">
              {app.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{app.title}</h3>
              <p className="text-sm text-slate-400">{app.description}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-cyan-400 mb-2">\ud83d\udd2c THE PHYSICS</p>
            <p className="text-sm text-slate-300">{app.physics}</p>
          </div>

          <div className="bg-teal-500/10 rounded-xl p-3 text-center border border-teal-500/30 mb-4">
            <p className="text-xs font-bold text-teal-400 mb-1">KEY FORMULA</p>
            <p className="text-base font-mono font-bold text-white">{app.formula}</p>
          </div>

          {/* Mark as Read button */}
          {!completedApps.has(activeApp) ? (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emitEvent('app_explored', { app: app.title });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-all"
            >
              \u2713 Mark "{app.title}" as Read
            </button>
          ) : (
            <div className="text-center py-3 text-emerald-400 font-semibold">
              \u2713 Completed
            </div>
          )}
        </div>

        {/* Quiz button */}
        <div className="mt-4 text-center">
          {completedApps.size >= applications.length ? (
            <button
              onClick={() => goToPhase('test')}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              Take the Test \u2192
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Read all {applications.length} applications to unlock the test ({completedApps.size}/{applications.length})
            </p>
          )}
        </div>
      </div>
    );
  };

  // --- RENDER TEST PHASE ---
  const renderTest = () => {
    if (testSubmitted) {
      const score = testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);
      const percentage = Math.round((score / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${passed ? 'bg-emerald-500' : 'bg-amber-500'} shadow-lg`}>
            <span className="text-5xl">{passed ? '\ud83c\udfc6' : '\ud83d\udcda'}</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
          </h2>

          <p className="text-5xl font-bold text-teal-400 mb-4">{score}/{testQuestions.length}</p>

          <p className="text-slate-400 mb-8">
            {percentage >= 90
              ? "You've mastered wave interference!"
              : percentage >= 70
              ? 'Solid understanding of interference patterns!'
              : 'Review the concepts and try again!'}
          </p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(testQuestions.length).fill(null));
              }
            }}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl"
          >
            {passed ? 'Complete Lesson' : 'Try Again'}
          </button>
        </div>
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];

    return (
      <div className="flex flex-col p-4">
        {/* Progress */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-bold text-teal-400 tracking-widest">QUESTION {testIndex + 1} OF {testQuestions.length}</p>
          <div className="flex gap-1">
            {testQuestions.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  testAnswers[i] !== null ? 'bg-emerald-500' : i === testIndex ? 'bg-teal-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <p className="text-xs font-bold text-cyan-400 mb-2">\ud83d\udccb SCENARIO</p>
          <p className="text-sm text-slate-300">{q.scenario}</p>
        </div>

        {/* Question */}
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white mb-4`}>{q.question}</h3>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-6">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[testIndex] = i;
                setTestAnswers(newAnswers);
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className={`p-4 rounded-xl text-left transition-all ${
                selected === i
                  ? 'bg-teal-500/20 border-2 border-teal-400'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent'
              }`}
            >
              <p className={`font-medium ${selected === i ? 'text-white' : 'text-slate-300'}`}>{opt.text}</p>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => testIndex > 0 && setTestIndex(testIndex - 1)}
            disabled={testIndex === 0}
            style={{ position: 'relative', zIndex: 10 }}
            className={`px-6 py-3 rounded-xl font-semibold ${
              testIndex === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            \u2190 Previous
          </button>

          {testIndex < testQuestions.length - 1 ? (
            <button
              onClick={() => selected !== null && setTestIndex(testIndex + 1)}
              disabled={selected === null}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-6 py-3 rounded-xl font-semibold ${
                selected === null
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
              }`}
            >
              Next \u2192
            </button>
          ) : (
            <button
              onClick={() => {
                if (testAnswers.every(a => a !== null)) {
                  setTestSubmitted(true);
                  emitEvent('test_answered', {
                    score: testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0),
                    total: testQuestions.length
                  });
                }
              }}
              disabled={!testAnswers.every(a => a !== null)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-6 py-3 rounded-xl font-semibold ${
                !testAnswers.every(a => a !== null)
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
              }`}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- RENDER MASTERY PHASE ---
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center relative">
      {/* Confetti */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-sm opacity-80 animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: ['#14b8a6', '#2dd4bf', '#22c55e', '#f59e0b', '#3b82f6'][i % 5],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}

      <div className="relative z-10">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
          <span className="text-6xl">\ud83c\udfc6</span>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-teal-100 to-cyan-200 bg-clip-text text-transparent">
          Congratulations!
        </h1>
        <h2 className="text-2xl font-bold text-teal-400 mb-4">Wave Interference Master</h2>

        <p className="text-lg text-slate-400 max-w-md mb-8">
          You've mastered how waves combine! From noise cancellation to holography, you now understand the beautiful physics of constructive and destructive interference.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {['Path Difference', 'Constructive', 'Destructive', 'Thin Film', 'Applications'].map((item, i) => (
            <div key={i} className="px-4 py-2 rounded-full bg-slate-800 text-sm font-medium text-slate-300">
              \u2713 {item}
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            emitEvent('mastery_achieved', { game: 'wave_interference' });
            if (onComplete) onComplete();
          }}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
        >
          Complete Lesson
        </button>
      </div>
    </div>
  );

  // --- RENDER PHASE ---
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Wave Interference</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-teal-400 w-6 shadow-lg shadow-teal-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-teal-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default WaveInterferenceRenderer;
