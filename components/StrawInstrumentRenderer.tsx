'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Straw Instrument - Complete 10-Phase Game
// How tube length creates different musical notes through resonance
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

interface StrawInstrumentRendererProps {
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

// Play musical note with harmonics (more realistic pipe sound)
const playPipeSound = (baseFreq: number, duration: number) => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [1, 2, 3].forEach((harmonic) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = baseFreq * harmonic;
      osc.type = 'sine';
      const vol = 0.25 / (harmonic * harmonic);
      gain.gain.setValueAtTime(vol, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    });
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A musician is playing a pan flute with tubes ranging from 10cm to 40cm. They blow across the shortest tube and then the longest tube.",
    question: "What happens to the pitch when switching from the short tube to the long tube?",
    options: [
      { id: 'a', label: "Pitch gets higher because more air fits in the tube" },
      { id: 'b', label: "Pitch gets lower because longer tube = longer wavelength = lower frequency", correct: true },
      { id: 'c', label: "Pitch stays the same but volume increases" },
      { id: 'd', label: "The straw stops making sound in longer tubes" }
    ],
    explanation: "Longer tubes create longer wavelengths due to standing wave resonance. Since frequency = speed/wavelength, longer wavelengths mean lower frequencies (lower pitch). The formula f = v/(2L) shows frequency is inversely proportional to length."
  },
  {
    scenario: "An acoustics engineer needs to create a note at exactly 440 Hz (concert A) using a tube instrument. The speed of sound is 343 m/s.",
    question: "What tube length should they use for an open pipe?",
    options: [
      { id: 'a', label: "About 78 cm (using L = v/f)" },
      { id: 'b', label: "About 39 cm (using L = v/2f)", correct: true },
      { id: 'c', label: "About 1.56 m (using L = 2v/f)" },
      { id: 'd', label: "Length doesn't matter for pitch" }
    ],
    explanation: "For an open pipe, f = v/(2L), so L = v/(2f) = 343/(2*440) = 0.39m = 39cm. The factor of 2 comes from the standing wave pattern where the tube length equals half the wavelength."
  },
  {
    scenario: "A science teacher demonstrates standing waves by blowing into a straw. They ask students what creates the specific sound inside the straw.",
    question: "What physical phenomenon creates the sound in a straw instrument?",
    options: [
      { id: 'a', label: "Air molecules splitting and releasing energy" },
      { id: 'b', label: "Standing waves (resonance) where certain frequencies reinforce themselves", correct: true },
      { id: 'c', label: "Static electricity from air friction" },
      { id: 'd', label: "Air pressure pushing on the outside of the tube" }
    ],
    explanation: "Standing waves form when sound waves reflect back and forth inside the tube. Only wavelengths that 'fit' in the tube reinforce through constructive interference - this is resonance. Other wavelengths cancel out through destructive interference."
  },
  {
    scenario: "A student measures that a 20 cm straw produces a frequency of about 857 Hz. They then cut the straw in half to 10 cm.",
    question: "What frequency will the 10 cm straw produce?",
    options: [
      { id: 'a', label: "About 428 Hz (half the frequency)" },
      { id: 'b', label: "About 857 Hz (same frequency)" },
      { id: 'c', label: "About 1714 Hz (double the frequency)", correct: true },
      { id: 'd', label: "About 643 Hz (3/4 the frequency)" }
    ],
    explanation: "Halving the length doubles the frequency. Since f = v/(2L), when L becomes L/2, frequency becomes v/(2*L/2) = v/L = 2 * v/(2L) = 2f. This is one octave higher - the musical equivalent of going from C to the next higher C."
  },
  {
    scenario: "A music student is building a pan flute and wonders why each tube needs to be a specific length rather than just any shorter length.",
    question: "Why do pan flutes have tubes of precisely calculated lengths?",
    options: [
      { id: 'a', label: "For aesthetic symmetry and visual appeal" },
      { id: 'b', label: "Each specific length produces a specific note due to the f = v/(2L) relationship", correct: true },
      { id: 'c', label: "Longer tubes are structurally stronger" },
      { id: 'd', label: "Different materials are used for each tube" }
    ],
    explanation: "The physics relationship f = v/(2L) means that for each desired musical note (specific frequency), there's exactly one correct length. Musicians and instrument makers have known this relationship for thousands of years, even before understanding the physics."
  },
  {
    scenario: "While studying standing waves, a physics student marks the points along a vibrating tube where the air doesn't move at all.",
    question: "What are these points of zero movement called?",
    options: [
      { id: 'a', label: "Antinodes - points of maximum vibration" },
      { id: 'b', label: "Nodes - points of no vibration", correct: true },
      { id: 'c', label: "The open ends of the tube" },
      { id: 'd', label: "Escape points where sound exits" }
    ],
    explanation: "Nodes are locations where the standing wave has zero amplitude - the air doesn't oscillate. Antinodes are the opposite: points of maximum oscillation. For an open pipe, there are antinodes (pressure nodes) at both ends."
  },
  {
    scenario: "A clarinet player notices that their instrument behaves differently than a flute. Both are tube instruments, but the clarinet is closed at one end (by the mouthpiece).",
    question: "How does a closed-end pipe differ from an open pipe?",
    options: [
      { id: 'a', label: "Closed pipes are always quieter than open pipes" },
      { id: 'b', label: "Closed pipes only produce odd harmonics (1st, 3rd, 5th...)", correct: true },
      { id: 'c', label: "Closed pipes always produce lower frequencies than open pipes of the same length" },
      { id: 'd', label: "There's no acoustic difference between closed and open pipes" }
    ],
    explanation: "Closed pipes have a node at the closed end and antinode at the open end. This constraint means only odd harmonics (1f, 3f, 5f...) can form, giving clarinets their characteristic 'hollow' sound compared to flutes which have all harmonics."
  },
  {
    scenario: "An audio engineer is explaining to a client why certain frequencies sound louder in their concert hall, especially notes around 200 Hz.",
    question: "What phenomenon is causing certain frequencies to be amplified?",
    options: [
      { id: 'a', label: "Sound is simply bouncing off walls repeatedly" },
      { id: 'b', label: "Resonance - certain frequencies are amplified by constructive interference matching the room's dimensions", correct: true },
      { id: 'c', label: "Air compression in the center of the room" },
      { id: 'd', label: "Visible vibration of the building structure" }
    ],
    explanation: "Just like tube instruments, rooms have resonant frequencies where standing waves can form. When sound wavelengths match the room dimensions, constructive interference amplifies those frequencies. This is why acoustic treatment is important in studios."
  },
  {
    scenario: "A student blows harder into their straw instrument, trying to get a higher pitch. They notice the sound changes but not in the expected way.",
    question: "What primarily changes when you blow harder into a straw?",
    options: [
      { id: 'a', label: "Pitch increases dramatically" },
      { id: 'b', label: "Volume increases (pitch may rise only slightly at extreme pressures)", correct: true },
      { id: 'c', label: "Wavelength becomes shorter" },
      { id: 'd', label: "Nothing changes at all" }
    ],
    explanation: "Blowing harder primarily increases loudness (amplitude). Pitch is determined by tube length, not air pressure. At very high pressures, you might 'overblow' and excite a higher harmonic, but this is a separate effect from normal playing."
  },
  {
    scenario: "An instrument maker flattens the end of a straw to create a makeshift reed, similar to an oboe or clarinet. The straw now makes sound much more easily.",
    question: "Why does a flattened 'reed' end make sound production easier?",
    options: [
      { id: 'a', label: "Air flows faster through the narrower opening" },
      { id: 'b', label: "The vibrating reed creates regular pressure pulses that excite the air column", correct: true },
      { id: 'c', label: "The straw becomes effectively longer" },
      { id: 'd', label: "Air becomes denser inside the straw" }
    ],
    explanation: "The reed vibrates when air flows past it, creating periodic pressure fluctuations that drive the standing wave in the tube. Without a reed, you must precisely aim an air jet at the tube edge (like a flute) which is harder to control."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🎺',
    title: 'Woodwind Instruments',
    short: 'Precision engineering for musical resonance',
    tagline: 'Every hole is calculated using f = v/(2L)',
    description: 'Clarinets, flutes, and oboes use precisely placed tone holes to change the effective length of the air column. Opening a hole shortens the effective tube length, raising the pitch. Each tone hole is positioned using acoustic calculations based on the fundamental pipe resonance formula you explored with straws. Engineers must account for the open hole diameter, wall thickness, and undercutting to achieve the correct frequency at each note.',
    connection: 'The fundamental relationship f = v/(2L) for open pipes determines hole placement. Covering holes lengthens the effective tube, lowering pitch. This is exactly what you explored with straws! The same inverse relationship between length and frequency governs the entire instrument. Master woodwind makers spend years perfecting hole placement, knowing that a shift of just 1 mm can alter the pitch by several cents.',
    howItWorks: 'Tone holes are placed where standing wave nodes would occur for desired frequencies. Open holes create pressure antinodes, effectively shortening the tube. Register keys and overblowing access harmonics.',
    stats: [
      { value: '343 m/s', label: 'Speed of sound', icon: '🎵' },
      { value: '95%', label: 'Tone accuracy', icon: '📊' },
      { value: '2x', label: 'Octave frequency ratio', icon: '🎯' }
    ],
    examples: ['Concert flute', 'Clarinet', 'Saxophone', 'Recorder'],
    companies: ['Yamaha', 'Buffet Crampon', 'Selmer', 'Powell Flutes'],
    futureImpact: 'Computational acoustics will enable custom-designed instruments optimized for individual players, with 3D-printed components tuned to perfection.',
    color: '#F59E0B'
  },
  {
    icon: '🎹',
    title: 'Pipe Organs',
    short: 'Architectural-scale resonant tubes',
    tagline: 'The king of instruments uses thousands of tubes',
    description: 'Pipe organs contain thousands of precisely tuned pipes, from tiny metal flutes to massive 32-foot bass pipes. Each rank uses the same physics as your straw instrument, scaled across many octaves.',
    connection: 'Pipe length determines fundamental pitch through standing wave formation. A 32-foot pipe produces about 16 Hz - below human hearing but felt as vibration. The physics scales perfectly from straws to cathedral pipes.',
    howItWorks: 'Flue pipes use air jets hitting an edge (like recorders). Reed pipes use vibrating brass tongues. Scaling laws determine how diameter changes with length to maintain consistent tone quality.',
    stats: [
      { value: '10 m', label: 'Longest pipe length', icon: '🔊' },
      { value: '98%', label: 'Tone accuracy needed', icon: '📊' },
      { value: '2x', label: 'Frequency per octave', icon: '🕐' }
    ],
    examples: ['Cathedral organs', 'Concert hall instruments', 'Theatre organs', 'Digital emulations'],
    companies: ['Casavant', 'Schantz', 'Skinner', 'Allen Digital'],
    futureImpact: 'Digital modeling will preserve endangered historic organs forever while enabling new tonal possibilities impossible with physical pipes.',
    color: '#8B5CF6'
  },
  {
    icon: '🔊',
    title: 'Horn Loudspeakers',
    short: 'Acoustic waveguides for audio',
    tagline: 'Tubes direct and amplify sound efficiently',
    description: 'Horn loudspeakers use tube acoustics to match speaker to air, dramatically improving efficiency. The physics of tube resonance helps engineers design audio systems from PA speakers to hearing aids.',
    connection: 'Horns act as acoustic transformers, using tube physics to gradually match speaker impedance to air. Understanding resonance helps avoid coloration while maximizing efficiency.',
    howItWorks: 'Horn loudspeakers use flared tubes to gradually match speaker to air impedance. Folded horns fit long paths in small enclosures. Transmission line speakers use resonant tubes for bass extension.',
    stats: [
      { value: '10x', label: 'Efficiency vs direct', icon: '📈' },
      { value: '90%', label: 'Sound energy focused', icon: '🔊' },
      { value: '343 m/s', label: 'Sound propagation', icon: '🎵' }
    ],
    examples: ['PA system horns', 'Gramophone horns', 'Subwoofer enclosures', 'Hearing aids'],
    companies: ['JBL', 'Klipsch', 'Electro-Voice', 'Danley Sound'],
    futureImpact: 'Metamaterial acoustic waveguides will bend sound around corners and focus it precisely, enabling immersive 3D audio without headphones.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Medical Acoustics',
    short: 'Resonance in diagnostic and therapy',
    tagline: 'Healing with precisely tuned sound',
    description: 'From stethoscopes to therapeutic ultrasound, medical devices use acoustic resonance. Tuning forks for neurological exams, ultrasound imaging, and even breaking kidney stones all rely on these principles.',
    connection: 'Tuning forks vibrate at precisely known frequencies due to the same standing wave physics. Stethoscope tubing is designed to resonate at frequencies important for heart and lung sounds.',
    howItWorks: 'Tuning fork prongs form standing wave patterns at specific frequencies. Ultrasonic transducers use piezoelectric resonance. Stethoscope tubing amplifies certain frequency ranges through resonance.',
    stats: [
      { value: '1 MHz', label: 'Ultrasound frequency', icon: '📡' },
      { value: '99%', label: 'Diagnostic accuracy', icon: '🎯' },
      { value: '343 m/s', label: 'Sound speed in body', icon: '❤️' }
    ],
    examples: ['Hearing tests', 'Vibration sense testing', 'HIFU therapy', 'Acoustic stethoscopes'],
    companies: ['3M Littmann', 'Welch Allyn', 'Mettler Electronics', 'Chattanooga'],
    futureImpact: 'Acoustic therapy devices using precisely tuned resonators will enable non-invasive treatment of tumors, kidney stones, and neurological conditions.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const StrawInstrumentRenderer: React.FC<StrawInstrumentRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [strawLength, setStrawLength] = useState(20); // cm
  const [playing, setPlaying] = useState(false);

  // Twist phase - musical scale
  const [scaleStraws] = useState([20, 17.8, 15.9, 15, 13.4, 11.9, 10.6, 10]); // C major approx
  const [activeStraw, setActiveStraw] = useState<number | null>(null);

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

  // Calculate frequency from length (open pipe approximation)
  const lengthToFrequency = (lengthCm: number) => {
    const lengthM = lengthCm / 100;
    return 343 / (2 * lengthM);
  };

  // Get note name from frequency
  const frequencyToNote = (freq: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = Math.round(12 * Math.log2(freq / A4));
    const noteIndex = ((halfSteps % 12) + 12 + 9) % 12;
    const octave = Math.floor((halfSteps + 9) / 12) + 4;
    return notes[noteIndex] + octave;
  };

  // Play the straw
  const playStraw = useCallback(() => {
    if (playing) return;
    setPlaying(true);
    const freq = lengthToFrequency(strawLength);
    playPipeSound(freq, 0.5);
    setTimeout(() => setPlaying(false), 500);
  }, [playing, strawLength]);

  const playScaleStraw = (index: number) => {
    setActiveStraw(index);
    const freq = lengthToFrequency(scaleStraws[index]);
    playPipeSound(freq, 0.4);
    setTimeout(() => setActiveStraw(null), 400);
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    pipe: '#0EA5E9',
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
    twist_play: 'Explore Musical Scale',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'straw-instrument',
        gameTitle: 'Straw Instrument',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Straw Visualization SVG Component
  const StrawVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;
    const currentFreq = lengthToFrequency(strawLength);
    const currentNote = frequencyToNote(currentFreq);
    const strawHeight = strawLength * 6;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="strawGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="15%" stopColor="#0ea5e9" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#7dd3fc" />
            <stop offset="85%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="soundWaveGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Straw Pipe Resonance
        </text>

        {/* Straw visualization */}
        <g transform={`translate(${width/2 - 30}, ${height - 60 - strawHeight})`}>
          {/* Straw body */}
          <rect
            x="0"
            y="0"
            width="60"
            height={strawHeight}
            fill="url(#strawGrad)"
            rx="8"
            filter={playing ? "url(#glowFilter)" : undefined}
          />

          {/* 3D highlight stripes */}
          {Array.from({ length: Math.floor(strawHeight / 25) }).map((_, i) => (
            <rect
              key={i}
              x="5"
              y={i * 25 + 10}
              width="50"
              height="4"
              fill="rgba(255,255,255,0.3)"
              rx="2"
            />
          ))}

          {/* Top opening ellipse */}
          <ellipse cx="30" cy="0" rx="30" ry="8" fill="#075985" opacity="0.7" />

          {/* Standing wave inside - spans full straw height */}
          <path
            d={`M 10,${strawHeight*0.1} Q 30,${strawHeight*0.25} 50,${strawHeight*0.4} Q 30,${strawHeight*0.55} 10,${strawHeight*0.7} Q 30,${strawHeight*0.85} 50,${strawHeight*0.9}`}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="3"
            opacity="0.7"
          >
            <animate
              attributeName="d"
              values={`M 10,${strawHeight*0.1} Q 30,${strawHeight*0.25} 50,${strawHeight*0.4} Q 30,${strawHeight*0.55} 10,${strawHeight*0.7} Q 30,${strawHeight*0.85} 50,${strawHeight*0.9};M 10,${strawHeight*0.1} Q 30,${strawHeight*0.35} 50,${strawHeight*0.5} Q 30,${strawHeight*0.65} 10,${strawHeight*0.8} Q 30,${strawHeight*0.15} 50,${strawHeight*0.9};M 10,${strawHeight*0.1} Q 30,${strawHeight*0.25} 50,${strawHeight*0.4} Q 30,${strawHeight*0.55} 10,${strawHeight*0.7} Q 30,${strawHeight*0.85} 50,${strawHeight*0.9}`}
              dur="0.3s"
              repeatCount="indefinite"
            />
          </path>

          {/* Sound waves when playing */}
          {playing && (
            <g>
              {[0, 1, 2, 3].map(i => (
                <ellipse
                  key={i}
                  cx="30"
                  cy={-15 - i * 18}
                  rx={20 + i * 15}
                  ry={8 + i * 5}
                  fill="none"
                  stroke="url(#soundWaveGrad)"
                  strokeWidth="3"
                  opacity={0.9 - i * 0.2}
                >
                  <animate
                    attributeName="ry"
                    values={`${8 + i * 5};${12 + i * 5};${8 + i * 5}`}
                    dur="0.12s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              ))}
            </g>
          )}
        </g>

        {/* Full-height standing wave visualization spanning SVG height */}
        <path
          d={`M ${width/2 - 60} ${height * 0.1} Q ${width/2} ${height * 0.25} ${width/2 + 60} ${height * 0.4} Q ${width/2} ${height * 0.55} ${width/2 - 60} ${height * 0.7} Q ${width/2} ${height * 0.85} ${width/2 + 60} ${height * 0.9}`}
          fill="none"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeDasharray="6,4"
          opacity="0.2"
        />

        {/* Background group: grid lines and tick marks */}
        <g id="background-grid">
          {[0.25, 0.5, 0.75].map((f, gi) => (
            <line key={gi} x1={20} y1={height * f} x2={width - 20} y2={height * f} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
          ))}
          {/* Tick marks on left */}
          {[0.25, 0.5, 0.75].map((f, gi) => (
            <line key={`t${gi}`} x1={15} y1={height * f} x2={25} y2={height * f} stroke={colors.textMuted} strokeWidth="1.5" />
          ))}
        </g>

        {/* Frequency display panel - absolute coords, always highlighted */}
        <rect x={width - 130} y={50} width="110" height="80" rx="10" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5"
          filter="url(#glowFilter)" />
        <text x={width - 75} y={70} textAnchor="middle" fill={colors.textMuted} fontSize="11">Frequency</text>
        <text x={width - 75} y={94} textAnchor="middle" fill={colors.success} fontSize="18" fontWeight="700">
          {currentFreq.toFixed(0)} Hz
        </text>
        <text x={width - 75} y={116} textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="600">
          {currentNote}
        </text>

        {/* Length display - absolute coords */}
        <rect x={20} y={50} width="90" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.pipe} strokeWidth="1" />
        <text x={65} y={69} textAnchor="middle" fill={colors.textMuted} fontSize="11">Length</text>
        <text x={65} y={90} textAnchor="middle" fill={colors.pipe} fontSize="16" fontWeight="700">
          {strawLength} cm
        </text>

        {/* Formula */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="12">
          f = v / (2L) = 343 / (2 x {(strawLength/100).toFixed(2)}) = {currentFreq.toFixed(0)} Hz
        </text>
      </svg>
    );
  };

  // Scale Visualization for twist phase
  const ScaleVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 260;
    const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C\''];

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          {scaleStraws.map((_, i) => (
            <linearGradient key={i} id={`scaleGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#4f46e5', '#7c3aed', '#be185d'][i]} />
              <stop offset="50%" stopColor={['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6'][i]} />
              <stop offset="100%" stopColor={['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#4f46e5', '#7c3aed', '#be185d'][i]} />
            </linearGradient>
          ))}
          <filter id="activeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Straw Pan Flute - Click to Play!
        </text>

        {/* Wooden base */}
        <rect x="20" y={height - 35} width={width - 40} height="25" fill="#92400e" rx="6" />
        <rect x="25" y={height - 33} width={width - 50} height="2" fill="rgba(0,0,0,0.2)" />

        {/* Straws */}
        {scaleStraws.map((length, i) => {
          const strawH = length * 5;
          const x = 35 + i * ((width - 70) / 8);
          const isActive = activeStraw === i;

          return (
            <g
              key={i}
              style={{ cursor: 'pointer' }}
              onClick={() => playScaleStraw(i)}
            >
              <rect
                x={x}
                y={height - 35 - strawH}
                width="40"
                height={strawH}
                fill={`url(#scaleGrad${i})`}
                rx="6"
                filter={isActive ? "url(#activeGlow)" : undefined}
              />
              {/* Top opening */}
              <ellipse cx={x + 20} cy={height - 35 - strawH} rx="20" ry="5" fill="rgba(0,0,0,0.3)" />

              {/* Sound waves when active */}
              {isActive && (
                <>
                  {[0, 1, 2].map(j => (
                    <ellipse
                      key={j}
                      cx={x + 20}
                      cy={height - 35 - strawH - 10 - j * 12}
                      rx={15 + j * 10}
                      ry={5 + j * 3}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      opacity={0.8 - j * 0.25}
                    >
                      <animate attributeName="ry" values={`${5 + j * 3};${8 + j * 3};${5 + j * 3}`} dur="0.1s" repeatCount="indefinite" />
                    </ellipse>
                  ))}
                </>
              )}

              {/* Note name */}
              <text
                x={x + 20}
                y={height - 12}
                textAnchor="middle"
                fill={isActive ? colors.accent : colors.textPrimary}
                fontSize="12"
                fontWeight="600"
              >
                {noteNames[i]}
              </text>
            </g>
          );
        })}
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
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation bar
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: '4px',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '12px 16px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      zIndex: 1000,
    }}>
      <span style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} - Phase {phaseOrder.indexOf(phase) + 1} of {phaseOrder.length}
      </span>
    </nav>
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
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Bottom navigation bar with Back/Next buttons
  const renderBottomBar = (backDisabled = false, nextDisabled = false, nextLabel = 'Next →') => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 1000,
      }}>
        <button
          onClick={prevPhase}
          disabled={backDisabled || currentIndex === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: (backDisabled || currentIndex === 0) ? colors.textMuted : colors.textSecondary,
            cursor: (backDisabled || currentIndex === 0) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={nextDisabled || currentIndex === phaseOrder.length - 1}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: (nextDisabled || currentIndex === phaseOrder.length - 1) ? colors.textMuted : colors.accent,
            color: 'white',
            cursor: (nextDisabled || currentIndex === phaseOrder.length - 1) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        height: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 80px', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🎵🥤
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Straw Instrument
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Can a simple <span style={{ color: colors.pipe }}>drinking straw</span> teach us the physics behind <span style={{ color: colors.accent }}>musical instruments</span>? The same principles that make a straw whistle also make pipe organs play!"
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
            "Standing waves form inside tubes when sound reflects back and forth. Only certain wavelengths 'fit' - creating the specific notes we hear. Cut the tube shorter, and the pitch goes up!"
          </p>
          <p className="text-muted" style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - The Physics of Musical Instruments
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Pipe Resonance
        </button>

        {renderNavDots()}
        </div>
        {renderBottomBar(true, false, 'Next →')}
      </div>
    );
  }

  // Static prediction visualization
  const PredictVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 260;
    const baseY = height - 40;
    const longH = 140;
    const shortH = 70;
    const longX = Math.round(width * 0.25);
    const shortX = Math.round(width * 0.62);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="predStrawGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="predGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={20} y1={height * f} x2={width - 20} y2={height * f} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        ))}
        {/* Tick marks on left axis */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={`t${i}`} x1={15} y1={height * f} x2={25} y2={height * f} stroke={colors.textMuted} strokeWidth="1.5" />
        ))}
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Two Straws - Which makes a higher pitch?
        </text>
        {/* Long straw - absolute coordinates */}
        <rect x={longX} y={baseY - longH} width="50" height={longH} fill="url(#predStrawGrad)" rx="8" />
        <ellipse cx={longX + 25} cy={baseY - longH} rx="25" ry="6" fill="#075985" opacity="0.7" />
        {/* Standing wave inside long straw */}
        <path d={`M ${longX+8} ${baseY - longH*0.5} Q ${longX+25} ${baseY - longH*0.65} ${longX+42} ${baseY - longH*0.5} Q ${longX+25} ${baseY - longH*0.35} ${longX+8} ${baseY - longH*0.5}`} fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />
        <text x={longX + 25} y={baseY - longH - 10} textAnchor="middle" fill={colors.pipe} fontSize="14" fontWeight="600">20 cm</text>
        <text x={longX + 25} y={baseY + 18} textAnchor="middle" fill={colors.textMuted} fontSize="12">Lower pitch?</text>
        {/* Short straw - absolute coordinates */}
        <rect x={shortX} y={baseY - shortH} width="50" height={shortH} fill="#dc2626" rx="8" />
        <ellipse cx={shortX + 25} cy={baseY - shortH} rx="25" ry="6" fill="#991b1b" opacity="0.7" />
        {/* Standing wave inside short straw */}
        <path d={`M ${shortX+8} ${baseY - shortH*0.5} Q ${shortX+25} ${baseY - shortH*0.65} ${shortX+42} ${baseY - shortH*0.5} Q ${shortX+25} ${baseY - shortH*0.35} ${shortX+8} ${baseY - shortH*0.5}`} fill="none" stroke="#fca5a5" strokeWidth="2" opacity="0.6" />
        <text x={shortX + 25} y={baseY - shortH - 10} textAnchor="middle" fill={colors.error} fontSize="14" fontWeight="600">10 cm</text>
        <text x={shortX + 25} y={baseY + 18} textAnchor="middle" fill={colors.textMuted} fontSize="12">Higher pitch?</text>
        {/* Base line */}
        <line x1={20} y1={baseY} x2={width - 20} y2={baseY} stroke={colors.border} strokeWidth="2" />
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The long straw (20 cm) produces a higher pitch' },
      { id: 'b', text: 'The short straw (10 cm) produces a higher pitch', correct: true },
      { id: 'c', text: 'Both straws produce the same pitch' },
    ];

    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>

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
            You have two straws: one is 20 cm long, the other is 10 cm. When you blow across them, which produces the higher pitch?
          </h2>

          {/* Visual diagram with SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <PredictVisualization />
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Which one makes a higher sound?
            </p>
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
        {renderBottomBar(false, false)}
      </div>
    );
  }

  // PLAY PHASE - Interactive Straw Simulator
  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Straw Instrument Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust the straw length and hear how the pitch changes!
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Observe: Move the slider to change straw length and click "Blow!" to hear the sound. Watch how frequency changes with length.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <StrawVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Length slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Straw Length</span>
                    <span style={{ ...typo.small, color: colors.pipe, fontWeight: 600 }}>{strawLength} cm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={strawLength}
                    onChange={(e) => setStrawLength(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                    } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>5 cm (high pitch)</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>30 cm (low pitch)</span>
                  </div>
                </div>

                {/* Play button */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <button
                    onClick={playStraw}
                    disabled={playing}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '12px',
                      border: 'none',
                      background: playing ? colors.border : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '18px',
                      cursor: playing ? 'not-allowed' : 'pointer',
                      boxShadow: playing ? 'none' : `0 4px 20px ${colors.accentGlow}`,
                    }}
                  >
                    {playing ? 'Playing...' : 'Blow!'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.pipe }}>{strawLength} cm</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Tube Length</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{lengthToFrequency(strawLength).toFixed(0)} Hz</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Frequency</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{frequencyToNote(lengthToFrequency(strawLength))}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Musical Note</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Notice: Shorter straws = Higher pitch! The 10 cm straw produces twice the frequency of the 20 cm straw.
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.pipe, marginBottom: '8px' }}>
              Why This Matters in Real Life
            </h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              This pipe resonance principle powers every wind instrument — from flutes and clarinets to pipe organs with thousands of pipes. Engineers use it to design acoustic systems, hearing aids, and even the resonance chambers in concert halls.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionCorrect = prediction === 'b';
    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>

          {/* Connect to prediction */}
          {prediction && (
            <div style={{
              background: predictionCorrect ? `${colors.success}22` : `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${predictionCorrect ? colors.success : colors.error}`,
            }}>
              <p style={{ ...typo.body, color: predictionCorrect ? colors.success : colors.error, margin: 0 }}>
                {predictionCorrect
                  ? 'Your prediction was correct! The short straw does produce a higher pitch.'
                  : 'Your prediction was incorrect — the short straw produces a higher pitch, not the long one.'}
              </p>
            </div>
          )}

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
            The Physics of Pipe Resonance
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            As you observed in your experiment, shorter tubes produce higher-pitched sounds. Your prediction was tested — now let's understand the physics behind what you saw.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>f = v / (2L) - The Open Pipe Formula</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Where <span style={{ color: colors.accent }}>f</span> is frequency, <span style={{ color: colors.accent }}>v</span> is the speed of sound (343 m/s), and <span style={{ color: colors.accent }}>L</span> is the tube length.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Why does shorter = higher?</strong>
              </p>
              <p>
                Standing waves form inside the tube. Shorter tubes only fit shorter wavelengths, and shorter wavelengths mean higher frequencies. Halving the length <span style={{ color: colors.success }}>doubles the frequency</span> - that's one musical octave!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.pipe}11`,
            border: `1px solid ${colors.pipe}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.pipe, marginBottom: '12px' }}>
              Key Insight: Inverse Relationship
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Frequency and length are inversely proportional:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>20 cm straw: 343 / (2 x 0.20) = <strong>857 Hz</strong></li>
              <li>10 cm straw: 343 / (2 x 0.10) = <strong>1715 Hz</strong> (double!)</li>
              <li>Half the length = Double the frequency = One octave higher</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Standing Waves and Resonance
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Only certain wavelengths "fit" inside a tube and reinforce themselves through constructive interference. This is resonance - the same phenomenon that allows you to push a swing at just the right time to make it go higher.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Try a New Challenge
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Equal spacing - each tube 2 cm shorter than the previous' },
      { id: 'b', text: 'Ratio spacing - each tube about 11% shorter than the previous', correct: true },
      { id: 'c', text: 'Random lengths can make any musical scale' },
    ];

    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Challenge: Building a Musical Scale
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            To build a C major scale (Do-Re-Mi-Fa-Sol-La-Ti-Do), how should the straw lengths relate to each other?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {/* Scale pattern SVG visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width={isMobile ? 320 : 440} height={200} viewBox={`0 0 ${isMobile ? 320 : 440} 200`} style={{ borderRadius: '8px' }}>
                <defs>
                  <linearGradient id="scaleLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.warning} />
                    <stop offset="100%" stopColor={colors.success} />
                  </linearGradient>
                </defs>
                {/* Grid background */}
                <g id="scale-grid">
                  {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
                    <line key={i} x1="20" y1={200 * f} x2={(isMobile ? 320 : 440) - 20} y2={200 * f} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                  ))}
                  {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
                    <line key={`t${i}`} x1="15" y1={200 * f} x2="25" y2={200 * f} stroke={colors.textMuted} strokeWidth="1.5" />
                  ))}
                </g>
                {/* Frequency curve showing scale pattern: exponential descent */}
                <path
                  d={`M 30,20 Q 80,30 ${isMobile ? 130 : 160},60 Q ${isMobile ? 180 : 220},90 ${isMobile ? 230 : 270},130 Q ${isMobile ? 270 : 330},155 ${isMobile ? 290 : 410},175`}
                  fill="none"
                  stroke="url(#scaleLineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <text x={(isMobile ? 320 : 440) / 2} y="192" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
                  Each note = different tube length (frequency decreases with length)
                </text>
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do\''].map((note, i) => (
                <div key={note} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '30px',
                    height: `${90 - i * 8}px`,
                    background: `linear-gradient(to right, hsl(${i * 45}, 70%, 50%), hsl(${i * 45}, 70%, 60%), hsl(${i * 45}, 70%, 50%))`,
                    borderRadius: '6px',
                    margin: '0 auto 4px',
                  }} />
                  <p style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>{note}</p>
                </div>
              ))}
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              What pattern creates a proper musical scale?
            </p>
          </div>

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
              Build the Scale
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Your Straw Pan Flute
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Click each straw to play a note and notice the length pattern!
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Observe: Click each straw from left to right to play the C major scale. Notice how each tube is proportionally shorter, not equally shorter.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <ScaleVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Length info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  {scaleStraws.slice(0, 4).map((length, i) => (
                    <div key={i} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.small, color: colors.textPrimary }}>{length.toFixed(1)} cm</div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>{lengthToFrequency(length).toFixed(0)} Hz</div>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}>
                  {scaleStraws.slice(4).map((length, i) => (
                    <div key={i + 4} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.small, color: colors.textPrimary }}>{length.toFixed(1)} cm</div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>{lengthToFrequency(length).toFixed(0)} Hz</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pattern insight */}
          <div style={{
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
              Notice: Each straw is about 11% shorter than the previous - a ratio pattern, not equal spacing!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why Ratios Matter
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Musical Math: The Equal Temperament Scale
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>12</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The 12th Root of 2</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Each semitone is a factor of 2^(1/12) = 1.0595 in frequency. After 12 semitones, you double the frequency (one octave). This <span style={{ color: colors.accent }}>ratio-based</span> system is why we can transpose music to any key!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>log</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Logarithmic Perception</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Our ears perceive pitch logarithmically! A change from 100 Hz to 200 Hz sounds the same (one octave) as 500 Hz to 1000 Hz. This is why musical intervals are based on <span style={{ color: colors.success }}>ratios, not fixed differences</span>.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>L</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Length Calculation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Since f = v/(2L), frequency ratios translate to inverse length ratios. To go up one octave (2x frequency), you need half the length. To go up one semitone, multiply length by 1/1.0595 = 0.944.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Straw Instrument"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 600 }}>
            Application {selectedApp + 1} of {realWorldApps.length}
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
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
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
                    checkmark
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
                Connection to Pipe Resonance:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

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

            {/* Got It button */}
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  setSelectedApp(selectedApp + 1);
                }}
                style={{ ...primaryButtonStyle, width: '100%', fontSize: '16px', padding: '14px' }}
              >
                Got It - Next Application →
              </button>
            ) : (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%', fontSize: '16px', padding: '14px', background: colors.success }}
              >
                Got It - Complete!
              </button>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar(false, !allAppsCompleted)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? 'trophy' : 'books'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand pipe resonance and musical acoustics!'
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
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        height: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
          </div>
        </div>
        </div>

        {renderNavDots()}
        {renderBottomBar(false, true, 'Submit Test')}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🎵🏆🎺
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Pipe Resonance Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how tube length creates different musical notes through standing wave resonance.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'f = v/(2L) - the open pipe frequency formula',
              'Shorter tubes = higher pitch (inverse relationship)',
              'Standing waves and resonance select specific frequencies',
              'Musical scales use ratio spacing, not equal spacing',
              'The 12th root of 2 creates the equal temperament scale',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>checkmark</span>
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
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
        </div>
        {renderBottomBar(false, true)}
      </div>
    );
  }

  return null;
};

export default StrawInstrumentRenderer;
