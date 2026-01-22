'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface WaveInterferenceRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// --- MAIN COMPONENT ---
const WaveInterferenceRenderer: React.FC<WaveInterferenceRendererProps> = ({ onComplete, onGameEvent, currentPhase, onPhaseComplete }) => {
  // --- PHASE MANAGEMENT ---
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);

    if (newPhase === 2 || newPhase === 5) {
      setProbePos({ x: 250, y: 200 });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
      options: ["Constructive interference", "Destructive interference", "No interference", "Partial cancellation"],
      correct: 0,
      explanation: "Path difference = 2\u03bb = whole number of wavelengths. Waves arrive in phase (peak meets peak), so they add up \u2192 constructive interference!"
    },
    {
      scenario: "At another location, the path difference is 2.5 wavelengths.",
      question: "What happens at this point?",
      options: ["Maximum amplitude", "Minimum amplitude (near silence)", "Average amplitude", "Doubled frequency"],
      correct: 1,
      explanation: "Path difference = 2.5\u03bb = (n + 0.5)\u03bb. Waves arrive out of phase (peak meets trough) \u2192 destructive interference, near-silence!"
    },
    {
      scenario: "The wavelength of a wave is 20 cm. Two sources are separated by 60 cm.",
      question: "At what minimum path difference will you find constructive interference?",
      options: ["0 cm (on the center line)", "10 cm", "30 cm", "60 cm"],
      correct: 0,
      explanation: "Constructive interference occurs when \u0394d = n\u03bb. The minimum is \u0394d = 0 (center line), where both waves travel equal distances."
    },
    {
      scenario: "Noise-canceling headphones work by creating a wave that is out of phase with ambient noise.",
      question: "What path/phase difference do they create?",
      options: ["0 wavelengths", "0.5 wavelengths (half wavelength)", "1 wavelength", "2 wavelengths"],
      correct: 1,
      explanation: "To cancel noise, the anti-noise wave must arrive 180\u00b0 (half wavelength) out of phase. Peak meets trough \u2192 destructive interference \u2192 silence!"
    },
    {
      scenario: "You decrease the wavelength while keeping the source separation constant.",
      question: "What happens to the interference pattern?",
      options: ["Pattern spreads out", "Pattern becomes more closely spaced", "Pattern disappears", "Pattern stays the same"],
      correct: 1,
      explanation: "Shorter \u03bb means the same physical distance corresponds to MORE wavelengths. The maxima/minima become more closely spaced."
    },
    {
      scenario: "In a double-slit experiment, the central maximum (bright fringe) is always at the center.",
      question: "Why is this?",
      options: ["Both paths have equal length \u2192 \u0394d = 0 \u2192 constructive", "Light naturally combines at center", "Slits focus light to center", "It's just coincidence"],
      correct: 0,
      explanation: "At the center, both waves travel exactly the same distance from their sources. Path difference = 0 = 0\u03bb \u2192 always constructive!"
    },
    {
      scenario: "Radio signals from two towers can cancel at certain locations.",
      question: "What is this phenomenon called?",
      options: ["Signal amplification", "Dead zone or null point", "Signal reflection", "Atmospheric absorption"],
      correct: 1,
      explanation: "When radio waves from two sources arrive out of phase at a location, they cancel \u2192 creating 'dead zones' where reception is poor."
    },
    {
      scenario: "The path difference at a point is 3.25\u03bb.",
      question: "Is this closer to constructive or destructive interference?",
      options: ["Closer to constructive (3\u03bb)", "Closer to destructive (3.5\u03bb)", "Exactly in between", "Neither - no interference"],
      correct: 1,
      explanation: "3.25\u03bb is closer to 3.5\u03bb (destructive) than to 3\u03bb (constructive). The wave will be partially cancelled."
    },
    {
      scenario: "Soap bubbles show colorful patterns due to thin-film interference.",
      question: "What causes different colors in different regions?",
      options: ["Different soap concentrations", "Different film thickness \u2192 different path differences", "Trapped air bubbles", "Random light scattering"],
      correct: 1,
      explanation: "Film thickness varies across the bubble. Different thicknesses create different path differences for each color wavelength."
    },
    {
      scenario: "WiFi signals from your router reflect off walls, creating multiple paths.",
      question: "What causes WiFi 'dead zones' in your home?",
      options: ["Signal too weak", "Destructive interference between direct and reflected waves", "Wall absorption", "Router malfunction"],
      correct: 1,
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
      id: 'radio',
      title: 'Radio Astronomy',
      icon: '\ud83d\udce1',
      description: 'How telescope arrays achieve incredible resolution.',
      physics: 'Multiple radio telescopes act as sources in reverse. By combining signals with known path differences, astronomers achieve resolution equivalent to a telescope spanning kilometers.',
      formula: 'Resolution \u221d \u03bb / baseline',
    },
    {
      id: 'thin_film',
      title: 'Thin Film Colors',
      icon: '\ud83c\udf08',
      description: 'Why soap bubbles and oil slicks show rainbows.',
      physics: 'Light reflects from both surfaces of a thin film. The path difference (2 \u00d7 thickness) causes different wavelengths to interfere constructively or destructively.',
      formula: '2t = (m + \u00bd)\u03bb',
    },
    {
      id: 'wifi',
      title: 'WiFi Dead Zones',
      icon: '\ud83d\udcf1',
      description: 'Why signal strength varies around your home.',
      physics: 'WiFi signals reflect off walls, creating multiple paths. Where these paths differ by half-wavelengths, destructive interference creates weak signal zones.',
      formula: 'Dead zone: \u0394d = (n + \u00bd)\u03bb',
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

      case 'radio':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Radio telescopes */}
            <g transform="translate(30, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            <g transform="translate(100, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            <g transform="translate(170, 50)">
              <ellipse cx="0" cy="0" rx="20" ry="8" fill="#374151" />
              <rect x="-3" y="0" width="6" height="30" fill="#4b5563" />
              <rect x="-10" y="30" width="20" height="5" rx="2" fill="#374151" />
            </g>

            {/* Radio waves from star */}
            <circle cx="100" cy="10" r="5" fill="#f59e0b">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </circle>

            {[0, 1, 2].map(i => (
              <circle key={i} cx="100" cy="10" r={15 + i * 15} fill="none" stroke="#14b8a6" strokeWidth="1" opacity={0.5 - i * 0.15}>
                <animate attributeName="r" values={`${15 + i * 15};${25 + i * 15};${15 + i * 15}`} dur="2s" repeatCount="indefinite" />
              </circle>
            ))}

            {/* Baseline indicator */}
            <line x1="30" y1="95" x2="170" y2="95" stroke="#5eead4" strokeWidth="2" />
            <text x="100" y="110" textAnchor="middle" fill="#64748b" fontSize="9">Baseline = Virtual Dish Size</text>
          </svg>
        );

      case 'thin_film':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            <defs>
              <linearGradient id="filmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="75%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {/* Soap bubble */}
            <ellipse cx="100" cy="60" rx="70" ry="50" fill="url(#filmGrad)" opacity="0.4" />
            <ellipse cx="100" cy="60" rx="70" ry="50" fill="none" stroke="#64748b" strokeWidth="1" />

            {/* Light ray incoming */}
            <line x1="50" y1="10" x2="80" y2="35" stroke="#f59e0b" strokeWidth="2" />
            <polygon points="78,33 84,32 80,38" fill="#f59e0b" />

            {/* Reflected rays */}
            <line x1="80" y1="35" x2="50" y2="50" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
            <line x1="80" y1="40" x2="45" y2="60" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,2" />

            {/* Film layers */}
            <path d="M70,30 Q100,25 130,32" fill="none" stroke="#5eead4" strokeWidth="1" />
            <path d="M70,38 Q100,33 130,40" fill="none" stroke="#64748b" strokeWidth="1" />

            <text x="150" y="30" fill="#64748b" fontSize="8">Top surface</text>
            <text x="150" y="45" fill="#64748b" fontSize="8">Bottom surface</text>

            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Thickness \u2192 Path Difference \u2192 Color</text>
          </svg>
        );

      case 'wifi':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-[120px]">
            {/* Room walls */}
            <rect x="20" y="20" width="160" height="80" fill="none" stroke="#374151" strokeWidth="3" />

            {/* Router */}
            <rect x="30" y="50" width="20" height="15" rx="2" fill="#14b8a6" />
            <line x1="35" y1="45" x2="35" y2="50" stroke="#14b8a6" strokeWidth="2" />
            <line x1="45" y1="45" x2="45" y2="50" stroke="#14b8a6" strokeWidth="2" />

            {/* Direct wave */}
            <path d="M50,57 Q100,57 150,57" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.7">
              <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Reflected wave */}
            <path d="M50,57 L100,20 L150,57" fill="none" stroke="#2dd4bf" strokeWidth="2" opacity="0.7" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Phone with signal */}
            <rect x="145" y="52" width="15" height="25" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />

            {/* Signal strength indicator */}
            <g transform="translate(150, 45)">
              <rect x="0" y="6" width="3" height="4" fill="#22c55e" />
              <rect x="4" y="3" width="3" height="7" fill="#22c55e" />
              <rect x="8" y="0" width="3" height="10" fill="#22c55e" opacity="0.3" />
            </g>

            {/* Dead zone indicator */}
            <circle cx="110" cy="75" r="12" fill="#ef4444" opacity="0.3" />
            <text x="110" y="79" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">\u2717</text>

            <text x="100" y="115" textAnchor="middle" fill="#64748b" fontSize="9">Multipath \u2192 Dead Zones</text>
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
        Why do some spots get <span className="text-emerald-400 font-semibold">LOUD</span> while others go <span className="text-red-400 font-semibold">SILENT</span>?
      </p>

      {/* Premium card with animation */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <span className="text-5xl">\ud83c\udf0a</span>
          </div>

          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            Discover how waves add up or cancel out based on their paths!
          </p>

          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { icon: '\u2795', label: 'Constructive' },
              { icon: '\u2796', label: 'Destructive' },
              { icon: '\ud83d\udccf', label: 'Path Diff' },
              { icon: '\ud83c\udf0a', label: 'Wavelength' },
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
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Exploring
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="mt-8 text-sm text-slate-500">~6 minutes \u2022 Interactive simulation \u2022 10 mastery questions</p>
    </div>
  );

  // --- RENDER PREDICT PHASE ---
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <p className="text-xs font-bold text-teal-400 tracking-widest mb-2">STEP 1 \u2022 MAKE YOUR PREDICTION</p>
      <h2 className="text-2xl font-bold text-white mb-2">Where Will Sound Be Loudest?</h2>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        Two speakers play the same tone. As you walk around, what determines whether you hear LOUD sound or near SILENCE?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xl mb-6">
        {[
          { id: 'closer', label: 'Closer to either speaker', desc: 'More sound energy = louder', icon: '\ud83d\udccd' },
          { id: 'path_diff', label: 'Where path lengths match', desc: 'Equal distances = waves align', icon: '\ud83d\udccf' },
          { id: 'random', label: 'It varies randomly', desc: 'No predictable pattern', icon: '\ud83c\udfb2' },
        ].map(opt => (
          <button
            key={opt.id}
            onMouseDown={() => {
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setPrediction(opt.id);
              emitEvent('prediction_made', { prediction: opt.id, label: opt.label });
            }}
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
        onMouseDown={(e) => { e.preventDefault(); if (prediction) goToPhase(2); }}
        disabled={!prediction}
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
      <p className="text-xs font-bold text-teal-400 tracking-widest mb-2">STEP 2 \u2022 EXPLORE THE PATTERN</p>
      <h2 className="text-xl font-bold text-white mb-4">Interactive Interference</h2>

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
        onMouseDown={(e) => { e.preventDefault(); if (hasFoundConstructive && hasFoundDestructive) goToPhase(3); }}
        disabled={!(hasFoundConstructive && hasFoundDestructive)}
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
      <p className="text-xs font-bold text-emerald-400 tracking-widest mb-2">STEP 3 \u2022 UNDERSTANDING THE PHYSICS</p>
      <h2 className="text-2xl font-bold text-white mb-2">The Key is Path Difference!</h2>
      <p className="text-slate-400 mb-8 max-w-lg text-center">
        Whether waves add up or cancel depends on how their PATH LENGTHS compare to the WAVELENGTH.
      </p>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl w-full mb-8`}>
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl mb-3">\u2795</div>
          <p className="font-bold text-emerald-400 mb-2">Constructive</p>
          <p className="text-sm text-slate-400">Path diff = 0, 1\u03bb, 2\u03bb, 3\u03bb...<br/>Peaks align with peaks \u2192 Maximum!</p>
        </div>
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl mb-3">\u2796</div>
          <p className="font-bold text-red-400 mb-2">Destructive</p>
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
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
      >
        Explore Wavelength \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_PREDICT PHASE ---
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <p className="text-xs font-bold text-amber-400 tracking-widest mb-2">STEP 4 \u2022 NEW VARIABLE</p>
      <h2 className="text-2xl font-bold text-white mb-2">What if We Change Wavelength?</h2>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        If we decrease the wavelength (shorter waves), how does the interference pattern change?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xl mb-6">
        {[
          { id: 'spread', label: 'Pattern spreads out', desc: 'Fringes get farther apart', icon: '\u2194\ufe0f' },
          { id: 'compress', label: 'Pattern compresses', desc: 'Fringes get closer together', icon: '\u2195\ufe0f' },
          { id: 'same', label: 'Pattern stays the same', desc: "Wavelength doesn't matter", icon: '\u27a1\ufe0f' },
        ].map(opt => (
          <button
            key={opt.id}
            onMouseDown={() => {
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setTwistPrediction(opt.id);
              emitEvent('twist_prediction_made', { prediction: opt.id });
            }}
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

      <button
        onMouseDown={(e) => { e.preventDefault(); if (twistPrediction) goToPhase(5); }}
        disabled={!twistPrediction}
        className={`mt-4 px-8 py-4 rounded-xl font-semibold transition-all ${
          twistPrediction
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        Test Your Prediction \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_PLAY PHASE ---
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4">
      <p className="text-xs font-bold text-amber-400 tracking-widest mb-2">STEP 5 \u2022 WAVELENGTH EXPERIMENT</p>
      <h2 className="text-xl font-bold text-white mb-4">Adjust the Wavelength</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl border border-slate-700/50">
        <div className="aspect-[500/350] w-full">
          {renderInterferenceVisualizer(true)}
        </div>
      </div>

      <div className="w-full max-w-md mb-6">
        <p className="text-sm font-semibold text-teal-400 mb-2">
          Wavelength: <span className="text-white">{wavelength} px</span>
        </p>
        <input
          type="range"
          min="20"
          max="80"
          value={wavelength}
          onChange={(e) => setWavelength(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-teal-500"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-500">20 px (short)</span>
          <span className="text-xs text-slate-500">80 px (long)</span>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
      >
        See the Pattern \u2192
      </button>
    </div>
  );

  // --- RENDER TWIST_REVIEW PHASE ---
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-bold text-cyan-400 tracking-widest mb-2">STEP 6 \u2022 COMPLETE UNDERSTANDING</p>
      <h2 className="text-2xl font-bold text-white mb-2">Wavelength Controls the Pattern!</h2>
      <p className="text-slate-400 mb-8 max-w-lg text-center">
        {twistPrediction === 'compress'
          ? '\u2705 Correct! Shorter wavelength = more fringes in the same space.'
          : 'Shorter wavelength means more closely-spaced interference fringes!'}
      </p>

      <div className="bg-gradient-to-br from-teal-500/10 to-amber-500/10 rounded-2xl p-8 max-w-lg w-full text-center border border-teal-500/20 mb-8">
        <p className="text-xs font-bold text-cyan-400 tracking-widest mb-4">FRINGE SPACING</p>
        <p className="text-3xl font-bold text-white font-serif">
          \u0394y = <span className="text-teal-400">\u03bb</span>L / d
        </p>
        <p className="text-sm text-slate-400 mt-4">
          Fringe spacing (\u0394y) is proportional to wavelength (\u03bb)
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg border border-slate-700/50">
        <p className="text-xs font-bold text-emerald-400 mb-1">\ud83c\udf93 KEY INSIGHT</p>
        <p className="text-sm text-slate-400">
          The interference pattern depends on the RATIO of path difference to wavelength. Same path difference but shorter \u03bb = more fringes!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
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
        <p className="text-xs font-bold text-blue-400 tracking-widest mb-2">STEP 7 \u2022 REAL-WORLD APPLICATIONS</p>
        <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-4`}>Interference in Action</h2>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {applications.map((a, i) => {
            const isUnlocked = i === 0 || completedApps.has(i - 1);
            return (
              <button
                key={a.id}
                onMouseDown={() => {
                  if (!isUnlocked) return;
                  const now = Date.now();
                  if (now - lastClickRef.current < 200) return;
                  lastClickRef.current = now;
                  setActiveApp(i);
                }}
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
              onMouseDown={() => {
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emitEvent('app_explored', { app: app.title });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
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
              onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
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
      const score = testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correct ? 1 : 0), 0);
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
            onMouseDown={(e) => {
              e.preventDefault();
              if (passed) {
                goToPhase(9);
              } else {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(testQuestions.length).fill(null));
              }
            }}
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
              onMouseDown={() => {
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                const newAnswers = [...testAnswers];
                newAnswers[testIndex] = i;
                setTestAnswers(newAnswers);
              }}
              className={`p-4 rounded-xl text-left transition-all ${
                selected === i
                  ? 'bg-teal-500/20 border-2 border-teal-400'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent'
              }`}
            >
              <p className={`font-medium ${selected === i ? 'text-white' : 'text-slate-300'}`}>{opt}</p>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onMouseDown={(e) => { e.preventDefault(); if (testIndex > 0) setTestIndex(testIndex - 1); }}
            disabled={testIndex === 0}
            className={`px-6 py-3 rounded-xl font-semibold ${
              testIndex === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            \u2190 Previous
          </button>

          {testIndex < testQuestions.length - 1 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); if (selected !== null) setTestIndex(testIndex + 1); }}
              disabled={selected === null}
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
              onMouseDown={(e) => {
                e.preventDefault();
                if (testAnswers.every(a => a !== null)) {
                  setTestSubmitted(true);
                  emitEvent('test_answered', {
                    score: testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correct ? 1 : 0), 0),
                    total: testQuestions.length
                  });
                }
              }}
              disabled={!testAnswers.every(a => a !== null)}
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
          Interference Master!
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-8">
          You've mastered how waves combine! From noise cancellation to radio astronomy, you now understand constructive and destructive interference.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {['Path Difference', 'Constructive', 'Destructive', 'Wavelength Effect'].map((item, i) => (
            <div key={i} className="px-4 py-2 rounded-full bg-slate-800 text-sm font-medium text-slate-300">
              \u2713 {item}
            </div>
          ))}
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); emitEvent('mastery_achieved', { game: 'wave_interference' }); }}
          className="px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
        >
          Complete Lesson \ud83c\udf89
        </button>
      </div>
    </div>
  );

  // --- RENDER PHASE ---
  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
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
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-teal-400 w-6 shadow-lg shadow-teal-400/30'
                    : phase > p
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
