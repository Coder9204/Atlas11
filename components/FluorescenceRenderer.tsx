'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface Props {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'Why does a highlighter glow under UV light but appear normal under regular light?',
    options: [
      { text: 'Highlighters have tiny LEDs inside', correct: false },
      { text: 'UV light chemically changes the ink', correct: false },
      { text: 'Fluorescent molecules absorb UV and re-emit visible light', correct: true },
      { text: 'Regular light is too weak to activate the glow', correct: false }
    ]
  },
  {
    question: 'Why is the emitted light a different color (longer wavelength) than the absorbed UV light?',
    options: [
      { text: 'Some energy is lost as heat during the process (Stokes shift)', correct: true },
      { text: 'The molecules change color when hit by light', correct: false },
      { text: 'UV light bounces off and changes color', correct: false },
      { text: 'The eye perceives UV as a different color', correct: false }
    ]
  },
  {
    question: 'Why doesn\'t regular white paper fluoresce much?',
    options: [
      { text: 'White paper is too bright already', correct: false },
      { text: 'Paper lacks special fluorescent molecules', correct: true },
      { text: 'Paper absorbs all UV light completely', correct: false },
      { text: 'Paper is too thick for light to penetrate', correct: false }
    ]
  },
  {
    question: 'A mineral glows red under UV light. What wavelength is the UV light?',
    options: [
      { text: 'Longer than red (infrared)', correct: false },
      { text: 'The same as red (~700nm)', correct: false },
      { text: 'Shorter than red, shorter than all visible light (~365nm)', correct: true },
      { text: 'It depends on the room temperature', correct: false }
    ]
  },
  {
    question: 'What is the main difference between fluorescence and phosphorescence?',
    options: [
      { text: 'Fluorescence uses UV light, phosphorescence uses visible light', correct: false },
      { text: 'Fluorescence stops immediately when light source is removed, phosphorescence continues glowing', correct: true },
      { text: 'They are exactly the same phenomenon', correct: false },
      { text: 'Phosphorescence only occurs in living organisms', correct: false }
    ]
  },
  {
    question: 'What is GFP (Green Fluorescent Protein) used for in biology?',
    options: [
      { text: 'Making plants grow faster', correct: false },
      { text: 'Tagging and tracking proteins/cells in living organisms', correct: true },
      { text: 'Killing bacteria with UV light', correct: false },
      { text: 'Protecting skin from sunburn', correct: false }
    ]
  },
  {
    question: 'Why do blacklights appear purple to our eyes?',
    options: [
      { text: 'They only emit purple visible light', correct: false },
      { text: 'They emit mostly UV with a small amount of visible violet light', correct: true },
      { text: 'Our eyes convert UV directly to purple', correct: false },
      { text: 'The glass filter is painted purple', correct: false }
    ]
  },
  {
    question: 'Why does tonic water glow blue under UV light?',
    options: [
      { text: 'It contains blue food coloring', correct: false },
      { text: 'The quinine in tonic water is fluorescent', correct: true },
      { text: 'The carbonation bubbles reflect UV as blue', correct: false },
      { text: 'The water itself is naturally fluorescent', correct: false }
    ]
  },
  {
    question: 'Some diamonds fluoresce blue under UV light. What causes this?',
    options: [
      { text: 'The carbon atoms themselves fluoresce', correct: false },
      { text: 'Nitrogen impurities in the diamond crystal structure', correct: true },
      { text: 'The diamond cutting pattern reflects UV', correct: false },
      { text: 'Oil residue on the diamond surface', correct: false }
    ]
  },
  {
    question: 'Why do laundry detergents contain optical brighteners (fluorescent compounds)?',
    options: [
      { text: 'To kill bacteria on clothes', correct: false },
      { text: 'To make whites appear brighter by converting UV to visible blue light', correct: true },
      { text: 'To make the detergent smell better', correct: false },
      { text: 'To help the detergent dissolve faster', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Currency Security',
    description: 'Banknotes have fluorescent inks that glow under UV to prevent counterfeiting.',
    icon: '💵'
  },
  {
    title: 'Forensics',
    description: 'Body fluids fluoresce under UV, helping investigators find evidence at crime scenes.',
    icon: '🔍'
  },
  {
    title: 'Fluorescent Lights',
    description: 'UV from mercury vapor hits phosphor coating, which fluoresces white light!',
    icon: '💡'
  },
  {
    title: 'Scorpion Detection',
    description: 'Scorpion exoskeletons contain fluorescent compounds - they glow bright cyan under UV!',
    icon: '🦂'
  }
];

// Fluorophore data with emission/excitation wavelengths
const FLUOROPHORES = {
  gfp: { name: 'GFP (Green Fluorescent Protein)', excitation: 395, emission: 509, color: '#00ff88', description: 'Nobel Prize 2008 - revolutionized cell biology' },
  rhodamine: { name: 'Rhodamine B', excitation: 543, emission: 565, color: '#ff6b6b', description: 'Common red/pink dye used in microscopy' },
  quantum_dot_525: { name: 'Quantum Dot (525nm)', excitation: 350, emission: 525, color: '#22ff22', description: 'Semiconductor nanocrystal with tunable emission' },
  quantum_dot_605: { name: 'Quantum Dot (605nm)', excitation: 350, emission: 605, color: '#ff8800', description: 'Larger quantum dot, longer emission wavelength' },
  dapi: { name: 'DAPI (DNA stain)', excitation: 358, emission: 461, color: '#4488ff', description: 'Used to stain cell nuclei in microscopy' },
  fluorescein: { name: 'Fluorescein', excitation: 494, emission: 521, color: '#88ff00', description: 'Classic green fluorescent dye' }
};

// Scenario-based test questions for comprehensive assessment
const testQuestions = [
  // 1. Core concept - what causes fluorescence (Easy)
  {
    scenario: "A student shines a UV flashlight on various objects in a dark room. Some objects begin to glow brightly in visible colors, while others remain dark.",
    question: "What is the fundamental process that causes certain materials to glow under UV light?",
    options: [
      { id: 'a', label: "The UV light reflects off the surface and changes color" },
      { id: 'b', label: "Fluorescent molecules absorb UV photons and re-emit lower-energy visible light photons", correct: true },
      { id: 'c', label: "The materials contain tiny LEDs that activate when exposed to UV" },
      { id: 'd', label: "UV light chemically reacts with the material to produce new glowing compounds" }
    ],
    explanation: "Fluorescence occurs when molecules absorb high-energy UV photons, which excite electrons to higher energy states. These electrons then relax back down, releasing the energy as visible light photons. Since some energy is lost as heat during the process, the emitted light has lower energy (longer wavelength) than the absorbed UV light."
  },
  // 2. Black light posters (Easy-Medium)
  {
    scenario: "At a party, black light posters on the walls display vivid neon colors that seem to glow intensely, while a regular printed photograph nearby appears dull and barely visible.",
    question: "Why do black light posters glow so brightly while regular photographs do not?",
    options: [
      { id: 'a', label: "Black light posters are printed with special fluorescent inks that absorb UV and emit visible light", correct: true },
      { id: 'b', label: "Regular photographs absorb all the UV light without releasing any" },
      { id: 'c', label: "The black light only illuminates certain color pigments" },
      { id: 'd', label: "Black light posters have a battery-powered backlight" }
    ],
    explanation: "Black light posters use fluorescent inks and dyes specifically designed to absorb UV radiation efficiently and re-emit it as bright visible light. Regular photographs use standard pigments that primarily reflect visible light but don't undergo fluorescence. Under UV illumination with minimal visible light, only the fluorescent materials produce visible emissions."
  },
  // 3. Fluorescent vs incandescent lighting (Medium)
  {
    scenario: "An office manager notices that fluorescent tube lights consume far less electricity than incandescent bulbs while producing similar brightness. Inside the fluorescent tube, mercury vapor produces UV light.",
    question: "How does a fluorescent light tube convert this UV light into the white light we see?",
    options: [
      { id: 'a', label: "The glass tube filters the UV and only allows white light through" },
      { id: 'b', label: "A phosphor coating on the inside of the tube absorbs UV and fluoresces visible white light", correct: true },
      { id: 'c', label: "The mercury vapor directly produces white light at high temperatures" },
      { id: 'd', label: "Multiple colored gases mix together to create white light" }
    ],
    explanation: "Fluorescent tubes work by a two-step process: first, electrical current excites mercury vapor to produce UV light. Then, a phosphor coating on the tube's inner surface absorbs this UV and fluoresces, emitting visible light across the spectrum to appear white. This is more efficient than incandescent bulbs because less energy is wasted as heat."
  },
  // 4. Highlighter ink under UV (Medium)
  {
    scenario: "A forensic investigator uses a UV lamp to examine a document. The yellow highlighter marks, which appear pale yellow in normal light, now glow an intense bright green under the UV lamp.",
    question: "Why does the highlighter appear a different, more intense color under UV light compared to normal light?",
    options: [
      { id: 'a', label: "UV light is stronger and makes all colors more vivid" },
      { id: 'b', label: "The fluorescent dye absorbs UV and emits green light, adding to the reflected yellow to create intense brightness", correct: true },
      { id: 'c', label: "The ink chemically changes color when exposed to UV" },
      { id: 'd', label: "Our eyes perceive UV light as green" }
    ],
    explanation: "Highlighter ink contains fluorescent dyes that serve two purposes: they reflect yellow light (making them visible normally) AND they absorb UV light and fluoresce green. Under UV illumination, you see both the normal reflected color plus the additional fluorescent emission, creating an unusually bright, slightly green-shifted glow that appears more intense than any normal reflection could produce."
  },
  // 5. Stokes shift (Medium-Hard)
  {
    scenario: "A photophysics researcher measures that a fluorescent dye absorbs light at 350 nm (UV) but emits at 520 nm (green visible light). She notes this wavelength difference is essential for the dye's usefulness in imaging.",
    question: "What is this wavelength difference between absorption and emission called, and why does it always occur?",
    options: [
      { id: 'a', label: "Chromatic shift - the molecule changes its chemical structure during fluorescence" },
      { id: 'b', label: "Stokes shift - energy is lost to molecular vibrations and heat before emission", correct: true },
      { id: 'c', label: "Quantum tunneling - some photon energy escapes through quantum effects" },
      { id: 'd', label: "Reflection loss - part of the light bounces away before being absorbed" }
    ],
    explanation: "The Stokes shift describes the difference between absorption and emission wavelengths. After a molecule absorbs a photon and reaches an excited state, it rapidly loses some energy through vibrational relaxation (heat) before emitting a photon. This means the emitted photon always has less energy (longer wavelength) than the absorbed one. This shift is crucial in fluorescence microscopy because it allows filters to separate excitation light from emission."
  },
  // 6. Fluorescence microscopy (Hard)
  {
    scenario: "A cell biologist uses fluorescence microscopy to study protein locations inside living cells. She labels a specific protein with GFP (Green Fluorescent Protein) and can see exactly where that protein exists in the cell.",
    question: "Why is fluorescence microscopy particularly powerful for studying specific structures in cells?",
    options: [
      { id: 'a', label: "It magnifies cells more than regular microscopes" },
      { id: 'b', label: "Fluorescent labels can target specific molecules, and the Stokes shift allows emission to be separated from background", correct: true },
      { id: 'c', label: "All cell components naturally fluoresce in different colors" },
      { id: 'd', label: "Fluorescent light penetrates deeper into thick samples" }
    ],
    explanation: "Fluorescence microscopy is powerful because: (1) fluorescent labels like GFP can be genetically attached to specific proteins, allowing precise targeting, (2) the Stokes shift means emission wavelength differs from excitation, so filters can block the excitation light while passing only fluorescence from labeled structures, and (3) against a dark background, even single fluorescent molecules can be detected, providing extreme sensitivity and contrast."
  },
  // 7. Phosphorescence vs fluorescence (Hard)
  {
    scenario: "A child notices that glow-in-the-dark stars on their ceiling continue glowing for several minutes after the lights are turned off, while their fluorescent poster stops glowing immediately when the UV lamp is switched off.",
    question: "What fundamental difference explains why phosphorescent materials glow long after excitation while fluorescent materials stop immediately?",
    options: [
      { id: 'a', label: "Phosphorescent materials store more light energy in their chemical bonds" },
      { id: 'b', label: "Phosphorescence involves a 'forbidden' triplet state transition that occurs slowly, while fluorescence uses allowed transitions", correct: true },
      { id: 'c', label: "Phosphorescent materials have larger molecules that release energy more slowly" },
      { id: 'd', label: "Fluorescent materials convert all their energy to heat instead of storing it" }
    ],
    explanation: "In fluorescence, electrons return from the excited singlet state to ground state via an 'allowed' transition that happens in nanoseconds. In phosphorescence, electrons first cross to a triplet state where the return transition is quantum mechanically 'forbidden' - it can still happen but very slowly (milliseconds to hours). This forbidden transition acts like a bottleneck, creating the prolonged afterglow characteristic of phosphorescent materials."
  },
  // 8. FRET in biochemistry (Hard)
  {
    scenario: "A biochemist studies protein interactions using FRET (Forster Resonance Energy Transfer). She labels one protein with a cyan fluorescent protein and another with a yellow one. When the proteins bind together, the cyan emission decreases while yellow emission appears.",
    question: "What physical mechanism allows energy to transfer between the two fluorescent labels when the proteins interact?",
    options: [
      { id: 'a', label: "The proteins physically merge, combining their fluorescent properties" },
      { id: 'b', label: "Non-radiative dipole-dipole coupling transfers energy between nearby fluorophores without emitting a photon", correct: true },
      { id: 'c', label: "The cyan fluorophore emits a photon that the yellow one absorbs" },
      { id: 'd', label: "Chemical bonds form between the two fluorescent labels" }
    ],
    explanation: "FRET occurs through non-radiative energy transfer - the excited donor fluorophore transfers energy directly to the acceptor through electromagnetic dipole-dipole coupling, without emitting a photon. This only works when the fluorophores are very close (1-10 nm) and their spectra overlap. Because FRET efficiency depends strongly on distance (1/r^6), it serves as a 'molecular ruler' to detect when two labeled molecules are in close proximity."
  },
  // 9. Quantum yield (Hard)
  {
    scenario: "A materials scientist compares two fluorescent dyes for a sensor application. Dye A has a quantum yield of 0.95, while Dye B has a quantum yield of 0.15. Both absorb the same wavelength of light.",
    question: "What does quantum yield measure, and why would Dye A be preferred for a brightness-critical application?",
    options: [
      { id: 'a', label: "Quantum yield measures color purity; Dye A produces more saturated colors" },
      { id: 'b', label: "Quantum yield is the ratio of photons emitted to photons absorbed; Dye A converts 95% of absorbed photons to fluorescence", correct: true },
      { id: 'c', label: "Quantum yield measures how fast the dye fluoresces; Dye A glows more quickly" },
      { id: 'd', label: "Quantum yield measures the wavelength shift; Dye A has a larger Stokes shift" }
    ],
    explanation: "Quantum yield (QY) is the ratio of photons emitted to photons absorbed, measuring fluorescence efficiency. A QY of 0.95 means 95% of absorbed photons result in fluorescence emission, while only 5% of energy is lost to non-radiative processes like heat. Dye A would be much brighter than Dye B under identical illumination because it converts nearly all absorbed light to fluorescence rather than wasting it as heat."
  },
  // 10. Photobleaching (Hard)
  {
    scenario: "A microscopist observes a fluorescently-labeled cell over time. After several minutes of continuous UV exposure, the fluorescence signal gradually fades until the cell is barely visible, even though the UV lamp intensity remains constant.",
    question: "What causes this permanent loss of fluorescence, and why is it a concern in fluorescence imaging?",
    options: [
      { id: 'a', label: "The fluorescent molecules migrate out of the illuminated area" },
      { id: 'b', label: "Photobleaching - reactive oxygen species generated during fluorescence irreversibly destroy the fluorophore molecules", correct: true },
      { id: 'c', label: "The UV lamp gradually weakens over time" },
      { id: 'd', label: "The cell membrane blocks UV light increasingly over time" }
    ],
    explanation: "Photobleaching occurs when fluorophores are permanently destroyed through photochemical reactions. Excited fluorophores can react with oxygen to form reactive oxygen species (ROS), which damage the fluorophore's chemical structure, eliminating its ability to fluoresce. This limits how long samples can be observed and how much light can be used for excitation. Researchers minimize photobleaching by using oxygen scavengers, reducing excitation intensity, or choosing more photostable fluorophores."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FluorescenceRenderer: React.FC<Props> = ({ currentPhase, onPhaseComplete }) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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

  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);

  // Play phase simulation state
  const [uvOn, setUvOn] = useState(false);
  const [regularLightOn, setRegularLightOn] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<'highlighter' | 'paper' | 'tonic' | 'mineral'>('highlighter');
  const [animPhase, setAnimPhase] = useState(0);

  // Interactive control state for play phase
  const [excitationWavelength, setExcitationWavelength] = useState(365); // UV default
  const [lightIntensity, setLightIntensity] = useState(70);
  const [fluorophoreConcentration, setFluorophoreConcentration] = useState(50);

  // Twist play phase state
  const [twistMaterial, setTwistMaterial] = useState<'highlighter_yellow' | 'highlighter_pink' | 'highlighter_green' | 'laundry_detergent'>('highlighter_yellow');
  const [selectedFluorophore, setSelectedFluorophore] = useState<keyof typeof FLUOROPHORES>('gfp');
  const [showPhosphorescence, setShowPhosphorescence] = useState(false);
  const [phosphorescenceDecay, setPhosphorescenceDecay] = useState(100);
  const [showJablonskiAnimation, setShowJablonskiAnimation] = useState(true);
  const [jablonskiStep, setJablonskiStep] = useState(0);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Material fluorescence properties
  const getMaterialProps = (mat: string) => {
    const props: Record<string, { fluorescent: boolean; emitColor: string; emitGlow: string; name: string; emissionWavelength: number }> = {
      highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', emissionWavelength: 520 },
      paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper', emissionWavelength: 0 },
      tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)', emissionWavelength: 450 },
      mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral', emissionWavelength: 620 },
      highlighter_yellow: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', emissionWavelength: 520 },
      highlighter_pink: { fluorescent: true, emitColor: '#ff66cc', emitGlow: '#ff00ff', name: 'Pink Highlighter', emissionWavelength: 580 },
      highlighter_green: { fluorescent: true, emitColor: '#00ffaa', emitGlow: '#00ff88', name: 'Green Highlighter', emissionWavelength: 510 },
      laundry_detergent: { fluorescent: true, emitColor: '#6666ff', emitGlow: '#0000ff', name: 'Laundry Detergent', emissionWavelength: 440 }
    };
    return props[mat] || props.highlighter;
  };

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Jablonski diagram animation
  useEffect(() => {
    if (showJablonskiAnimation && uvOn) {
      const interval = setInterval(() => {
        setJablonskiStep(s => (s + 1) % 4);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [showJablonskiAnimation, uvOn]);

  // Phosphorescence decay
  useEffect(() => {
    if (showPhosphorescence && !uvOn && phosphorescenceDecay > 0) {
      const interval = setInterval(() => {
        setPhosphorescenceDecay(d => Math.max(0, d - 2));
      }, 100);
      return () => clearInterval(interval);
    } else if (uvOn) {
      setPhosphorescenceDecay(100);
    }
  }, [showPhosphorescence, uvOn, phosphorescenceDecay]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setUvOn(false);
      setRegularLightOn(true);
      setSelectedMaterial('highlighter');
      setExcitationWavelength(365);
      setLightIntensity(70);
      setFluorophoreConcentration(50);
    }
    if (phase === 'twist_play') {
      setTwistMaterial('highlighter_yellow');
      setSelectedFluorophore('gfp');
      setShowPhosphorescence(false);
      setPhosphorescenceDecay(100);
    }
  }, [phase]);

  // Helper to convert wavelength to color
  const wavelengthToColor = (wavelength: number): string => {
    if (wavelength < 380) return '#8b5cf6'; // UV - violet
    if (wavelength < 450) return '#3b82f6'; // Blue
    if (wavelength < 495) return '#06b6d4'; // Cyan
    if (wavelength < 570) return '#22c55e'; // Green
    if (wavelength < 590) return '#eab308'; // Yellow
    if (wavelength < 620) return '#f97316'; // Orange
    if (wavelength < 700) return '#ef4444'; // Red
    return '#7f1d1d'; // IR - dark red
  };

  // Calculate emission wavelength based on excitation (Stokes shift)
  const calculateStokesShift = (excitation: number, material: string): number => {
    const baseShift = getMaterialProps(material).emissionWavelength - 365; // Base shift from 365nm UV
    return Math.max(excitation + 50 + (baseShift / 3), excitation + 30); // Minimum 30nm Stokes shift
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  // Animated Jablonski Diagram
  const renderJablonskiDiagram = () => {
    const fluorophore = FLUOROPHORES[selectedFluorophore];
    const excitationColor = wavelengthToColor(excitationWavelength);
    const emissionColor = fluorophore.color;

    return (
      <div className="relative">
        <svg viewBox="0 0 300 180" className="w-full h-40">
          <defs>
            {/* Background gradient */}
            <linearGradient id="fluorJabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ground state gradient */}
            <linearGradient id="fluorS0Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Excited state gradient */}
            <linearGradient id="fluorS1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="30%" stopColor="#818cf8" />
              <stop offset="70%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            {/* Triplet state gradient */}
            <linearGradient id="fluorT1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Absorption arrow gradient */}
            <linearGradient id="fluorAbsorbGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={excitationColor} stopOpacity="0.6" />
              <stop offset="50%" stopColor={excitationColor} />
              <stop offset="100%" stopColor="#e9d5ff" />
            </linearGradient>

            {/* Emission arrow gradient */}
            <linearGradient id="fluorEmitArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor={emissionColor} />
              <stop offset="100%" stopColor={emissionColor} stopOpacity="0.6" />
            </linearGradient>

            {/* Markers */}
            <marker id="fluorArrowUp" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <path d="M0,10 L5,0 L10,10" fill="none" stroke="url(#fluorAbsorbGrad)" strokeWidth="2" />
            </marker>
            <marker id="fluorArrowDown" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <path d="M0,0 L5,10 L10,0" fill="none" stroke={emissionColor} strokeWidth="2" />
            </marker>

            {/* Glow filters */}
            <filter id="fluorJabGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fluorEnergyLevelGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="2" result="levelBlur" />
              <feMerge>
                <feMergeNode in="levelBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="300" height="180" fill="url(#fluorJabBg)" rx="8" />

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {[...Array(10)].map((_, i) => (
              <line key={`v${i}`} x1={30 * i} y1="0" x2={30 * i} y2="180" stroke="#6366f1" strokeWidth="0.5" />
            ))}
            {[...Array(6)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={30 * i} x2="300" y2={30 * i} stroke="#6366f1" strokeWidth="0.5" />
            ))}
          </g>

          {/* Energy axis */}
          <line x1="20" y1="25" x2="20" y2="155" stroke="#475569" strokeWidth="1.5" />
          <polygon points="20,20 16,30 24,30" fill="#475569" />

          {/* Ground state S0 */}
          <rect x="40" y="145" width="90" height="10" fill="url(#fluorS0Grad)" rx="3" filter="url(#fluorEnergyLevelGlow)" />
          {/* Vibrational levels in ground state */}
          <rect x="45" y="135" width="80" height="3" fill="#4b5563" rx="1" opacity="0.5" />

          {/* Excited vibrational levels S1 */}
          <rect x="40" y="72" width="90" height="5" fill="url(#fluorS1Grad)" rx="2" filter="url(#fluorEnergyLevelGlow)" />
          <rect x="40" y="62" width="90" height="4" fill="#818cf8" rx="1" opacity="0.7" />
          <rect x="40" y="53" width="90" height="4" fill="#a5b4fc" rx="1" opacity="0.5" />
          <rect x="40" y="45" width="90" height="3" fill="#c7d2fe" rx="1" opacity="0.3" />

          {/* Triplet state (for phosphorescence) */}
          {showPhosphorescence && (
            <g>
              <rect x="170" y="95" width="90" height="6" fill="url(#fluorT1Grad)" rx="2" filter="url(#fluorEnergyLevelGlow)" />
              <rect x="175" y="87" width="80" height="3" fill="#a78bfa" rx="1" opacity="0.5" />
            </g>
          )}

          {/* Absorption arrow */}
          {uvOn && (jablonskiStep === 0 || jablonskiStep === 1) && (
            <g filter="url(#fluorJabGlow)">
              <line
                x1="60"
                y1="140"
                x2="60"
                y2="52"
                stroke="url(#fluorAbsorbGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity={jablonskiStep === 0 ? 1 : 0.5}
              />
              <polygon points="60,48 55,58 65,58" fill={excitationColor} />
              {/* Photon wave symbols */}
              <path d="M 48 100 Q 52 95 48 90 Q 44 85 48 80" stroke={excitationColor} strokeWidth="1.5" fill="none" opacity="0.7" />
            </g>
          )}

          {/* Vibrational relaxation (heat loss) */}
          {uvOn && jablonskiStep === 1 && (
            <g>
              <path
                d="M 90 50 Q 100 55 95 62 Q 90 69 95 75"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeDasharray="5,3"
                strokeLinecap="round"
              />
              {/* Heat wave symbols */}
              <path d="M 100 58 Q 106 55 104 62" stroke="#fcd34d" strokeWidth="1.5" fill="none" />
              <path d="M 103 65 Q 109 62 107 69" stroke="#fcd34d" strokeWidth="1.5" fill="none" />
            </g>
          )}

          {/* Emission arrow (fluorescence) */}
          {uvOn && (jablonskiStep === 2 || jablonskiStep === 3) && !showPhosphorescence && (
            <g filter="url(#fluorJabGlow)">
              <line
                x1="110"
                y1="77"
                x2="110"
                y2="138"
                stroke="url(#fluorEmitArrowGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity={jablonskiStep === 2 ? 1 : 0.5}
              />
              <polygon points="110,142 105,132 115,132" fill={emissionColor} />
              {/* Emission photon wave */}
              <path d="M 122 110 Q 126 105 122 100 Q 118 95 122 90" stroke={emissionColor} strokeWidth="1.5" fill="none" opacity="0.7" />
            </g>
          )}

          {/* ISC and Phosphorescence for triplet state */}
          {uvOn && showPhosphorescence && jablonskiStep >= 1 && (
            <>
              {/* Intersystem crossing */}
              <path
                d="M 130 70 C 145 75, 160 85, 175 95"
                fill="none"
                stroke="#9333ea"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                strokeLinecap="round"
              />
              {/* ISC indicator */}
              <circle cx="150" cy="82" r="3" fill="#9333ea" opacity="0.8" />

              {/* Phosphorescence emission (slower, from T1) */}
              {jablonskiStep >= 2 && (
                <g filter="url(#fluorJabGlow)" opacity={phosphorescenceDecay / 100}>
                  <line
                    x1="220"
                    y1="100"
                    x2="220"
                    y2="140"
                    stroke="#c084fc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <polygon points="220,145 215,135 225,135" fill="#c084fc" />
                  {/* Slow emission wave */}
                  <path d="M 232 120 Q 236 115 232 110" stroke="#c084fc" strokeWidth="1.5" fill="none" opacity="0.6" />
                </g>
              )}
            </>
          )}

          {/* Stokes shift indicator box */}
          <rect x="200" y="148" width="90" height="28" rx="4" fill="#1e293b" opacity="0.8" />
          <rect x="200" y="148" width="90" height="28" rx="4" stroke="#10b981" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>

        {/* Labels moved outside SVG */}
        <div className="absolute top-1 left-8" style={{ fontSize: typo.small }}>
          <span className="text-gray-500">High E</span>
        </div>
        <div className="absolute bottom-10 left-8" style={{ fontSize: typo.small }}>
          <span className="text-gray-500">Low E</span>
        </div>
        <div className="absolute bottom-12 left-14" style={{ fontSize: typo.label }}>
          <span className="text-gray-400">S0 (Ground)</span>
        </div>
        <div className="absolute top-8 left-14" style={{ fontSize: typo.label }}>
          <span className="text-indigo-300">S1 (Excited)</span>
        </div>
        {showPhosphorescence && (
          <div className="absolute top-14 right-8" style={{ fontSize: typo.label }}>
            <span className="text-purple-400">T1 (Triplet)</span>
          </div>
        )}
        {uvOn && (jablonskiStep === 0 || jablonskiStep === 1) && (
          <div className="absolute top-16 left-6" style={{ fontSize: typo.label }}>
            <span className="text-violet-400 font-semibold">Absorb</span>
          </div>
        )}
        {uvOn && jablonskiStep === 1 && (
          <div className="absolute top-12 left-28" style={{ fontSize: typo.label }}>
            <span className="text-yellow-400">Heat</span>
          </div>
        )}
        {uvOn && (jablonskiStep === 2 || jablonskiStep === 3) && !showPhosphorescence && (
          <div className="absolute top-20 left-32" style={{ fontSize: typo.label }}>
            <span style={{ color: emissionColor }} className="font-semibold">Emit</span>
          </div>
        )}
        {uvOn && showPhosphorescence && jablonskiStep >= 1 && (
          <div className="absolute top-12 left-1/2" style={{ fontSize: typo.label }}>
            <span className="text-purple-400">ISC</span>
          </div>
        )}
        {uvOn && showPhosphorescence && jablonskiStep >= 2 && (
          <div className="absolute top-24 right-12" style={{ fontSize: typo.label, opacity: phosphorescenceDecay / 100 }}>
            <span className="text-purple-300">Phos.</span>
          </div>
        )}
        <div className="absolute bottom-1 right-4" style={{ fontSize: typo.small }}>
          <span className="text-gray-400">Stokes Shift: </span>
          <span className="text-emerald-400 font-bold">{fluorophore.emission - fluorophore.excitation}nm</span>
        </div>
      </div>
    );
  };

  // Emission spectrum visualization
  const renderEmissionSpectrum = () => {
    const matProps = getMaterialProps(selectedMaterial);
    const emissionWl = calculateStokesShift(excitationWavelength, selectedMaterial);
    const intensityFactor = (lightIntensity / 100) * (fluorophoreConcentration / 100);

    return (
      <div className="relative">
        <svg viewBox="0 0 300 100" className="w-full h-24">
          <defs>
            {/* Premium spectrum gradient with more color stops */}
            <linearGradient id="fluorSpectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="12%" stopColor="#8b5cf6" />
              <stop offset="22%" stopColor="#3b82f6" />
              <stop offset="32%" stopColor="#0ea5e9" />
              <stop offset="42%" stopColor="#06b6d4" />
              <stop offset="52%" stopColor="#10b981" />
              <stop offset="62%" stopColor="#22c55e" />
              <stop offset="72%" stopColor="#84cc16" />
              <stop offset="80%" stopColor="#eab308" />
              <stop offset="88%" stopColor="#f97316" />
              <stop offset="95%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="fluorSpecBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Excitation peak gradient */}
            <linearGradient id="fluorExcitePeakGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={wavelengthToColor(excitationWavelength)} stopOpacity="0.3" />
              <stop offset="50%" stopColor={wavelengthToColor(excitationWavelength)} stopOpacity="0.7" />
              <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0.9" />
            </linearGradient>

            {/* Emission peak gradient */}
            <linearGradient id="fluorEmitPeakGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={matProps.emitColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor={matProps.emitColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>

            {/* Peak glow filter */}
            <filter id="fluorPeakGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="peakBlur" />
              <feMerge>
                <feMergeNode in="peakBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stokes shift arrow marker */}
            <marker id="fluorStokesArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L0,8 L8,4 z" fill="#10b981" />
            </marker>
          </defs>

          {/* Background */}
          <rect width="300" height="100" fill="url(#fluorSpecBg)" rx="8" />

          {/* Grid lines */}
          <g opacity="0.15">
            {[...Array(5)].map((_, i) => (
              <line key={i} x1={60 * i + 20} y1="15" x2={60 * i + 20} y2="70" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2,3" />
            ))}
          </g>

          {/* Spectrum bar with enhanced styling */}
          <rect x="20" y="70" width="260" height="18" fill="url(#fluorSpectrumGrad)" rx="4" />
          <rect x="20" y="70" width="260" height="18" rx="4" stroke="#ffffff" strokeWidth="0.5" fill="none" opacity="0.2" />

          {/* UV region indicator */}
          <rect x="8" y="70" width="14" height="18" fill="#581c87" rx="2" opacity="0.6" />

          {/* Excitation peak */}
          {uvOn && (
            <g transform={`translate(${20 + ((excitationWavelength - 300) / 500) * 260}, 0)`} filter="url(#fluorPeakGlow)">
              {/* Peak curve */}
              <path
                d={`M -15 68 Q 0 ${35} 15 68`}
                fill="url(#fluorExcitePeakGrad)"
                opacity="0.8"
              />
              {/* Peak line */}
              <line x1="0" y1="20" x2="0" y2="68" stroke={wavelengthToColor(excitationWavelength)} strokeWidth="3" strokeLinecap="round" />
              {/* Peak dot */}
              <circle cx="0" cy="20" r="4" fill={wavelengthToColor(excitationWavelength)} />
              <circle cx="0" cy="20" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          )}

          {/* Emission peak */}
          {uvOn && matProps.fluorescent && (
            <g transform={`translate(${20 + ((emissionWl - 300) / 500) * 260}, 0)`} filter="url(#fluorPeakGlow)">
              {/* Emission curve - wider base for higher intensity */}
              <path
                d={`M ${-25 * intensityFactor - 10} 68 Q 0 ${30 - 15 * intensityFactor} ${25 * intensityFactor + 10} 68`}
                fill="url(#fluorEmitPeakGrad)"
                opacity={0.7 * intensityFactor + 0.3}
              />
              {/* Peak line */}
              <line x1="0" y1="20" x2="0" y2="68" stroke={matProps.emitColor} strokeWidth="3.5" strokeLinecap="round" />
              {/* Peak dot with glow */}
              <circle cx="0" cy="20" r="5" fill={matProps.emitGlow} />
              <circle cx="0" cy="20" r="2.5" fill="#ffffff" opacity="0.8" />
            </g>
          )}

          {/* Stokes shift arrow */}
          {uvOn && matProps.fluorescent && (
            <g>
              <line
                x1={20 + ((excitationWavelength - 300) / 500) * 260 + 8}
                y1="50"
                x2={20 + ((emissionWl - 300) / 500) * 260 - 8}
                y2="50"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,2"
                markerEnd="url(#fluorStokesArrow)"
              />
              {/* Shift distance indicator */}
              <rect
                x={(20 + ((excitationWavelength - 300) / 500) * 260 + 20 + ((emissionWl - 300) / 500) * 260) / 2 - 25}
                y="40"
                width="50"
                height="16"
                rx="3"
                fill="#064e3b"
                opacity="0.8"
              />
            </g>
          )}
        </svg>

        {/* Labels outside SVG */}
        <div className="absolute bottom-1 left-5" style={{ fontSize: typo.label }}>
          <span className="text-gray-500">380nm</span>
        </div>
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2" style={{ fontSize: typo.label }}>
          <span className="text-gray-500">550nm</span>
        </div>
        <div className="absolute bottom-1 right-3" style={{ fontSize: typo.label }}>
          <span className="text-gray-500">700nm</span>
        </div>
        {uvOn && (
          <div className="absolute top-0 text-center" style={{ left: `${7 + ((excitationWavelength - 300) / 500) * 87}%`, fontSize: typo.label }}>
            <span className="text-violet-400 font-bold">Excitation</span>
            <br />
            <span className="text-violet-300">{excitationWavelength}nm</span>
          </div>
        )}
        {uvOn && matProps.fluorescent && (
          <div className="absolute top-0 text-center" style={{ left: `${7 + ((emissionWl - 300) / 500) * 87}%`, fontSize: typo.label }}>
            <span style={{ color: matProps.emitColor }} className="font-bold">Emission</span>
            <br />
            <span style={{ color: matProps.emitColor }}>{Math.round(emissionWl)}nm</span>
          </div>
        )}
        {uvOn && matProps.fluorescent && (
          <div className="absolute text-center" style={{
            left: `${7 + ((excitationWavelength - 300) / 500) * 87 / 2 + ((emissionWl - 300) / 500) * 87 / 2 + 3.5}%`,
            top: '38%',
            fontSize: typo.label
          }}>
            <span className="text-emerald-400 font-semibold">Stokes Shift</span>
          </div>
        )}
      </div>
    );
  };

  const renderFluorescenceScene = (material: string, uvActive: boolean, regularLight: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;
    const ambientLight = regularLight ? 0.8 : (uvActive ? 0.2 : 0.05);
    const glowIntensity = (lightIntensity / 100) * (fluorophoreConcentration / 100);

    return (
      <div className="relative">
        <svg viewBox="0 0 400 280" className="w-full h-56">
          {/* Premium defs section with comprehensive gradients and filters */}
          <defs>
            {/* Lab background gradient */}
            <linearGradient id="fluorLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={regularLight ? '#1e293b' : '#050510'} />
              <stop offset="30%" stopColor={regularLight ? '#1a2536' : '#0a0a18'} />
              <stop offset="70%" stopColor={regularLight ? '#162032' : '#08081a'} />
              <stop offset="100%" stopColor={regularLight ? '#0f172a' : '#030308'} />
            </linearGradient>

            {/* UV Light housing metal gradient */}
            <linearGradient id="fluorUvHousingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* UV bulb gradient when active */}
            <radialGradient id="fluorUvBulbGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="30%" stopColor="#a78bfa" />
              <stop offset="60%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
            </radialGradient>

            {/* UV beam cone gradient */}
            <linearGradient id="fluorUvBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.7" />
              <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </linearGradient>

            {/* Emission glow radial gradient */}
            <radialGradient id="fluorEmissionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={props.emitGlow} stopOpacity={0.95 * glowIntensity} />
              <stop offset="25%" stopColor={props.emitGlow} stopOpacity={0.7 * glowIntensity} />
              <stop offset="50%" stopColor={props.emitColor} stopOpacity={0.4 * glowIntensity} />
              <stop offset="75%" stopColor={props.emitColor} stopOpacity={0.15 * glowIntensity} />
              <stop offset="100%" stopColor={props.emitColor} stopOpacity="0" />
            </radialGradient>

            {/* Highlighter paper gradient */}
            <linearGradient id="fluorHighlighterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isGlowing ? props.emitColor : '#fef9c3'} />
              <stop offset="30%" stopColor={isGlowing ? props.emitGlow : '#fef08a'} />
              <stop offset="70%" stopColor={isGlowing ? props.emitColor : '#fde047'} />
              <stop offset="100%" stopColor={isGlowing ? props.emitGlow : '#facc15'} />
            </linearGradient>

            {/* Glass bottle gradient for tonic */}
            <linearGradient id="fluorGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="20%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="80%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Liquid gradient for tonic water */}
            <linearGradient id="fluorLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isGlowing ? props.emitColor : '#e0f2fe'} stopOpacity="0.9" />
              <stop offset="50%" stopColor={isGlowing ? props.emitGlow : '#bae6fd'} stopOpacity="0.85" />
              <stop offset="100%" stopColor={isGlowing ? props.emitColor : '#7dd3fc'} stopOpacity="0.8" />
            </linearGradient>

            {/* Crystal/mineral gradient */}
            <linearGradient id="fluorCrystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isGlowing ? props.emitColor : '#a78bfa'} />
              <stop offset="25%" stopColor={isGlowing ? props.emitGlow : '#8b7355'} />
              <stop offset="50%" stopColor={isGlowing ? props.emitColor : '#a0896b'} />
              <stop offset="75%" stopColor={isGlowing ? props.emitGlow : '#8b7355'} />
              <stop offset="100%" stopColor={isGlowing ? props.emitColor : '#7c6945'} />
            </linearGradient>

            {/* Crystal facet highlight */}
            <linearGradient id="fluorCrystalFacet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isGlowing ? '#ffffff' : '#d4c4a8'} stopOpacity="0.8" />
              <stop offset="50%" stopColor={isGlowing ? props.emitGlow : '#b8a688'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={isGlowing ? props.emitColor : '#a0896b'} stopOpacity="0.4" />
            </linearGradient>

            {/* Detergent bottle gradient */}
            <linearGradient id="fluorDetergentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Room light indicator gradient */}
            <radialGradient id="fluorRoomLightGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* Paper texture gradient */}
            <linearGradient id="fluorPaperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#faf5e8" />
              <stop offset="25%" stopColor="#f5f0dc" />
              <stop offset="50%" stopColor="#f0ebd0" />
              <stop offset="75%" stopColor="#ebe6c4" />
              <stop offset="100%" stopColor="#e6e1b8" />
            </linearGradient>

            {/* Premium glow filter */}
            <filter id="fluorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* UV source glow filter */}
            <filter id="fluorUvGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="uvBlur" />
              <feMerge>
                <feMergeNode in="uvBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Emission glow filter */}
            <filter id="fluorEmitGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="emitBlur1" />
              <feGaussianBlur stdDeviation="4" result="emitBlur2" />
              <feMerge>
                <feMergeNode in="emitBlur1" />
                <feMergeNode in="emitBlur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="fluorShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
            </filter>

            {/* Arrow marker */}
            <marker id="fluorArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill={wavelengthToColor(excitationWavelength)} />
            </marker>
          </defs>

          {/* Background - dark room when UV only */}
          <rect width="400" height="280" fill="url(#fluorLabBg)" />

          {/* Subtle ambient glow when room light is on */}
          {regularLight && (
            <ellipse cx="200" cy="140" rx="180" ry="120" fill="#fef3c7" opacity="0.03" />
          )}

          {/* UV Light Source */}
          <g transform="translate(320, 30)">
            {/* Housing body */}
            <rect x="-25" y="0" width="50" height="80" rx="6" fill="url(#fluorUvHousingGrad)" filter="url(#fluorShadow)" />
            {/* Housing details/vents */}
            <rect x="-20" y="10" width="40" height="3" rx="1" fill="#1f2937" opacity="0.5" />
            <rect x="-20" y="18" width="40" height="3" rx="1" fill="#1f2937" opacity="0.5" />
            <rect x="-20" y="26" width="40" height="3" rx="1" fill="#1f2937" opacity="0.5" />

            {/* UV bulb */}
            <rect
              x="-20"
              y="70"
              width="40"
              height="30"
              rx="4"
              fill={uvActive ? 'url(#fluorUvBulbGrad)' : '#374151'}
              filter={uvActive ? 'url(#fluorUvGlow)' : ''}
            />

            {uvActive && (
              <>
                {/* UV beam cone with gradient */}
                <path
                  d="M -20 100 L -70 260 L 70 260 L 20 100 Z"
                  fill="url(#fluorUvBeamGrad)"
                  opacity={0.5 * (lightIntensity / 100)}
                />
                {/* UV rays with animation */}
                {[...Array(Math.ceil(lightIntensity / 15))].map((_, i) => (
                  <line
                    key={i}
                    x1={-18 + i * 6}
                    y1="100"
                    x2={-55 + i * 20}
                    y2="250"
                    stroke={wavelengthToColor(excitationWavelength)}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity={0.25 + Math.sin(animPhase + i * 0.8) * 0.25}
                  />
                ))}
                {/* Central bright beam */}
                <line x1="0" y1="100" x2="0" y2="220" stroke="#c4b5fd" strokeWidth="3" opacity={0.4 * (lightIntensity / 100)} />
              </>
            )}
          </g>

          {/* Material/Object */}
          <g transform="translate(120, 140)">
            {/* Glow effect when fluorescent and UV active */}
            {isGlowing && (
              <>
                {/* Outer glow */}
                <ellipse
                  cx="50"
                  cy="60"
                  rx={90 + Math.sin(animPhase) * 8 * glowIntensity}
                  ry={70 + Math.sin(animPhase) * 8 * glowIntensity}
                  fill="url(#fluorEmissionGlow)"
                  filter="url(#fluorEmitGlow)"
                />
                {/* Inner bright glow */}
                <ellipse
                  cx="50"
                  cy="60"
                  rx={50 + Math.sin(animPhase + 1) * 4 * glowIntensity}
                  ry={35 + Math.sin(animPhase + 1) * 4 * glowIntensity}
                  fill={props.emitGlow}
                  opacity={0.3 * glowIntensity}
                />
              </>
            )}

            {/* Object base */}
            {material.includes('highlighter') && (
              <g filter={isGlowing ? 'url(#fluorGlow)' : 'url(#fluorShadow)'}>
                <rect x="20" y="30" width="60" height="60" rx="5" fill="url(#fluorHighlighterGrad)" opacity={ambientLight} />
                {/* Paper lines */}
                <line x1="28" y1="45" x2="72" y2="45" stroke="#374151" strokeWidth="1" opacity={0.3 * ambientLight} />
                <line x1="28" y1="55" x2="72" y2="55" stroke="#374151" strokeWidth="1" opacity={0.3 * ambientLight} />
                <line x1="28" y1="65" x2="72" y2="65" stroke="#374151" strokeWidth="1" opacity={0.3 * ambientLight} />
                <line x1="28" y1="75" x2="72" y2="75" stroke="#374151" strokeWidth="1" opacity={0.3 * ambientLight} />
              </g>
            )}
            {material === 'paper' && (
              <g filter="url(#fluorShadow)">
                <rect x="10" y="20" width="80" height="80" rx="3" fill="url(#fluorPaperGrad)" opacity={ambientLight} />
                {/* Paper texture lines */}
                {[...Array(6)].map((_, i) => (
                  <line key={i} x1="18" y1={30 + i * 12} x2="82" y2={30 + i * 12} stroke="#d4d4d4" strokeWidth="0.5" opacity={0.4 * ambientLight} />
                ))}
              </g>
            )}
            {material === 'tonic' && (
              <g>
                {/* Glass bottle */}
                <rect x="30" y="10" width="40" height="90" rx="4" fill="url(#fluorGlassGrad)" filter="url(#fluorShadow)" />
                {/* Bottle neck */}
                <rect x="38" y="2" width="24" height="12" rx="2" fill="url(#fluorGlassGrad)" />
                {/* Liquid */}
                <rect
                  x="35"
                  y="25"
                  width="30"
                  height="70"
                  rx="3"
                  fill="url(#fluorLiquidGrad)"
                  filter={isGlowing ? 'url(#fluorGlow)' : ''}
                  opacity={ambientLight}
                />
                {/* Bubbles */}
                {[...Array(7)].map((_, i) => (
                  <circle
                    key={i}
                    cx={40 + (i % 4) * 7}
                    cy={85 - ((animPhase * 12 + i * 12) % 55)}
                    r={1.5 + (i % 2)}
                    fill={isGlowing ? props.emitGlow : '#ffffff'}
                    opacity={0.4 + (i % 3) * 0.2}
                  />
                ))}
                {/* Glass reflection */}
                <rect x="32" y="30" width="3" height="50" rx="1" fill="#ffffff" opacity="0.15" />
              </g>
            )}
            {material === 'mineral' && (
              <g filter={isGlowing ? 'url(#fluorGlow)' : 'url(#fluorShadow)'}>
                {/* Crystal main body */}
                <polygon
                  points="50,5 85,40 75,95 25,95 15,40"
                  fill="url(#fluorCrystalGrad)"
                  opacity={ambientLight}
                />
                {/* Crystal facets */}
                <polygon
                  points="50,5 70,35 50,55 30,35"
                  fill="url(#fluorCrystalFacet)"
                  opacity={ambientLight * 0.9}
                />
                <polygon
                  points="50,55 70,35 75,60 60,75"
                  fill={isGlowing ? props.emitColor : '#9a8a6a'}
                  opacity={ambientLight * 0.7}
                />
                <polygon
                  points="50,55 30,35 25,60 40,75"
                  fill={isGlowing ? props.emitGlow : '#8a7a5a'}
                  opacity={ambientLight * 0.6}
                />
                {/* Crystalline highlights */}
                <line x1="50" y1="5" x2="50" y2="55" stroke="#ffffff" strokeWidth="1" opacity={0.2 * ambientLight} />
                <line x1="30" y1="35" x2="70" y2="35" stroke="#ffffff" strokeWidth="0.5" opacity={0.15 * ambientLight} />
              </g>
            )}
            {material === 'laundry_detergent' && (
              <g filter="url(#fluorShadow)">
                {/* Bottle body */}
                <rect x="25" y="20" width="50" height="70" rx="6" fill="url(#fluorDetergentGrad)" />
                {/* Bottle cap */}
                <rect x="35" y="12" width="30" height="12" rx="3" fill="#1e40af" />
                {/* Label area */}
                <rect
                  x="30"
                  y="35"
                  width="40"
                  height="25"
                  rx="3"
                  fill={isGlowing ? props.emitColor : '#93c5fd'}
                  filter={isGlowing ? 'url(#fluorGlow)' : ''}
                  opacity={ambientLight}
                />
                {/* Label lines */}
                <line x1="35" y1="42" x2="65" y2="42" stroke="#1e40af" strokeWidth="1" opacity="0.5" />
                <line x1="35" y1="48" x2="55" y2="48" stroke="#1e40af" strokeWidth="1" opacity="0.4" />
                <line x1="35" y1="54" x2="60" y2="54" stroke="#1e40af" strokeWidth="1" opacity="0.3" />
              </g>
            )}
          </g>

          {/* Energy level transition visualization */}
          {uvActive && props.fluorescent && (
            <g transform="translate(15, 175)">
              {/* Energy level diagram */}
              <rect x="0" y="0" width="80" height="75" rx="4" fill="#0f172a" opacity="0.8" />

              {/* Ground state */}
              <line x1="10" y1="60" x2="70" y2="60" stroke="#64748b" strokeWidth="2" />

              {/* Excited state */}
              <line x1="10" y1="15" x2="70" y2="15" stroke="#a78bfa" strokeWidth="2" />

              {/* Absorption arrow (up) */}
              <line x1="25" y1="55" x2="25" y2="20" stroke={wavelengthToColor(excitationWavelength)} strokeWidth="2.5" markerEnd="url(#fluorArrow)" />

              {/* Emission arrow (down) */}
              <line x1="55" y1="20" x2="55" y2="55" stroke={props.emitColor} strokeWidth="2.5" />
              <polygon points="55,55 51,48 59,48" fill={props.emitColor} />

              {/* Heat loss wavy line */}
              <path d="M 35 20 Q 40 25 35 30 Q 30 35 35 40" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeDasharray="2,2" opacity={0.7} />
            </g>
          )}

          {/* Light status indicators */}
          <g transform="translate(10, 15)">
            {/* Room light indicator */}
            <circle cx="10" cy="10" r="9" fill={regularLight ? 'url(#fluorRoomLightGrad)' : '#374151'} filter={regularLight ? 'url(#fluorUvGlow)' : ''} />
            <circle cx="10" cy="10" r="5" fill={regularLight ? '#fef9c3' : '#1f2937'} opacity="0.6" />

            {/* UV light indicator */}
            <circle cx="10" cy="38" r="9" fill={uvActive ? 'url(#fluorUvBulbGrad)' : '#374151'} filter={uvActive ? 'url(#fluorUvGlow)' : ''} />
            <circle cx="10" cy="38" r="5" fill={uvActive ? '#e9d5ff' : '#1f2937'} opacity="0.6" />
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <span style={{ fontSize: typo.body }} className="text-gray-300 font-medium">
            {props.name}
          </span>
        </div>
        <div className="absolute top-3 left-8" style={{ fontSize: typo.small }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400">Room Light</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">UV Light ({excitationWavelength}nm)</span>
          </div>
        </div>
      </div>
    );
  };

  // Twist scene with fluorophore comparison and phosphorescence
  const renderTwistScene = () => {
    const currentFluorophore = FLUOROPHORES[selectedFluorophore];
    const decayOpacity = showPhosphorescence && !uvOn ? phosphorescenceDecay / 100 : 1;

    return (
      <div className="relative">
        <svg viewBox="0 0 400 280" className="w-full h-64">
          <defs>
            {/* Dark lab background gradient */}
            <linearGradient id="fluorTwistBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#050510" />
              <stop offset="30%" stopColor="#0a0a1a" />
              <stop offset="70%" stopColor="#0a0818" />
              <stop offset="100%" stopColor="#050508" />
            </linearGradient>

            {/* UV ambient overlay */}
            <radialGradient id="fluorUvAmbient" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#6d28d9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </radialGradient>

            {/* Sample container gradient */}
            <linearGradient id="fluorContainerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#1f2937" />
              <stop offset="75%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Sample liquid gradient when glowing */}
            <radialGradient id="fluorSampleGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={currentFluorophore.color} stopOpacity={0.95 * decayOpacity * (lightIntensity / 100)} />
              <stop offset="40%" stopColor={currentFluorophore.color} stopOpacity={0.7 * decayOpacity * (lightIntensity / 100)} />
              <stop offset="70%" stopColor={currentFluorophore.color} stopOpacity={0.4 * decayOpacity * (lightIntensity / 100)} />
              <stop offset="100%" stopColor={currentFluorophore.color} stopOpacity="0" />
            </radialGradient>

            {/* Info panel gradient */}
            <linearGradient id="fluorInfoPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Mode panel gradients */}
            <linearGradient id="fluorFluorModeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#164e63" />
              <stop offset="50%" stopColor="#0e7490" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#155e75" />
            </linearGradient>

            <linearGradient id="fluorPhosModeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="50%" stopColor="#6d28d9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>

            {/* Decay bar gradient */}
            <linearGradient id="fluorDecayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="fluorTwistGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fluorContainerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            <filter id="fluorInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="innerBlur" />
              <feMerge>
                <feMergeNode in="innerBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="400" height="280" fill="url(#fluorTwistBg)" />

          {/* UV light ambient when on */}
          {uvOn && (
            <rect x="0" y="0" width="400" height="280" fill="url(#fluorUvAmbient)" />
          )}

          {/* Fluorophore sample container */}
          <g transform="translate(40, 35)">
            {/* Container outer */}
            <rect x="0" y="0" width="130" height="160" rx="10" fill="url(#fluorContainerGrad)" filter="url(#fluorContainerShadow)" />
            {/* Container inner edge highlight */}
            <rect x="2" y="2" width="126" height="156" rx="9" stroke="#4b5563" strokeWidth="1" fill="none" opacity="0.5" />

            {/* Sample area background */}
            <rect x="12" y="15" width="106" height="125" rx="6" fill="#111827" />

            {/* Fluorescent sample when glowing */}
            {(uvOn || (showPhosphorescence && phosphorescenceDecay > 0)) && (
              <g>
                {/* Outer glow */}
                <ellipse
                  cx="65"
                  cy="77"
                  rx={60 + Math.sin(animPhase) * 6 * decayOpacity}
                  ry={50 + Math.sin(animPhase) * 6 * decayOpacity}
                  fill="url(#fluorSampleGlow)"
                  filter="url(#fluorTwistGlow)"
                />
                {/* Main sample */}
                <rect
                  x="15"
                  y="20"
                  width="100"
                  height="115"
                  rx="5"
                  fill={currentFluorophore.color}
                  opacity={decayOpacity * (lightIntensity / 100) * 0.9}
                  filter="url(#fluorInnerGlow)"
                />
                {/* Bright center */}
                <ellipse
                  cx="65"
                  cy="77"
                  rx="35"
                  ry="30"
                  fill="#ffffff"
                  opacity={0.2 * decayOpacity * (lightIntensity / 100)}
                />
              </g>
            )}

            {/* Sample when off */}
            {!uvOn && (!showPhosphorescence || phosphorescenceDecay === 0) && (
              <rect x="15" y="20" width="100" height="115" rx="5" fill="#1f2937" />
            )}

            {/* Container label strip */}
            <rect x="0" y="145" width="130" height="15" rx="0" fill="#0f172a" opacity="0.8" />
          </g>

          {/* Info panel */}
          <g transform="translate(200, 35)">
            <rect x="0" y="0" width="180" height="160" rx="10" fill="url(#fluorInfoPanelGrad)" filter="url(#fluorContainerShadow)" />
            <rect x="2" y="2" width="176" height="156" rx="9" stroke="#374151" strokeWidth="1" fill="none" opacity="0.5" />

            {/* Panel header */}
            <rect x="10" y="10" width="160" height="24" rx="5" fill="#0f172a" opacity="0.6" />

            {/* Property rows */}
            <rect x="10" y="42" width="160" height="22" rx="4" fill="#0f172a" opacity="0.3" />
            <rect x="10" y="68" width="160" height="22" rx="4" fill="#0f172a" opacity="0.3" />
            <rect x="10" y="94" width="160" height="22" rx="4" fill="#0f172a" opacity="0.3" />

            {/* Decay indicator for phosphorescence */}
            {showPhosphorescence && (
              <g transform="translate(10, 125)">
                <rect x="0" y="0" width="160" height="25" rx="4" fill="#3b0764" opacity="0.5" />
                {/* Progress bar background */}
                <rect x="60" y="8" width="95" height="10" fill="#1f2937" rx="3" />
                {/* Progress bar fill */}
                <rect x="60" y="8" width={phosphorescenceDecay * 0.95} height="10" fill="url(#fluorDecayGrad)" rx="3" />
                {/* Progress bar shine */}
                <rect x="60" y="8" width={phosphorescenceDecay * 0.95} height="4" fill="#ffffff" opacity="0.15" rx="2" />
              </g>
            )}
          </g>

          {/* Mode comparison panel */}
          <g transform="translate(40, 210)">
            <rect
              x="0"
              y="0"
              width="340"
              height="60"
              rx="10"
              fill={showPhosphorescence ? 'url(#fluorPhosModeGrad)' : 'url(#fluorFluorModeGrad)'}
              filter="url(#fluorContainerShadow)"
            />
            <rect
              x="2"
              y="2"
              width="336"
              height="56"
              rx="9"
              stroke={showPhosphorescence ? '#9333ea' : '#0891b2'}
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />

            {/* Mode indicator dot */}
            <circle cx="20" cy="30" r="6" fill={showPhosphorescence ? '#c084fc' : '#22d3ee'} />
            <circle cx="20" cy="30" r="3" fill="#ffffff" opacity="0.7" />
          </g>
        </svg>

        {/* Labels moved outside SVG */}
        <div className="absolute bottom-28 left-14" style={{ fontSize: typo.small }}>
          <span className="text-gray-300 font-semibold">
            {currentFluorophore.name.split('(')[0]}
          </span>
        </div>

        {/* Info panel labels */}
        <div className="absolute top-12 right-20" style={{ fontSize: typo.body }}>
          <span className="text-white font-bold">Properties</span>
        </div>
        <div className="absolute top-20 right-8" style={{ fontSize: typo.small }}>
          <div className="flex justify-between w-40 mb-1">
            <span className="text-gray-400">Excitation:</span>
            <span className="text-violet-400 font-semibold">{currentFluorophore.excitation}nm</span>
          </div>
          <div className="flex justify-between w-40 mb-1">
            <span className="text-gray-400">Emission:</span>
            <span style={{ color: currentFluorophore.color }} className="font-semibold">{currentFluorophore.emission}nm</span>
          </div>
          <div className="flex justify-between w-40 mb-1">
            <span className="text-gray-400">Stokes Shift:</span>
            <span className="text-emerald-400 font-semibold">{currentFluorophore.emission - currentFluorophore.excitation}nm</span>
          </div>
          <div className="mt-2 text-gray-500" style={{ fontSize: typo.label, maxWidth: '160px' }}>
            {currentFluorophore.description}
          </div>
        </div>

        {showPhosphorescence && (
          <div className="absolute bottom-28 right-16" style={{ fontSize: typo.small }}>
            <span className="text-purple-400">Decay: {phosphorescenceDecay}%</span>
          </div>
        )}

        {/* Mode panel labels */}
        <div className="absolute bottom-8 left-20" style={{ fontSize: typo.body }}>
          <span className="text-white font-bold">
            {showPhosphorescence ? 'Phosphorescence Mode' : 'Fluorescence Mode'}
          </span>
        </div>
        <div className="absolute bottom-3 left-20" style={{ fontSize: typo.small }}>
          <span className="text-gray-400">
            {showPhosphorescence
              ? 'Triplet state - slow decay (ms to hours)'
              : 'Singlet state - instant emission (ns)'}
          </span>
        </div>
        <div className="absolute bottom-3 right-16" style={{ fontSize: typo.label }}>
          <span className={showPhosphorescence ? 'text-purple-400' : 'text-cyan-400'}>
            {showPhosphorescence
              ? 'Turn off UV to see glow-in-dark effect'
              : 'Emission stops instantly when UV stops'}
          </span>
        </div>
      </div>
    );
  };

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    playSound(pred === 'absorb' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    playSound(pred === 'different' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const currentQuestion = testAnswers.length;
    const isCorrect = TEST_QUESTIONS[currentQuestion].options[answerIndex]?.correct;
    playSound(isCorrect ? 'success' : 'failure');
    setTestAnswers([...testAnswers, answerIndex]);
  }, [testAnswers, playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-violet-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
        The Glowing Highlighter Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how invisible light creates visible glow
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🖍️🔦</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You&apos;ve seen highlighters glow bright under a blacklight at parties.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But here&apos;s the mystery: <span className="text-fuchsia-400 font-semibold">UV light is invisible</span>, yet the highlighter
              glows <span className="text-green-400 font-semibold">visible green</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-violet-400 font-semibold">
                How does invisible light create visible glow?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You shine an invisible UV light on a yellow highlighter. What will happen?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'reflect', text: 'The UV bounces back as UV (still invisible)', icon: '↩️' },
          { id: 'absorb', text: 'The highlighter absorbs UV and re-emits VISIBLE light', icon: '*' },
          { id: 'nothing', text: 'Nothing - UV passes right through transparent ink', icon: '->' },
          { id: 'heat', text: 'The highlighter heats up but doesn\'t glow', icon: '~' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { handlePrediction(option.id); }}
            style={{ zIndex: 10 }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? option.id === 'absorb' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : prediction !== null && option.id === 'absorb'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'absorb' ? 'Correct!' : 'Not quite.'} Fluorescent molecules absorb UV and re-emit visible light!
          </p>
          <button
            onClick={() => { playSound('click'); goToNextPhase(); }}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl"
          >
            Test It! -&gt;
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Experiment: UV Fluorescence</h2>

      {/* Main visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderFluorescenceScene(selectedMaterial, uvOn, regularLightOn)}
      </div>

      {/* Jablonski Diagram */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-violet-300">Animated Jablonski Diagram</h3>
          <button
            onClick={() => setShowJablonskiAnimation(!showJablonskiAnimation)}
            style={{ zIndex: 10 }}
            className={`text-xs px-3 py-1 rounded-full ${showJablonskiAnimation ? 'bg-violet-600' : 'bg-gray-700'} text-white`}
          >
            {showJablonskiAnimation ? 'ON' : 'OFF'}
          </button>
        </div>
        {renderJablonskiDiagram()}
      </div>

      {/* Emission Spectrum */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        <h3 className="text-sm font-semibold text-violet-300 mb-2">Emission Spectrum & Stokes Shift</h3>
        {renderEmissionSpectrum()}
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-4">
          {/* Excitation Wavelength Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Excitation Wavelength: {excitationWavelength}nm</label>
            <input
              type="range"
              min="300"
              max="500"
              value={excitationWavelength}
              onChange={(e) => setExcitationWavelength(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: wavelengthToColor(excitationWavelength) }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>UV (300nm)</span>
              <span>Visible (500nm)</span>
            </div>
          </div>

          {/* Light Intensity Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Light Intensity: {lightIntensity}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-yellow-400 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Dim</span>
              <span>Bright</span>
            </div>
          </div>

          {/* Fluorophore Concentration Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Fluorophore Concentration: {fluorophoreConcentration}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={fluorophoreConcentration}
              onChange={(e) => setFluorophoreConcentration(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-green-400 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-gray-400 text-sm">Material:</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value as typeof selectedMaterial)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="highlighter">Yellow Highlighter</option>
            <option value="paper">Plain Paper</option>
            <option value="tonic">Tonic Water</option>
            <option value="mineral">Fluorite Crystal</option>
          </select>

          <button
            onClick={() => { playSound('click'); setRegularLightOn(!regularLightOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              regularLightOn
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Room Light: {regularLightOn ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => { playSound('click'); setUvOn(!uvOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {uvOn && getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-fuchsia-300 text-sm">
            <strong>Fluorescence!</strong> UV photons ({excitationWavelength}nm, high energy) are absorbed.
            The molecule re-emits light at a <em>longer wavelength</em> ({getMaterialProps(selectedMaterial).emissionWavelength}nm) - visible!
          </p>
          <p className="text-emerald-400 text-xs mt-2">
            Stokes Shift: {getMaterialProps(selectedMaterial).emissionWavelength - excitationWavelength}nm (energy lost as heat)
          </p>
        </div>
      )}

      {uvOn && !getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gray-800/50 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-gray-400 text-sm">
            <strong>No fluorescence.</strong> This material lacks the special molecules
            that can absorb UV and re-emit visible light.
          </p>
        </div>
      )}

      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        Continue -&gt;
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">What&apos;s Really Happening</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">UV Absorption</h3>
              <p className="text-gray-400 text-sm">High-energy UV photon excites electron to higher state</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Energy Loss</h3>
              <p className="text-gray-400 text-sm">Some energy lost as heat (vibrational relaxation)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Visible Emission</h3>
              <p className="text-gray-400 text-sm">Lower-energy photon emitted - longer wavelength = visible!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-violet-900/30 rounded-xl p-4 max-w-lg w-full mb-6 text-center">
        <p className="text-violet-300 font-semibold">Stokes Shift</p>
        <p className="text-gray-400 text-sm mt-1">
          The wavelength difference between absorbed (UV ~365nm) and emitted (green ~520nm) light.
          Named after physicist George Stokes.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-violet-400 font-semibold">{prediction === 'absorb' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          But wait... -&gt;
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">~ The Twist!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          Different highlighter colors (yellow, pink, green) all absorb the <span className="text-violet-400">same UV light</span>.
          What color will they each glow?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'same', text: 'They all glow the same color (UV is UV)', icon: 'O' },
          { id: 'different', text: 'They each glow their own DIFFERENT visible color', icon: '~' },
          { id: 'white', text: 'They all glow white when fluorescent', icon: '[]' },
          { id: 'none', text: 'Only yellow highlighters can fluoresce', icon: '*' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { handleTwistPrediction(option.id); }}
            style={{ zIndex: 10 }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? option.id === 'different' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : twistPrediction !== null && option.id === 'different'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'different' ? 'Correct!' : 'Not quite.'} Each molecule has its own energy levels!
          </p>
          <button
            onClick={() => { playSound('click'); goToNextPhase(); }}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test It! -&gt;
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Advanced Fluorescence Lab</h2>

      {/* Main visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderTwistScene()}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-3">
          {/* Fluorophore Selection */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Fluorophore Type:</label>
            <select
              value={selectedFluorophore}
              onChange={(e) => setSelectedFluorophore(e.target.value as keyof typeof FLUOROPHORES)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
            >
              {Object.entries(FLUOROPHORES).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>

          {/* Intensity slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Excitation Intensity: {lightIntensity}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-violet-400 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-3">
          {/* UV Toggle */}
          <button
            onClick={() => { playSound('click'); setUvOn(!uvOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>

          {/* Phosphorescence Toggle */}
          <button
            onClick={() => { playSound('click'); setShowPhosphorescence(!showPhosphorescence); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
              showPhosphorescence
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Phosphorescence Mode: {showPhosphorescence ? 'ON' : 'OFF'}
          </button>

          {/* Reset decay button */}
          {showPhosphorescence && (
            <button
              onClick={() => { setPhosphorescenceDecay(100); setUvOn(false); }}
              style={{ zIndex: 10 }}
              className="w-full px-4 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Test Glow-in-Dark Effect
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-4">
        <div className="bg-cyan-900/30 rounded-xl p-3 border border-cyan-500/30">
          <p className="text-cyan-300 text-xs font-semibold">Fluorescence</p>
          <p className="text-gray-400 text-xs mt-1">Instant emission (~ns)</p>
          <p className="text-gray-500 text-xs">Singlet to singlet transition</p>
        </div>
        <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-500/30">
          <p className="text-purple-300 text-xs font-semibold">Phosphorescence</p>
          <p className="text-gray-400 text-xs mt-1">Delayed emission (ms-hrs)</p>
          <p className="text-gray-500 text-xs">Triplet to singlet (forbidden)</p>
        </div>
      </div>

      {/* Fluorophore comparison info */}
      <div className="bg-gradient-to-r from-fuchsia-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
        <p className="text-fuchsia-300 text-sm text-center">
          <strong>Different fluorophores = Different emission colors!</strong><br />
          Each molecule has unique energy levels determining its Stokes shift.
        </p>
        <div className="flex justify-center gap-4 mt-3">
          {Object.entries(FLUOROPHORES).slice(0, 4).map(([key, val]) => (
            <div key={key} className="text-center">
              <div
                className="w-4 h-4 rounded-full mx-auto mb-1"
                style={{ backgroundColor: val.color }}
              />
              <p className="text-gray-400 text-xs">{val.emission}nm</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
      >
        Continue -&gt;
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">The Molecular Fingerprint</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <p className="text-gray-300 text-center mb-4">
          Each fluorescent molecule has <span className="text-fuchsia-400 font-semibold">unique energy levels</span>.
          The Stokes shift varies by molecule!
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-green-400 font-semibold">GFP</div>
            <div className="text-gray-500">Emits 509nm (green)</div>
            <div className="text-gray-600 text-xs">Stokes: 114nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Rhodamine B</div>
            <div className="text-gray-500">Emits 565nm (red)</div>
            <div className="text-gray-600 text-xs">Stokes: 22nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">DAPI</div>
            <div className="text-gray-500">Emits 461nm (blue)</div>
            <div className="text-gray-600 text-xs">Stokes: 103nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-semibold">Quantum Dots</div>
            <div className="text-gray-500">Tunable emission</div>
            <div className="text-gray-600 text-xs">Size-dependent!</div>
          </div>
        </div>
      </div>

      <div className="bg-purple-900/30 rounded-xl p-4 max-w-lg w-full mb-6">
        <p className="text-purple-300 font-semibold text-center mb-2">Fluorescence vs Phosphorescence</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-cyan-400">Fluorescence</p>
            <ul className="text-gray-400 text-xs list-disc pl-4">
              <li>Nanosecond lifetime</li>
              <li>Spin-allowed transition</li>
              <li>Stops immediately</li>
            </ul>
          </div>
          <div>
            <p className="text-purple-400">Phosphorescence</p>
            <ul className="text-gray-400 text-xs list-disc pl-4">
              <li>Milliseconds to hours</li>
              <li>Spin-forbidden (triplet)</li>
              <li>Glow-in-dark effect</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-fuchsia-400 font-semibold">{twistPrediction === 'different' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
        >
          See Applications -&gt;
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-gray-400 mb-4">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => { handleAppComplete(index); }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-violet-500 bg-violet-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-violet-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Take the Quiz -&gt;
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question || showTestResults) {
      const score = calculateScore();
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= 3 ? '+' : '#'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-300 mb-6">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onClick={() => {
              if (score >= 3) {
                playSound('complete');
                goToNextPhase();
              } else {
                setTestAnswers([]);
                setShowTestResults(false);
                goToPhase('review');
              }
            }}
            style={{ zIndex: 10 }}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            {score >= 3 ? 'Complete! +' : 'Review & Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mb-6">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => { handleTestAnswer(i); }}
              style={{ zIndex: 10 }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-violet-500 transition-all text-left text-gray-200"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-violet-900/50 via-fuchsia-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">+</div>
        <h1 className="text-3xl font-bold text-white mb-4">Fluorescence Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of fluorescence!</p>
        <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-xl p-6 mb-6">
          <p className="text-violet-300 font-medium mb-4">You now understand:</p>
          <ul className="text-gray-300 text-sm space-y-2 text-left">
            <li>- UV absorption by fluorescent molecules</li>
            <li>- Re-emission at longer wavelength (Stokes shift)</li>
            <li>- Different molecules = different emission colors</li>
            <li>- Fluorescence vs phosphorescence (lifetime difference)</li>
            <li>- Real-world applications from security to forensics</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Next time you see a blacklight party, you&apos;ll know the physics of that glow!
        </p>
        <button
          onClick={() => { playSound('click'); goToPhase('hook'); }}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ~ Explore Again
        </button>
      </div>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Fluorescence</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onClick={() => { playSound('click'); goToPhase(p); }}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-violet-400 w-6 shadow-lg shadow-violet-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-violet-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default FluorescenceRenderer;
