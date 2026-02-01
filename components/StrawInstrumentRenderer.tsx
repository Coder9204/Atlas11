import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// StrawInstrumentRenderer – Teach tunable resonance with straws
// ─────────────────────────────────────────────────────────────
// Physics: Standing waves in tubes, f = v/(2L) for open pipe
// Shorter tube = higher frequency/pitch
// Cut straws to create a scale!

interface StrawInstrumentRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

// Premium sound system
const playGameSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds = {
      click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
      success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
      failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
      transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
      complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
    };

    const s = sounds[type];
    oscillator.frequency.value = s.freq;
    oscillator.type = s.type;
    gainNode.gain.setValueAtTime(s.vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + s.duration);
  } catch {}
};

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
};

const realWorldApps = [
  {
    icon: '🎺',
    title: 'Woodwind Instruments',
    short: 'Precision engineering for musical resonance',
    tagline: 'Every hole is calculated',
    description: 'Clarinets, flutes, and oboes use precisely placed tone holes to change the effective length of the air column, producing different pitches. The physics of straw instruments scales directly to professional instruments.',
    connection: 'The fundamental relationship f = v/(2L) for open pipes determines hole placement. Covering holes lengthens the effective tube, lowering pitch. The same physics applies from straws to concert flutes.',
    howItWorks: 'Tone holes are placed where standing wave nodes would occur for desired frequencies. Open holes create pressure antinodes, effectively shortening the tube. Register keys and overblowing access harmonics.',
    stats: [
      { value: '262Hz', label: 'Middle C frequency', icon: '🎵' },
      { value: '3oct', label: 'Typical range', icon: '📊' },
      { value: '0.1mm', label: 'Manufacturing tolerance', icon: '🎯' }
    ],
    examples: ['Concert flute', 'Clarinet', 'Saxophone', 'Recorder'],
    companies: ['Yamaha', 'Buffet Crampon', 'Selmer', 'Powell Flutes'],
    futureImpact: 'Computational acoustics will enable custom-designed instruments optimized for individual players, with 3D-printed components tuned to perfection.',
    color: '#f59e0b'
  },
  {
    icon: '🎹',
    title: 'Pipe Organs',
    short: 'Architectural-scale resonant tubes',
    tagline: 'The king of instruments',
    description: 'Pipe organs contain thousands of precisely tuned pipes, from tiny metal flutes to massive wooden bass pipes. Each rank uses the same physics as a straw instrument, scaled across many octaves.',
    connection: 'Pipe length determines fundamental pitch through standing wave formation. Metal and wooden pipes have different harmonic content based on wall stiffness and end correction factors.',
    howItWorks: 'Flue pipes use air jets hitting an edge (like recorders). Reed pipes use vibrating brass tongues. Scaling laws determine how diameter changes with length to maintain consistent tone quality.',
    stats: [
      { value: '16Hz', label: 'Lowest pipe (32 ft)', icon: '🔊' },
      { value: '10000+', label: 'Pipes in large organs', icon: '📊' },
      { value: '500yr', label: 'Historic organ lifetimes', icon: '⏰' }
    ],
    examples: ['Cathedral organs', 'Concert hall instruments', 'Theatre organs', 'Electronic emulations'],
    companies: ['Casavant', 'Schantz', 'Skinner', 'Allen Digital'],
    futureImpact: 'Digital modeling will preserve endangered historic organs forever while enabling new tonal possibilities impossible with physical pipes.',
    color: '#8b5cf6'
  },
  {
    icon: '🔊',
    title: 'Acoustic Waveguides',
    short: 'Directing sound through tubes',
    tagline: 'Sound following a path',
    description: 'Speaking tubes, ear trumpets, and modern horn loudspeakers all use tube acoustics to direct and amplify sound. Understanding resonance helps design efficient audio systems.',
    connection: 'Tubes act as acoustic waveguides, with resonances that can enhance or color sound. Horn loading matches speaker impedance to air, using tube physics to increase efficiency.',
    howItWorks: 'Horn loudspeakers use flared tubes to gradually match speaker to air impedance. Folded horns fit long paths in small enclosures. Transmission line speakers use resonant tubes for bass extension.',
    stats: [
      { value: '100dB', label: 'Horn efficiency SPL', icon: '🔊' },
      { value: '10x', label: 'Efficiency vs direct', icon: '📈' },
      { value: '20Hz', label: 'Horn bass extension', icon: '🎵' }
    ],
    examples: ['PA system horns', 'Gramophone horns', 'Subwoofer enclosures', 'Hearing aids'],
    companies: ['JBL', 'Klipsch', 'Electro-Voice', 'Danley Sound'],
    futureImpact: 'Metamaterial acoustic waveguides will bend sound around corners and focus it precisely, enabling immersive audio without headphones.',
    color: '#3b82f6'
  },
  {
    icon: '🏥',
    title: 'Medical Acoustics',
    short: 'Resonance in diagnostic and therapeutic tools',
    tagline: 'Healing with sound waves',
    description: 'Stethoscopes, tuning forks for neurological exams, and therapeutic ultrasound devices all rely on acoustic resonance. The same standing wave physics applies across frequencies.',
    connection: 'Tuning forks vibrate at precisely known frequencies for hearing tests. Therapeutic ultrasound uses resonant transducers. Acoustic stethoscopes use tube resonance to enhance heart and lung sounds.',
    howItWorks: 'Tuning fork prongs form standing wave patterns at specific frequencies. Ultrasonic transducers use piezoelectric resonance. Stethoscope tubing amplifies certain frequency ranges through resonance.',
    stats: [
      { value: '128Hz', label: 'Common tuning fork', icon: '🎵' },
      { value: '1-3MHz', label: 'Therapeutic ultrasound', icon: '📡' },
      { value: '200Hz', label: 'Heart sound peak', icon: '❤️' }
    ],
    examples: ['Hearing tests', 'Vibration sense testing', 'HIFU therapy', 'Acoustic stethoscopes'],
    companies: ['3M Littmann', 'Welch Allyn', 'Mettler Electronics', 'Chattanooga'],
    futureImpact: 'Acoustic therapy devices using precisely tuned resonators will enable non-invasive treatment of tumors, kidney stones, and neurological conditions.',
    color: '#22c55e'
  }
];

// Play musical note with harmonics (more realistic pipe sound)
const playPipeSound = (baseFreq: number, duration: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Fundamental + harmonics for pipe-like sound
    [1, 2, 3].forEach((harmonic, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = baseFreq * harmonic;
      osc.type = 'sine';
      const vol = 0.25 / (harmonic * harmonic); // Higher harmonics quieter
      gain.gain.setValueAtTime(vol, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    });
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Premium SVG Defs Component
// ─────────────────────────────────────────────────────────────
const StrawSvgDefs: React.FC = () => (
  <defs>
    {/* Premium straw body gradient - 3D cylindrical effect */}
    <linearGradient id="strawBodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0284c7" />
      <stop offset="15%" stopColor="#0ea5e9" />
      <stop offset="40%" stopColor="#38bdf8" />
      <stop offset="60%" stopColor="#7dd3fc" />
      <stop offset="85%" stopColor="#38bdf8" />
      <stop offset="100%" stopColor="#0284c7" />
    </linearGradient>

    {/* Straw stripe highlight gradient */}
    <linearGradient id="strawStripeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
      <stop offset="30%" stopColor="rgba(255,255,255,0.4)" />
      <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
      <stop offset="70%" stopColor="rgba(255,255,255,0.4)" />
      <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
    </linearGradient>

    {/* Rainbow straw gradients for scale */}
    <linearGradient id="strawRainbow0" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="20%" stopColor="#ef4444" />
      <stop offset="50%" stopColor="#f87171" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>
    <linearGradient id="strawRainbow1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#ea580c" />
      <stop offset="20%" stopColor="#f97316" />
      <stop offset="50%" stopColor="#fb923c" />
      <stop offset="80%" stopColor="#f97316" />
      <stop offset="100%" stopColor="#ea580c" />
    </linearGradient>
    <linearGradient id="strawRainbow2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#ca8a04" />
      <stop offset="20%" stopColor="#eab308" />
      <stop offset="50%" stopColor="#facc15" />
      <stop offset="80%" stopColor="#eab308" />
      <stop offset="100%" stopColor="#ca8a04" />
    </linearGradient>
    <linearGradient id="strawRainbow3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#16a34a" />
      <stop offset="20%" stopColor="#22c55e" />
      <stop offset="50%" stopColor="#4ade80" />
      <stop offset="80%" stopColor="#22c55e" />
      <stop offset="100%" stopColor="#16a34a" />
    </linearGradient>
    <linearGradient id="strawRainbow4" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0284c7" />
      <stop offset="20%" stopColor="#0ea5e9" />
      <stop offset="50%" stopColor="#38bdf8" />
      <stop offset="80%" stopColor="#0ea5e9" />
      <stop offset="100%" stopColor="#0284c7" />
    </linearGradient>
    <linearGradient id="strawRainbow5" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#4f46e5" />
      <stop offset="20%" stopColor="#6366f1" />
      <stop offset="50%" stopColor="#818cf8" />
      <stop offset="80%" stopColor="#6366f1" />
      <stop offset="100%" stopColor="#4f46e5" />
    </linearGradient>
    <linearGradient id="strawRainbow6" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#7c3aed" />
      <stop offset="20%" stopColor="#8b5cf6" />
      <stop offset="50%" stopColor="#a78bfa" />
      <stop offset="80%" stopColor="#8b5cf6" />
      <stop offset="100%" stopColor="#7c3aed" />
    </linearGradient>
    <linearGradient id="strawRainbow7" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#be185d" />
      <stop offset="20%" stopColor="#ec4899" />
      <stop offset="50%" stopColor="#f472b6" />
      <stop offset="80%" stopColor="#ec4899" />
      <stop offset="100%" stopColor="#be185d" />
    </linearGradient>

    {/* Sound wave gradient - concentric glow */}
    <radialGradient id="strawSoundWaveGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
      <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.7" />
      <stop offset="60%" stopColor="#d97706" stopOpacity="0.4" />
      <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
    </radialGradient>

    {/* Standing wave gradient */}
    <linearGradient id="strawStandingWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
      <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.9" />
      <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
      <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
    </linearGradient>

    {/* Frequency display gradient */}
    <linearGradient id="strawFreqDisplayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#1e293b" />
      <stop offset="30%" stopColor="#0f172a" />
      <stop offset="70%" stopColor="#0f172a" />
      <stop offset="100%" stopColor="#1e293b" />
    </linearGradient>

    {/* Pan flute wood gradient */}
    <linearGradient id="strawWoodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#78350f" />
      <stop offset="20%" stopColor="#92400e" />
      <stop offset="50%" stopColor="#a16207" />
      <stop offset="80%" stopColor="#92400e" />
      <stop offset="100%" stopColor="#78350f" />
    </linearGradient>

    {/* Musical note glow */}
    <radialGradient id="strawNoteGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
      <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
    </radialGradient>

    {/* Premium background gradient */}
    <linearGradient id="strawBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0f172a" />
      <stop offset="25%" stopColor="#1e293b" />
      <stop offset="50%" stopColor="#0f172a" />
      <stop offset="75%" stopColor="#1e293b" />
      <stop offset="100%" stopColor="#0f172a" />
    </linearGradient>

    {/* Straw glow filter */}
    <filter id="strawGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Sound wave pulse glow */}
    <filter id="strawSoundGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Active straw highlight filter */}
    <filter id="strawActiveFilter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Frequency text glow */}
    <filter id="strawFreqGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Inner shadow for straw depth */}
    <filter id="strawInnerShadow">
      <feOffset dx="2" dy="2" />
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function StrawInstrumentRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: StrawInstrumentRendererProps) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [strawLength, setStrawLength] = useState(20); // cm
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Twist state - create a scale
  const [scaleStraws, setScaleStraws] = useState([20, 17.8, 15.9, 15, 13.4, 11.9, 10.6, 10]); // C major approx
  const [activeStraw, setActiveStraw] = useState<number | null>(null);

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

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    onPhaseComplete?.();
    playGameSound('transition');
  };

  // Calculate frequency from length (open pipe approximation)
  // f = v / (2L), v ≈ 343 m/s
  const lengthToFrequency = (lengthCm: number) => {
    const lengthM = lengthCm / 100;
    return 343 / (2 * lengthM);
  };

  // Get note name from frequency
  const frequencyToNote = (freq: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = Math.round(12 * Math.log2(freq / A4));
    const noteIndex = ((halfSteps % 12) + 12 + 9) % 12; // A is index 9
    const octave = Math.floor((halfSteps + 9) / 12) + 4;
    return notes[noteIndex] + octave;
  };

  // Play the straw
  const playStraw = () => {
    if (playing) return;
    setPlaying(true);
    setHasPlayed(true);

    const freq = lengthToFrequency(strawLength);
    playPipeSound(freq, 0.5);

    setTimeout(() => setPlaying(false), 500);
  };

  const playScaleStraw = (index: number) => {
    setActiveStraw(index);
    const freq = lengthToFrequency(scaleStraws[index]);
    playPipeSound(freq, 0.4);
    setTimeout(() => setActiveStraw(null), 400);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playGameSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    playGameSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playGameSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playGameSound('success');
    } else {
      onIncorrectAnswer?.();
      playGameSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "What happens to pitch when you cut a straw shorter?",
      options: [
        { text: "Pitch gets lower", correct: false },
        { text: "Pitch gets higher", correct: true },
        { text: "Pitch stays the same", correct: false },
        { text: "The straw stops making sound", correct: false }
      ],
    },
    {
      question: "What creates the sound in a straw instrument?",
      options: [
        { text: "Air molecules splitting", correct: false },
        { text: "Standing waves (resonance) in the tube", correct: true },
        { text: "Static electricity", correct: false },
        { text: "Air pressure outside the tube", correct: false }
      ],
    },
    {
      question: "For an open pipe, the fundamental frequency formula is:",
      options: [
        { text: "f = v / L", correct: false },
        { text: "f = v / (2L)", correct: true },
        { text: "f = v / (4L)", correct: false },
        { text: "f = 2v / L", correct: false }
      ],
    },
    {
      question: "If a 20 cm straw produces 850 Hz, what frequency would a 10 cm straw produce?",
      options: [
        { text: "425 Hz", correct: false },
        { text: "850 Hz", correct: false },
        { text: "1700 Hz", correct: true },
        { text: "340 Hz", correct: false }
      ],
    },
    {
      question: "Why do pan flutes have tubes of different lengths?",
      options: [
        { text: "For decoration", correct: false },
        { text: "Each length produces a different note", correct: true },
        { text: "Longer tubes are louder", correct: false },
        { text: "They contain different materials", correct: false }
      ],
    },
    {
      question: "What are the nodes in a standing wave?",
      options: [
        { text: "Points of maximum vibration", correct: false },
        { text: "Points of no vibration", correct: true },
        { text: "The ends of the tube", correct: false },
        { text: "Where sound escapes", correct: false }
      ],
    },
    {
      question: "How does a closed pipe differ from an open pipe?",
      options: [
        { text: "Closed pipes are quieter", correct: false },
        { text: "Closed pipes only produce odd harmonics", correct: true },
        { text: "Closed pipes produce lower frequencies", correct: false },
        { text: "No difference in sound", correct: false }
      ],
    },
    {
      question: "What is resonance in the context of musical instruments?",
      options: [
        { text: "When sound bounces back", correct: false },
        { text: "When certain frequencies are amplified by constructive interference", correct: true },
        { text: "When air gets compressed", correct: false },
        { text: "When the tube vibrates visibly", correct: false }
      ],
    },
    {
      question: "If you blow harder into a straw, what primarily changes?",
      options: [
        { text: "Pitch increases significantly", correct: false },
        { text: "Volume increases (pitch may rise slightly)", correct: true },
        { text: "Wavelength changes", correct: false },
        { text: "Nothing changes", correct: false }
      ],
    },
    {
      question: "Why does a straw with a flattened end (like a reed) make sound easier?",
      options: [
        { text: "Air flows faster", correct: false },
        { text: "The vibrating reed creates regular pressure pulses", correct: true },
        { text: "The straw gets longer", correct: false },
        { text: "Air becomes denser", correct: false }
      ],
    }
  ];

  const applications = [
    {
      title: "Pan Flute",
      description: "Ancient multi-tube instrument",
      detail: "The pan flute dates back thousands of years. Each tube is a different length, producing a different note. Players blow across the top of tubes to create music.",
      icon: "🎵"
    },
    {
      title: "Organ Pipes",
      description: "Church organs with hundreds of pipes",
      detail: "Pipe organs contain thousands of metal pipes of different lengths. The largest may be 32 feet long (producing frequencies below human hearing), the smallest just inches.",
      icon: "⛪"
    },
    {
      title: "Clarinet & Oboe",
      description: "Reed instruments with holes",
      detail: "Instead of cutting tubes, these instruments use finger holes to effectively change the tube length. Closing holes makes the tube 'longer' (lower pitch).",
      icon: "🎷"
    },
    {
      title: "Car Exhaust Tuning",
      description: "Engineering for desired sound",
      detail: "Car exhausts are tuned using pipe length and resonance. Sports cars have specific pipe lengths to create their distinctive sound while managing back-pressure.",
      icon: "🚗"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Music From a Straw!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              Can you turn a simple drinking straw into a musical instrument?
              Yes! And it teaches us about standing waves and resonance.
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <StrawSvgDefs />

              {/* Premium background */}
              <rect x="0" y="0" width="400" height="250" fill="url(#strawBgGradient)" rx="12" />

              {/* Multiple straws of different lengths - pan flute style */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const length = 180 - i * 18;
                const x = 50 + i * 40;
                return (
                  <g key={i}>
                    {/* Straw body with 3D gradient */}
                    <rect
                      x={x}
                      y={200 - length}
                      width="25"
                      height={length}
                      fill={`url(#strawRainbow${i})`}
                      rx="4"
                      filter="url(#strawGlowFilter)"
                    />
                    {/* Highlight stripes for 3D effect */}
                    {[0, 1, 2].map(j => (
                      length > j * 25 + 15 && (
                        <rect
                          key={j}
                          x={x + 2}
                          y={200 - length + j * 25 + 10}
                          width="21"
                          height="4"
                          fill="url(#strawStripeGradient)"
                          rx="2"
                        />
                      )
                    ))}
                    {/* Top opening - ellipse for 3D */}
                    <ellipse
                      cx={x + 12.5}
                      cy={200 - length}
                      rx="12.5"
                      ry="3"
                      fill="#0c4a6e"
                      opacity="0.5"
                    />
                  </g>
                );
              })}

              {/* Musical notes with glow */}
              <g filter="url(#strawSoundGlowFilter)">
                <text x="50" y="45" fill="#fbbf24" fontSize="22" fontFamily="serif">&#9834;</text>
                <text x="150" y="35" fill="#f59e0b" fontSize="28" fontFamily="serif">&#9835;</text>
                <text x="250" y="50" fill="#fbbf24" fontSize="24" fontFamily="serif">&#9834;</text>
                <text x="330" y="40" fill="#f59e0b" fontSize="22" fontFamily="serif">&#9835;</text>
              </g>

              {/* Sound wave arcs emanating from straws */}
              {[0, 1, 2].map(i => (
                <path
                  key={i}
                  d={`M 40 ${60 + i * 20} Q 200 ${30 + i * 15} 360 ${60 + i * 20}`}
                  fill="none"
                  stroke="url(#strawSoundWaveGradient)"
                  strokeWidth="2"
                  opacity={0.5 - i * 0.15}
                >
                  <animate
                    attributeName="opacity"
                    values={`${0.5 - i * 0.15};${0.2 - i * 0.05};${0.5 - i * 0.15}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </svg>

            {/* Label outside SVG using typo system */}
            <p style={{
              fontSize: typo.body,
              fontWeight: 600,
              color: '#f8fafc',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              Different lengths = Different notes!
            </p>

            <button
              onMouseDown={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Explore Straw Music
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              You have two straws: one is <strong style={{ color: '#f8fafc' }}>20 cm long</strong>, the other is
              <strong style={{ color: '#f8fafc' }}> 10 cm long</strong>. When you blow across them to make sound,
              which produces the <strong style={{ color: '#f8fafc' }}>higher pitch</strong>?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <StrawSvgDefs />

              {/* Premium background */}
              <rect x="0" y="0" width="400" height="150" fill="url(#strawBgGradient)" rx="12" />

              {/* Long straw */}
              <g transform="translate(70, 20)">
                <rect
                  x="0"
                  y="0"
                  width="30"
                  height="100"
                  fill="url(#strawRainbow4)"
                  rx="4"
                  filter="url(#strawGlowFilter)"
                />
                {/* 3D stripes */}
                {[0, 1, 2, 3].map(j => (
                  <rect
                    key={j}
                    x={2}
                    y={j * 22 + 8}
                    width="26"
                    height="4"
                    fill="url(#strawStripeGradient)"
                    rx="2"
                  />
                ))}
                {/* Top opening */}
                <ellipse cx="15" cy="0" rx="15" ry="4" fill="#075985" opacity="0.6" />
                {/* Question mark glow */}
                <text x="15" y="-12" textAnchor="middle" fill="#60a5fa" fontSize="18" fontWeight="bold" filter="url(#strawFreqGlow)">?</text>
              </g>

              {/* Short straw */}
              <g transform="translate(270, 70)">
                <rect
                  x="0"
                  y="0"
                  width="30"
                  height="50"
                  fill="url(#strawRainbow0)"
                  rx="4"
                  filter="url(#strawGlowFilter)"
                />
                {/* 3D stripes */}
                {[0, 1].map(j => (
                  <rect
                    key={j}
                    x={2}
                    y={j * 18 + 8}
                    width="26"
                    height="4"
                    fill="url(#strawStripeGradient)"
                    rx="2"
                  />
                ))}
                {/* Top opening */}
                <ellipse cx="15" cy="0" rx="15" ry="4" fill="#7f1d1d" opacity="0.6" />
                {/* Question mark glow */}
                <text x="15" y="-12" textAnchor="middle" fill="#f87171" fontSize="18" fontWeight="bold" filter="url(#strawFreqGlow)">?</text>
              </g>

              {/* Comparison arrow with gradient */}
              <path
                d="M 120 70 L 250 70"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="8,4"
                opacity="0.5"
              />
            </svg>

            {/* Labels outside SVG */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 400,
              marginBottom: '1.5rem',
              padding: '0 20px'
            }}>
              <span style={{ fontSize: typo.small, color: '#60a5fa', fontWeight: 600 }}>20 cm</span>
              <span style={{ fontSize: typo.small, color: '#94a3b8' }}>Which makes the higher sound?</span>
              <span style={{ fontSize: typo.small, color: '#f87171', fontWeight: 600 }}>10 cm</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Long straw (20 cm) = higher pitch' },
                { id: 'b', text: 'Short straw (10 cm) = higher pitch' },
                { id: 'c', text: 'Both make the same pitch' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id
                      ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: prediction === opt.id ? 'white' : '#f8fafc',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#334155'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    fontSize: typo.body
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onMouseDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        const currentFreq = lengthToFrequency(strawLength);
        const currentNote = frequencyToNote(currentFreq);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Straw Instrument Lab
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: typo.body }}>
              Adjust the straw length and listen to the pitch change!
            </p>

            <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              <StrawSvgDefs />

              {/* Premium background with rounded corners */}
              <rect x="0" y="0" width="400" height="220" fill="url(#strawBgGradient)" rx="12" />

              {/* Straw visualization with dynamic length */}
              <g transform={`translate(160, ${180 - strawLength * 5})`}>
                {/* Straw body with premium gradient */}
                <rect
                  x="0"
                  y="0"
                  width="50"
                  height={strawLength * 5}
                  fill="url(#strawBodyGradient)"
                  rx="6"
                  filter={playing ? "url(#strawActiveFilter)" : "url(#strawGlowFilter)"}
                  style={{ transition: 'filter 0.2s' }}
                />

                {/* 3D highlight stripes */}
                {Array.from({ length: Math.floor(strawLength / 5) }).map((_, i) => (
                  <rect
                    key={i}
                    x={4}
                    y={i * 25 + 10}
                    width="42"
                    height="4"
                    fill="url(#strawStripeGradient)"
                    rx="2"
                  />
                ))}

                {/* Top opening - ellipse for 3D depth */}
                <ellipse
                  cx="25"
                  cy="0"
                  rx="25"
                  ry="6"
                  fill="#075985"
                  opacity="0.7"
                />

                {/* Standing wave visualization inside straw */}
                <path
                  d={`M 8,${strawLength * 2.5}
                      Q 25,${strawLength * 2.5 - 15} 42,${strawLength * 2.5}
                      Q 25,${strawLength * 2.5 + 15} 8,${strawLength * 2.5}`}
                  fill="none"
                  stroke="url(#strawStandingWaveGradient)"
                  strokeWidth="3"
                  opacity="0.7"
                >
                  <animate
                    attributeName="d"
                    values={`M 8,${strawLength * 2.5} Q 25,${strawLength * 2.5 - 15} 42,${strawLength * 2.5} Q 25,${strawLength * 2.5 + 15} 8,${strawLength * 2.5};
                             M 8,${strawLength * 2.5} Q 25,${strawLength * 2.5 + 15} 42,${strawLength * 2.5} Q 25,${strawLength * 2.5 - 15} 8,${strawLength * 2.5};
                             M 8,${strawLength * 2.5} Q 25,${strawLength * 2.5 - 15} 42,${strawLength * 2.5} Q 25,${strawLength * 2.5 + 15} 8,${strawLength * 2.5}`}
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
                        cx="25"
                        cy={-15 - i * 18}
                        rx={15 + i * 12}
                        ry={6 + i * 4}
                        fill="none"
                        stroke="url(#strawSoundWaveGradient)"
                        strokeWidth="3"
                        opacity={0.9 - i * 0.2}
                        filter="url(#strawSoundGlowFilter)"
                      >
                        <animate
                          attributeName="ry"
                          values={`${6 + i * 4};${10 + i * 4};${6 + i * 4}`}
                          dur="0.12s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values={`${0.9 - i * 0.2};${0.5 - i * 0.1};${0.9 - i * 0.2}`}
                          dur="0.12s"
                          repeatCount="indefinite"
                        />
                      </ellipse>
                    ))}
                  </g>
                )}
              </g>

              {/* Premium frequency display panel */}
              <g transform="translate(280, 25)">
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="80"
                  fill="url(#strawFreqDisplayGradient)"
                  rx="10"
                  stroke="#334155"
                  strokeWidth="1"
                />
                {/* Screen bezel */}
                <rect x="8" y="8" width="84" height="64" fill="#020617" rx="6" />
                {/* Frequency text with glow */}
                <text
                  x="50"
                  y="38"
                  textAnchor="middle"
                  fill="#22c55e"
                  fontSize="16"
                  fontFamily="monospace"
                  fontWeight="bold"
                  filter="url(#strawFreqGlow)"
                >
                  {currentFreq.toFixed(0)} Hz
                </text>
                {/* Note name */}
                <text
                  x="50"
                  y="60"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="20"
                  fontWeight="bold"
                  filter="url(#strawFreqGlow)"
                >
                  {currentNote}
                </text>
              </g>

              {/* Frequency indicator bar */}
              <g transform="translate(20, 180)">
                <rect x="0" y="0" width="120" height="8" fill="#1e293b" rx="4" />
                <rect
                  x="0"
                  y="0"
                  width={Math.min(120, (currentFreq / 3500) * 120)}
                  height="8"
                  fill="url(#strawStandingWaveGradient)"
                  rx="4"
                />
              </g>
            </svg>

            {/* Length label outside SVG */}
            <p style={{
              fontSize: typo.small,
              color: '#94a3b8',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              Length: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{strawLength} cm</span>
            </p>

            {/* Length slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: typo.small }}>
                Straw Length: {strawLength} cm
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={strawLength}
                onChange={(e) => setStrawLength(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.label, color: '#64748b' }}>
                <span>5 cm (high)</span>
                <span>30 cm (low)</span>
              </div>
            </div>

            {/* Play button */}
            <button
              onMouseDown={playStraw}
              disabled={playing}
              style={{
                padding: '1rem 2rem',
                background: playing
                  ? '#475569'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: playing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '1.1rem',
                marginBottom: '1rem',
                boxShadow: playing ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)'
              }}
            >
              {playing ? 'Playing...' : 'Blow!'}
            </button>

            {hasPlayed && (
              <button
                onMouseDown={() => {
                  setShowResult(true);
                  if (prediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'b'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))'
                  : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400,
                border: `1px solid ${prediction === 'b' ? '#22c55e' : '#f59e0b'}`
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#22c55e' : '#f59e0b', fontSize: typo.bodyLarge }}>
                  {prediction === 'b' ? 'Correct!' : 'Shorter = Higher!'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: typo.body, marginTop: '0.5rem' }}>
                  <strong>Shorter straws produce higher pitches!</strong> The sound wave
                  wavelength must fit in the tube, so shorter tubes = shorter waves = higher frequency.
                </p>
                <button
                  onMouseDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              The Physics of Pipe Resonance
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(29, 78, 216, 0.2))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '0.75rem', fontSize: typo.bodyLarge }}>Standing Waves</h3>

              <svg viewBox="0 0 300 120" style={{ width: '100%', marginBottom: '1rem' }}>
                <StrawSvgDefs />

                {/* Background */}
                <rect x="0" y="0" width="300" height="120" fill="url(#strawBgGradient)" rx="8" />

                {/* Tube with premium styling */}
                <rect
                  x="30"
                  y="25"
                  width="240"
                  height="50"
                  fill="rgba(148, 163, 184, 0.15)"
                  stroke="#64748b"
                  strokeWidth="2"
                  rx="6"
                />

                {/* Standing wave visualization with gradient */}
                <path
                  d="M 30,50 Q 90,20 150,50 Q 210,80 270,50"
                  fill="none"
                  stroke="url(#strawStandingWaveGradient)"
                  strokeWidth="4"
                  filter="url(#strawGlowFilter)"
                >
                  <animate
                    attributeName="d"
                    values="M 30,50 Q 90,20 150,50 Q 210,80 270,50;M 30,50 Q 90,80 150,50 Q 210,20 270,50;M 30,50 Q 90,20 150,50 Q 210,80 270,50"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </path>

                {/* Node indicators */}
                <circle cx="30" cy="50" r="4" fill="#22c55e" filter="url(#strawGlowFilter)" />
                <circle cx="150" cy="50" r="4" fill="#22c55e" filter="url(#strawGlowFilter)" />
                <circle cx="270" cy="50" r="4" fill="#22c55e" filter="url(#strawGlowFilter)" />

                {/* Wavelength indicator */}
                <path d="M 30,95 L 270,95" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4,2" />
                <path d="M 30,90 L 30,100" stroke="#94a3b8" strokeWidth="2" />
                <path d="M 270,90 L 270,100" stroke="#94a3b8" strokeWidth="2" />
              </svg>

              {/* Wavelength label outside SVG */}
              <p style={{
                fontSize: typo.label,
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                wavelength = 2 x tube length
              </p>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem',
                border: '1px solid #334155'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  f = v / (2L)
                </p>
                <p style={{ fontSize: typo.small, color: '#94a3b8', marginTop: '0.5rem' }}>
                  frequency = sound speed / (2 x tube length)
                </p>
              </div>

              <div style={{ fontSize: typo.body, color: '#e2e8f0' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#fbbf24' }}>Key insight:</strong> Halve the length → double the frequency!
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: '#94a3b8' }}>
                  <li>20 cm straw → ~858 Hz</li>
                  <li>10 cm straw → ~1,715 Hz (one octave higher)</li>
                </ul>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.2), rgba(21, 128, 61, 0.15))',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              <h4 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: typo.body }}>Why It Resonates</h4>
              <p style={{ color: '#e2e8f0', fontSize: typo.body }}>
                Air vibrates inside the tube, creating standing waves. Only certain
                wavelengths "fit" in the tube and reinforce themselves - this is
                <strong style={{ color: '#22c55e' }}> resonance</strong>. Other wavelengths cancel out and die away.
              </p>
            </div>

            <button
              onMouseDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
              }}
            >
              Try a Twist!
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              Build a Musical Scale!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              To make a C major scale (Do-Re-Mi-Fa-Sol-La-Ti-Do) with straws,
              how should the lengths relate to each other?
            </p>

            <svg viewBox="0 0 400 130" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <StrawSvgDefs />

              {/* Premium background */}
              <rect x="0" y="0" width="400" height="130" fill="url(#strawBgGradient)" rx="12" />

              {/* Scale visualization with rainbow gradients */}
              {['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do\''].map((note, i) => {
                const height = 85 - i * 8;
                return (
                  <g key={i} transform={`translate(${45 + i * 40}, 20)`}>
                    <rect
                      x="0"
                      y={95 - height}
                      width="28"
                      height={height}
                      fill={`url(#strawRainbow${i})`}
                      rx="4"
                      filter="url(#strawGlowFilter)"
                    />
                    {/* Highlight stripe */}
                    <rect
                      x={3}
                      y={95 - height + 8}
                      width="22"
                      height="3"
                      fill="url(#strawStripeGradient)"
                      rx="1"
                    />
                    {/* Top opening */}
                    <ellipse
                      cx="14"
                      cy={95 - height}
                      rx="14"
                      ry="3"
                      fill="rgba(0,0,0,0.3)"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Note labels outside SVG */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 400,
              marginBottom: '1.5rem',
              padding: '0 40px'
            }}>
              {['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do\''].map((note, i) => (
                <span key={i} style={{ fontSize: typo.label, color: '#94a3b8', fontWeight: 500 }}>{note}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Equal spacing (each 2 cm shorter)' },
                { id: 'b', text: 'Ratio spacing (each ~11% shorter)' },
                { id: 'c', text: 'Random lengths can make any scale' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: twistPrediction === opt.id ? 'white' : '#f8fafc',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#334155'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: typo.body
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onMouseDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Build the Scale!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C\''];

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Your Straw Pan Flute
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: typo.body }}>
              Click each straw to play a note! Notice the length ratios.
            </p>

            <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              <StrawSvgDefs />

              {/* Premium background */}
              <rect x="0" y="0" width="400" height="220" fill="url(#strawBgGradient)" rx="12" />

              {/* Wooden base with premium gradient */}
              <rect x="20" y="185" width="360" height="25" fill="url(#strawWoodGradient)" rx="6" />
              {/* Wood grain lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1={40 + i * 80}
                  y1="188"
                  x2={40 + i * 80 + 60}
                  y2="188"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="1"
                />
              ))}

              {/* Straws */}
              {scaleStraws.map((length, i) => {
                const freq = lengthToFrequency(length);
                const x = 40 + i * 42;
                const height = length * 6;
                const isActive = activeStraw === i;

                return (
                  <g
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onMouseDown={() => playScaleStraw(i)}
                  >
                    {/* Straw body */}
                    <rect
                      x={x}
                      y={185 - height}
                      width="35"
                      height={height}
                      fill={`url(#strawRainbow${i})`}
                      rx="5"
                      filter={isActive ? "url(#strawActiveFilter)" : "url(#strawGlowFilter)"}
                      style={{ transition: 'filter 0.1s' }}
                    />

                    {/* 3D highlight stripes */}
                    {Array.from({ length: Math.floor(height / 25) }).map((_, j) => (
                      <rect
                        key={j}
                        x={x + 3}
                        y={185 - height + j * 25 + 10}
                        width="29"
                        height="3"
                        fill="url(#strawStripeGradient)"
                        rx="1"
                      />
                    ))}

                    {/* Top opening */}
                    <ellipse
                      cx={x + 17.5}
                      cy={185 - height}
                      rx="17.5"
                      ry="4"
                      fill="rgba(0,0,0,0.4)"
                    />

                    {/* Sound waves when active */}
                    {isActive && (
                      <g>
                        {[0, 1, 2].map(j => (
                          <ellipse
                            key={j}
                            cx={x + 17.5}
                            cy={185 - height - 12 - j * 14}
                            rx={14 + j * 8}
                            ry={5 + j * 3}
                            fill="none"
                            stroke="url(#strawSoundWaveGradient)"
                            strokeWidth="2.5"
                            opacity={0.8 - j * 0.25}
                            filter="url(#strawSoundGlowFilter)"
                          >
                            <animate
                              attributeName="ry"
                              values={`${5 + j * 3};${8 + j * 3};${5 + j * 3}`}
                              dur="0.1s"
                              repeatCount="indefinite"
                            />
                          </ellipse>
                        ))}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Note names and lengths outside SVG */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 400,
              marginBottom: '0.5rem',
              padding: '0 35px'
            }}>
              {noteNames.map((note, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: typo.small,
                    color: activeStraw === i ? '#fbbf24' : '#f8fafc',
                    fontWeight: 600,
                    transition: 'color 0.2s'
                  }}>
                    {note}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 400,
              marginBottom: '1rem',
              padding: '0 30px'
            }}>
              {scaleStraws.map((length, i) => (
                <span key={i} style={{ fontSize: typo.label, color: '#64748b' }}>
                  {length.toFixed(1)}cm
                </span>
              ))}
            </div>

            {/* Frequency info */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '1rem',
              borderRadius: 12,
              width: '100%',
              maxWidth: 400,
              marginBottom: '1rem',
              border: '1px solid #334155'
            }}>
              <p style={{ color: '#94a3b8', fontSize: typo.small, marginBottom: '0.5rem' }}>
                Notice the pattern:
              </p>
              <p style={{ color: '#e2e8f0', fontSize: typo.body }}>
                Each note is about <strong style={{ color: '#fbbf24' }}>~11% shorter</strong> than the previous,
                not a fixed amount shorter. This creates the <strong style={{ color: '#fbbf24' }}>multiplicative</strong> (ratio)
                spacing that musical scales require!
              </p>
            </div>

            <button
              onMouseDown={() => {
                setShowTwistResult(true);
                if (twistPrediction === 'b') {
                  onCorrectAnswer?.();
                } else {
                  onIncorrectAnswer?.();
                }
              }}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Results
            </button>

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'b'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))'
                  : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400,
                border: `1px solid ${twistPrediction === 'b' ? '#22c55e' : '#f59e0b'}`
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'b' ? '#22c55e' : '#f59e0b', fontSize: typo.bodyLarge }}>
                  {twistPrediction === 'b' ? 'Correct!' : 'It\'s about ratios!'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: typo.body, marginTop: '0.5rem' }}>
                  Musical scales use <strong>ratio spacing</strong>. Each semitone is a factor of
                  2^(1/12) ≈ 1.059 in frequency, which means each tube is about 5.6% shorter.
                  A whole octave (double frequency) requires half the length.
                </p>
                <button
                  onMouseDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              Musical Math: The Equal Temperament Scale
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(202, 138, 4, 0.15))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(251, 191, 36, 0.3)'
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '0.75rem', fontSize: typo.bodyLarge }}>The 12th Root of 2</h3>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem',
                border: '1px solid #334155'
              }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  Semitone ratio = <sup>12</sup>√2 ≈ 1.0595
                </p>
                <p style={{ fontSize: typo.small, color: '#94a3b8', marginTop: '0.5rem' }}>
                  12 semitones = 1 octave = 2x frequency
                </p>
              </div>

              <div style={{ fontSize: typo.body, color: '#e2e8f0' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#fbbf24' }}>Why ratios, not fixed steps?</strong>
                </p>
                <p style={{ lineHeight: 1.7, color: '#94a3b8' }}>
                  Our ears perceive pitch <em>logarithmically</em>. A change from 100 Hz to 200 Hz
                  sounds the same (one octave) as 500 Hz to 1000 Hz. This means musical intervals
                  are based on <strong style={{ color: '#f8fafc' }}>ratios</strong>, not fixed differences.
                </p>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.2), rgba(21, 128, 61, 0.15))',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              <h4 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: typo.body }}>Length Calculation</h4>
              <p style={{ color: '#e2e8f0', fontSize: typo.body }}>
                Since f = v/(2L), and frequency ratios are fixed:
              </p>
              <ul style={{ color: '#94a3b8', fontSize: typo.small, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li>Doubling frequency → halving length</li>
                <li>One semitone up → length x (1/1.0595)</li>
                <li>One octave up → length x 0.5</li>
              </ul>
            </div>

            <button
              onMouseDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────
      case 'transfer':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              Pipe Resonance in the Real World
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', fontSize: typo.body }}>
              Explore each application to unlock the test
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1.5rem'
            }}>
              {applications.map((app, index) => (
                <div
                  key={index}
                  onMouseDown={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playGameSound('click');
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15))'
                      : 'rgba(30, 41, 59, 0.8)',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#334155'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#f8fafc', fontSize: typo.body, marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>✓</span>}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: typo.small, marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#cbd5e1', fontSize: typo.small, fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#94a3b8', fontSize: typo.body, marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TEST
      // ───────────────────────────────────────────────────
      case 'test':
        const score = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc' }}>
              Pipe Resonance Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => {
                const isCorrect = tq.options[testAnswers[qi]]?.correct;
                return (
                <div
                  key={qi}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? isCorrect
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#334155'
                        : '#334155'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem', fontSize: typo.body }}>
                    {qi + 1}. {tq.question}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onMouseDown={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? opt.correct
                              ? 'rgba(34, 197, 94, 0.2)'
                              : testAnswers[qi] === oi
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(15, 23, 42, 0.8)'
                            : testAnswers[qi] === oi
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(15, 23, 42, 0.8)',
                          color: '#e2e8f0',
                          border: `1px solid ${
                            testSubmitted
                              ? opt.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : '#334155'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : '#334155'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: typo.body
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )})}
            </div>

            {!testSubmitted ? (
              <button
                onMouseDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#475569'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                  marginBottom: '1rem'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onMouseDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎵🥤🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
              Pipe Resonance Master!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: 400, fontSize: typo.body }}>
              You now understand how changing tube length creates different
              musical notes through standing wave resonance!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(29, 78, 216, 0.2))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '1rem', fontSize: typo.bodyLarge }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: typo.small, color: '#94a3b8' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc' }}>4</p>
                  <p style={{ fontSize: typo.small, color: '#94a3b8' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left',
                border: '1px solid #334155'
              }}>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem', fontSize: typo.body }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#94a3b8', fontSize: typo.small, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>f = v / (2L) for open pipes</li>
                  <li>Shorter = higher pitch</li>
                  <li>Musical scales use ratio spacing</li>
                  <li>Half length = double frequency (octave)</li>
                </ul>
              </div>
            </div>

            {/* Confetti with premium styling */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              <StrawSvgDefs />
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6'][i % 5]}
                  filter="url(#strawGlowFilter)"
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onMouseDown={() => {
                onPhaseComplete?.();
                playGameSound('complete');
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Complete Lesson
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />

      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/3 rounded-full blur-3xl" />

      {/* Fixed header with phase navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Straw Instrument</h1>
                <p className="text-xs text-slate-400">Pipe Resonance</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {phaseOrder.map((p, i) => (
                <div
                  key={p}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-6 bg-gradient-to-r from-amber-400 to-orange-400'
                      : i < currentIndex
                      ? 'w-2 bg-amber-500'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 md:p-8">
            {renderPhase()}
          </div>
        </div>
      </div>
    </div>
  );
}
