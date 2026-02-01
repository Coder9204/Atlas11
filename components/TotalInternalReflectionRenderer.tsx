'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// TOTAL INTERNAL REFLECTION RENDERER - LIGHT TRAPPED IN WATER
// =============================================================================
// Premium educational game demonstrating total internal reflection through
// the classic "light in a water stream" experiment. Students discover how
// light can be trapped and guided through curved paths.
// =============================================================================

// String phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook', 'predict': 'Predict', 'play': 'Lab', 'review': 'Review', 'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab', 'twist_review': 'Twist Review', 'transfer': 'Transfer', 'test': 'Test', 'mastery': 'Mastery'
};

// Premium Design System
const defined = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
    },
    water: {
      stream: 'rgba(56, 189, 248, 0.6)',
      glow: 'rgba(56, 189, 248, 0.3)',
    },
    light: {
      beam: '#22D3EE',
      glow: 'rgba(34, 211, 238, 0.5)',
      trapped: '#F472B6',
    },
    fiber: {
      core: 'rgba(168, 85, 247, 0.8)',
      cladding: 'rgba(100, 116, 139, 0.4)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
};

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================
const MATERIALS: Record<string, { name: string; n: number; criticalAngle: number; color: string }> = {
  water: { name: 'Water', n: 1.333, criticalAngle: 48.6, color: 'rgba(56, 189, 248, 0.5)' },
  glass: { name: 'Glass', n: 1.52, criticalAngle: 41.1, color: 'rgba(148, 163, 184, 0.4)' },
  acrylic: { name: 'Acrylic', n: 1.49, criticalAngle: 42.2, color: 'rgba(167, 139, 250, 0.3)' },
  diamond: { name: 'Diamond', n: 2.42, criticalAngle: 24.4, color: 'rgba(255, 255, 255, 0.4)' },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
interface QuestionOption {
  text: string;
  correct: boolean;
}

interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
  explanation: string;
}

interface Application {
  id: number;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

interface TotalInternalReflectionRendererProps {
  gamePhase?: string;
}

// =============================================================================
// QUESTIONS DATA
// =============================================================================
const questions: Question[] = [
  {
    id: 1,
    question: 'What causes total internal reflection?',
    options: [
      { text: 'Light bouncing off a mirror', correct: false },
      { text: 'Light hitting a surface above the critical angle from inside a dense medium', correct: true },
      { text: 'Light slowing down in water', correct: false },
      { text: 'Light being absorbed by the material', correct: false },
    ],
    explanation:
      'TIR occurs when light traveling in a denser medium hits the boundary at an angle greater than the critical angle. The light cannot escape and reflects back completely.',
  },
  {
    id: 2,
    question: "What is the critical angle for water (n=1.33) to air?",
    options: [
      { text: '24.4°', correct: false },
      { text: '41.8°', correct: false },
      { text: '48.6°', correct: true },
      { text: '90°', correct: false },
    ],
    explanation:
      'The critical angle is calculated as arcsin(n_air/n_water) = arcsin(1/1.33) ≈ 48.6°. Above this angle, light cannot escape water into air.',
  },
  {
    id: 3,
    question: 'Why does diamond have such a small critical angle (24.4°)?',
    options: [
      { text: 'Diamond is very hard', correct: false },
      { text: 'Diamond has a very high refractive index (2.42)', correct: true },
      { text: 'Diamond is transparent', correct: false },
      { text: 'Diamond reflects all colors', correct: false },
    ],
    explanation:
      "Diamond's high refractive index means light slows dramatically inside it. The critical angle is arcsin(1/2.42) ≈ 24.4°, so light easily gets trapped and bounces inside.",
  },
  {
    id: 4,
    question: 'How do fiber optic cables carry light thousands of kilometers?',
    options: [
      { text: 'The light is amplified at each end', correct: false },
      { text: 'Light bounces via total internal reflection along the fiber', correct: true },
      { text: 'The fiber glows on its own', correct: false },
      { text: 'Electric current carries the signal', correct: false },
    ],
    explanation:
      'Fiber optic cables use TIR to trap light inside the glass core. Light bounces at shallow angles along the fiber with minimal loss, traveling huge distances.',
  },
  {
    id: 5,
    question: 'In the "light fountain" demonstration, what happens to the light?',
    options: [
      { text: 'Light is absorbed by water', correct: false },
      { text: 'Light follows the curved water stream via repeated TIR', correct: true },
      { text: 'Light travels straight and exits', correct: false },
      { text: 'Light disperses into a rainbow', correct: false },
    ],
    explanation:
      'As the water stream curves, light inside keeps hitting the water-air boundary above the critical angle. It reflects repeatedly, following the stream\'s curved path.',
  },
  {
    id: 6,
    question: 'What percentage of light is reflected during total internal reflection?',
    options: [
      { text: '50%', correct: false },
      { text: '75%', correct: false },
      { text: '90%', correct: false },
      { text: '100%', correct: true },
    ],
    explanation:
      'During TIR, 100% of the light is reflected - no light escapes. This makes TIR much more efficient than regular mirrors, which absorb some light.',
  },
  {
    id: 7,
    question: 'Binocular prisms use TIR instead of mirrors. Why?',
    options: [
      { text: 'Prisms are cheaper', correct: false },
      { text: 'TIR provides 100% reflection without the absorption losses of mirrors', correct: true },
      { text: 'Prisms are easier to clean', correct: false },
      { text: 'Mirrors are too heavy', correct: false },
    ],
    explanation:
      'Regular mirrors absorb some light at each reflection. TIR reflects 100%, so prism binoculars deliver brighter images, especially important in low light.',
  },
  {
    id: 8,
    question: 'For TIR to occur, light must travel from:',
    options: [
      { text: 'Air to water', correct: false },
      { text: 'Less dense to more dense medium', correct: false },
      { text: 'More dense to less dense medium', correct: true },
      { text: 'Any direction works', correct: false },
    ],
    explanation:
      'TIR only occurs when light goes from a denser medium (higher n) to a less dense medium (lower n). Going the other way, light simply refracts.',
  },
  {
    id: 9,
    question: 'What happens at exactly the critical angle?',
    options: [
      { text: 'Light reflects back completely', correct: false },
      { text: 'Light refracts at exactly 90° (parallel to surface)', correct: true },
      { text: 'Light splits into two beams', correct: false },
      { text: 'Light is absorbed', correct: false },
    ],
    explanation:
      'At exactly the critical angle, the refracted ray travels along the surface (90° from normal). Any steeper angle results in total internal reflection.',
  },
  {
    id: 10,
    question: 'Medical endoscopes use fiber optics for internal body imaging. What advantage does TIR provide?',
    options: [
      { text: 'It sterilizes the equipment', correct: false },
      { text: 'Light travels through thin, flexible fibers that can navigate body passages', correct: true },
      { text: 'It magnifies the image', correct: false },
      { text: 'It changes the light color for better visibility', correct: false },
    ],
    explanation:
      'TIR allows light to travel through thin, bendable glass fibers that can navigate curves in the body. Doctors can see inside without large incisions.',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'Fiber Optic Internet',
    description: 'Light-speed data transmission',
    icon: '🌐',
    details: [
      'Light bounces along glass fibers via TIR at near light-speed',
      'Single fiber carries terabits of data per second',
      'Undersea cables connect continents with 99% of internet traffic',
      'Signal loss is so low that repeaters are only needed every 100km',
    ],
  },
  {
    id: 2,
    title: 'Diamond Brilliance',
    description: 'Why diamonds sparkle',
    icon: '💎',
    details: [
      "Diamond's small critical angle (24.4°) traps light easily",
      'Brilliant cut maximizes internal reflections before light exits top',
      'Light bounces multiple times, creating intense sparkle',
      'Fake diamonds with lower n let more light escape through the bottom',
    ],
  },
  {
    id: 3,
    title: 'Prism Binoculars',
    description: 'Superior reflection for bright images',
    icon: '🔭',
    details: [
      'Porro prisms use TIR to flip and redirect the image',
      'No metal mirror coating needed - pure glass reflection',
      'Zero light absorption means brighter images in twilight',
      'Used in premium binoculars, periscopes, and camera viewfinders',
    ],
  },
  {
    id: 4,
    title: 'Medical Endoscopy',
    description: 'Seeing inside the body',
    icon: '🏥',
    details: [
      'Bundles of thin fibers carry light into and images out of the body',
      'Fibers bend around corners while maintaining TIR',
      'Enables minimally invasive surgery and diagnosis',
      'Colonoscopy, arthroscopy, and laparoscopy all use this technology',
    ],
  },
];

// =============================================================================
// TEST QUESTIONS - Scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  // 1. Core concept - critical angle (Easy)
  {
    scenario: "A scuba diver shines a flashlight upward toward the water's surface. At shallow angles, the light escapes into the air, but as the diver tilts the flashlight more steeply, something surprising happens.",
    question: "What is the critical angle, and why is it important for total internal reflection?",
    options: [
      { id: 'a', label: "The angle at which light enters the water from air" },
      { id: 'b', label: "The minimum angle at which light is completely reflected back into the denser medium", correct: true },
      { id: 'c', label: "The angle at which light travels fastest through a medium" },
      { id: 'd', label: "The angle at which light is absorbed by the water" }
    ],
    explanation: "The critical angle is the minimum angle of incidence (measured from the normal) at which total internal reflection occurs. When light traveling in a denser medium (like water) hits the boundary at or above this angle, it cannot escape and is completely reflected back. For water-air, this angle is about 48.6 degrees."
  },
  // 2. Fiber optic operation (Easy-Medium)
  {
    scenario: "Fiber optic cables carry internet data across oceans at nearly the speed of light. These thin glass strands can bend around corners while keeping the light signal intact for thousands of kilometers.",
    question: "How does total internal reflection enable fiber optic communication?",
    options: [
      { id: 'a', label: "The fiber amplifies the light signal as it travels" },
      { id: 'b', label: "Light bounces along the fiber core via repeated total internal reflections with virtually no loss", correct: true },
      { id: 'c', label: "The fiber converts light into electrical signals that travel faster" },
      { id: 'd', label: "The glass absorbs and re-emits light at each bend" }
    ],
    explanation: "Fiber optics work by trapping light inside a high-refractive-index glass core surrounded by lower-index cladding. Light enters at a shallow angle and repeatedly reflects off the core-cladding boundary via TIR. Since TIR reflects 100% of the light (unlike mirrors that absorb some), signals can travel vast distances with minimal loss."
  },
  // 3. Diamond brilliance (Medium)
  {
    scenario: "Jewelers cut diamonds with precise angles to maximize their 'fire' and 'brilliance.' A well-cut diamond sparkles intensely, while a poorly cut one looks dull despite being the same material.",
    question: "Why does diamond's small critical angle (24.4 degrees) make it exceptionally brilliant?",
    options: [
      { id: 'a', label: "Diamond absorbs more light than other gems" },
      { id: 'b', label: "Light easily gets trapped inside and bounces multiple times before exiting through the top", correct: true },
      { id: 'c', label: "Diamond's hardness causes light to vibrate faster" },
      { id: 'd', label: "The small angle allows more light to escape through the sides" }
    ],
    explanation: "Diamond's high refractive index (2.42) creates a very small critical angle of only 24.4 degrees. This means light is easily trapped inside and undergoes multiple internal reflections before finally exiting through the top facets. The brilliant cut is designed to maximize these internal bounces, creating the characteristic sparkle. Lower-index gems let more light leak out the bottom."
  },
  // 4. Underwater visibility (Medium)
  {
    scenario: "A fish swimming near the surface of a pond looks up and sees a peculiar sight: instead of seeing the sky everywhere above, it sees a bright circular window of sky surrounded by a mirror-like reflection of the underwater world.",
    question: "What causes this 'Snell's window' phenomenon that fish observe?",
    options: [
      { id: 'a', label: "The surface of the water acts like a curved lens" },
      { id: 'b', label: "Light from above the critical angle undergoes total internal reflection, creating a reflective ring around a viewing cone", correct: true },
      { id: 'c', label: "Fish eyes have special filters that block certain angles of light" },
      { id: 'd', label: "Pollution on the water surface creates the mirror effect" }
    ],
    explanation: "Looking up from underwater, light from the sky can only enter within a cone defined by the critical angle (about 48.6 degrees for water). Outside this cone, the water surface acts as a perfect mirror due to TIR, reflecting the underwater scene. This creates 'Snell's window' - a circular porthole of sky surrounded by a mirror of the underwater world."
  },
  // 5. Prism binoculars (Medium-Hard)
  {
    scenario: "High-quality binoculars use Porro prisms made of glass rather than mirrors to fold the light path and correct the image orientation. Bird watchers prefer these for observing in low-light conditions at dawn and dusk.",
    question: "Why do premium binoculars use TIR prisms instead of mirrors?",
    options: [
      { id: 'a', label: "Glass prisms are lighter than mirrors" },
      { id: 'b', label: "TIR reflects 100% of light with zero absorption, while mirrors lose 4-10% at each reflection", correct: true },
      { id: 'c', label: "Prisms magnify the image while mirrors only redirect it" },
      { id: 'd', label: "Mirrors require more frequent cleaning than prisms" }
    ],
    explanation: "Mirrors have metallic coatings that absorb some light at each reflection (typically 4-10% per surface). TIR prisms reflect 100% of the light without any coating. Since binoculars use multiple reflections to fold the light path, these losses compound. In dim conditions, this difference is significant - TIR prisms deliver brighter, higher-contrast images."
  },
  // 6. Evanescent wave (Hard)
  {
    scenario: "Even though total internal reflection is called 'total,' sensitive instruments can detect that a tiny amount of electromagnetic field actually penetrates into the less dense medium for a distance of about one wavelength.",
    question: "What is this penetrating field called, and why doesn't it violate energy conservation?",
    options: [
      { id: 'a', label: "Leakage radiation - it represents energy lost from the system" },
      { id: 'b', label: "Evanescent wave - it carries no energy away and decays exponentially without propagating", correct: true },
      { id: 'c', label: "Diffracted light - it bends around the interface edge" },
      { id: 'd', label: "Scattered light - it bounces off impurities at the surface" }
    ],
    explanation: "The evanescent wave is a non-propagating electromagnetic field that extends into the less dense medium during TIR. It decays exponentially with distance (within one wavelength) and doesn't carry energy away - the energy flows parallel to the surface and returns to the denser medium. This 'tunneling' field is real and is exploited in technologies like TIRF microscopy and fiber optic couplers."
  },
  // 7. Attenuated total reflectance spectroscopy (Hard)
  {
    scenario: "Chemists analyzing solid samples or thick liquids often use ATR (Attenuated Total Reflectance) spectroscopy. The sample is pressed against a crystal, and infrared light is shone through the crystal at an angle that causes TIR.",
    question: "How does ATR spectroscopy use the evanescent wave to analyze samples?",
    options: [
      { id: 'a', label: "The evanescent wave heats the sample, causing it to emit characteristic radiation" },
      { id: 'b', label: "The evanescent wave penetrates the sample surface, and absorption by the sample attenuates the reflected beam", correct: true },
      { id: 'c', label: "The sample changes the critical angle, altering the reflection pattern" },
      { id: 'd', label: "The light passes through the sample and is detected on the other side" }
    ],
    explanation: "During TIR, the evanescent wave extends a fraction of a wavelength into the sample pressed against the crystal. If the sample absorbs specific infrared frequencies, the evanescent wave at those frequencies is attenuated, reducing the intensity of the reflected beam. By measuring which frequencies are absorbed, chemists can identify molecular bonds and compounds without preparing thin samples."
  },
  // 8. Optical fiber modes (Hard)
  {
    scenario: "Telecommunications engineers distinguish between single-mode and multi-mode optical fibers. Single-mode fibers have tiny cores (about 9 micrometers) while multi-mode fibers have larger cores (50-62.5 micrometers).",
    question: "Why do single-mode fibers enable longer transmission distances than multi-mode fibers?",
    options: [
      { id: 'a', label: "Larger cores absorb more light, causing faster signal decay" },
      { id: 'b', label: "Single-mode fibers allow only one light path, eliminating modal dispersion that blurs signals over distance", correct: true },
      { id: 'c', label: "Multi-mode fibers have lower refractive indices, making TIR less efficient" },
      { id: 'd', label: "Single-mode fibers use special glass that amplifies the signal" }
    ],
    explanation: "In multi-mode fibers, light can travel via many different paths (modes) that bounce at different angles. These paths have slightly different lengths, causing pulses to spread out over distance (modal dispersion). Single-mode fibers are so narrow that only one mode propagates, eliminating this spreading. This allows signals to travel hundreds of kilometers without significant distortion."
  },
  // 9. Fingerprint sensors (Hard)
  {
    scenario: "Many smartphones use optical fingerprint sensors. These sensors shine light through a glass prism at an angle that would normally cause total internal reflection. When you press your finger against the glass, a detailed image of your fingerprint ridges appears.",
    question: "How does touching the prism surface disrupt TIR to create a fingerprint image?",
    options: [
      { id: 'a', label: "Body heat from the finger changes the refractive index of the glass" },
      { id: 'b', label: "Fingerprint ridges make direct contact with the glass, allowing the evanescent wave to couple into the skin and 'frustrating' TIR at those points", correct: true },
      { id: 'c', label: "The oils on fingerprint ridges absorb all the light that hits them" },
      { id: 'd', label: "Pressure from the finger compresses the glass, changing its optical properties" }
    ],
    explanation: "This is called 'frustrated total internal reflection' (FTIR). When fingerprint ridges touch the prism, the evanescent wave can couple into the skin (which has a higher refractive index than air). This allows light to escape at the contact points, frustrating TIR. The valleys don't touch and maintain TIR. The resulting pattern of reflected vs. escaped light creates a precise fingerprint image."
  },
  // 10. Retroreflector design (Hard)
  {
    scenario: "Highway signs and bicycle reflectors use corner-cube retroreflectors that send light back toward its source regardless of the angle it arrives from. Apollo astronauts left retroreflector arrays on the Moon that scientists still use today to measure the Earth-Moon distance with millimeter precision.",
    question: "How do corner-cube retroreflectors use TIR to return light to its source?",
    options: [
      { id: 'a', label: "The curved surfaces focus light back toward the source" },
      { id: 'b', label: "Three mutually perpendicular surfaces use TIR to reflect light exactly back along its incoming path after three bounces", correct: true },
      { id: 'c', label: "A special coating on the surfaces reverses the direction of light" },
      { id: 'd', label: "The material absorbs light and re-emits it toward the source" }
    ],
    explanation: "A corner-cube retroreflector has three mutually perpendicular surfaces meeting at a corner, like the inside corner of a box. Light entering undergoes TIR off each of the three surfaces. The geometry guarantees that after three reflections, the light exits parallel to its incoming direction, returning to its source. This works for any entry angle, making it perfect for applications where the light source direction varies."
  }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TotalInternalReflectionRenderer(_props: TotalInternalReflectionRendererProps) {
  // State management - using string phases
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive simulation state
  const [incidentAngle, setIncidentAngle] = useState(30);
  const [material, setMaterial] = useState<'water' | 'glass' | 'acrylic' | 'diamond'>('water');
  const [streamCurvature, setStreamCurvature] = useState(50);
  const [showLightPath, setShowLightPath] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);

  const animationRef = useRef<number | null>(null);

  // Sound function
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

  // Responsive detection
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

  // Animation loop for light traveling through stream
  useEffect(() => {
    const animate = () => {
      setAnimationFrame((prev) => (prev + 1) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // =============================================================================
  // PHYSICS CALCULATIONS
  // =============================================================================
  const currentMaterial = MATERIALS[material];
  const isTIR = incidentAngle > currentMaterial.criticalAngle;

  const getReflectionPercentage = useCallback((): number => {
    if (incidentAngle >= currentMaterial.criticalAngle) return 100;
    // Fresnel equations simplified - reflection increases as we approach critical angle
    const ratio = incidentAngle / currentMaterial.criticalAngle;
    return Math.min(100, Math.pow(ratio, 3) * 50);
  }, [incidentAngle, currentMaterial.criticalAngle]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
  }, [playSound]);

  const handleCompleteApp = useCallback(() => {
    const newCompleted = [...completedApps];
    newCompleted[selectedApp] = true;
    setCompletedApps(newCompleted);

    if (selectedApp < applications.length - 1) {
      setSelectedApp(selectedApp + 1);
    }
  }, [completedApps, selectedApp]);

  const handleAnswerSelect = useCallback(
    (index: number) => {
      if (showResult) return;
      setSelectedAnswer(index);
      setShowResult(true);

      if (questions[currentQuestion].options[index]?.correct) {
        setScore((prev) => prev + 1);
      }
    },
    [showResult, currentQuestion]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      goToPhase('mastery');
    }
  }, [currentQuestion, goToPhase]);

  const allAppsCompleted = completedApps.every(Boolean);

  // =============================================================================
  // BUTTON COMPONENT
  // =============================================================================
  const Button = useCallback(
    ({
      children,
      onClick,
      variant = 'primary',
      disabled = false,
      size = 'md',
      fullWidth = false,
    }: {
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost' | 'success';
      disabled?: boolean;
      size?: 'sm' | 'md' | 'lg';
      fullWidth?: boolean;
    }) => {
      const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: defined.spacing.sm,
        borderRadius: defined.radius.lg,
        fontFamily: defined.typography.fontFamily,
        fontWeight: defined.typography.weights.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        zIndex: 10,
        position: 'relative',
        ...(size === 'sm' && {
          padding: `${defined.spacing.sm} ${defined.spacing.md}`,
          fontSize: defined.typography.sizes.sm,
        }),
        ...(size === 'md' && {
          padding: `${defined.spacing.md} ${defined.spacing.lg}`,
          fontSize: defined.typography.sizes.base,
        }),
        ...(size === 'lg' && {
          padding: `${defined.spacing.lg} ${defined.spacing.xl}`,
          fontSize: defined.typography.sizes.lg,
        }),
      };

      const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
          background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
        secondary: {
          background: defined.colors.background.tertiary,
          color: defined.colors.text.primary,
          border: `1px solid ${defined.colors.background.tertiary}`,
        },
        ghost: {
          background: 'transparent',
          color: defined.colors.text.secondary,
        },
        success: {
          background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
      };

      return (
        <button
          onClick={onClick}
          disabled={disabled}
          style={{ ...baseStyles, ...variantStyles[variant] }}
        >
          {children}
        </button>
      );
    },
    []
  );

  // =============================================================================
  // PROGRESS BAR COMPONENT
  // =============================================================================
  const ProgressBar = useCallback(
    ({ current, total }: { current: number; total: number }) => (
      <div
        style={{
          display: 'flex',
          gap: defined.spacing.xs,
          justifyContent: 'center',
          marginBottom: defined.spacing.lg,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: isMobile ? '20px' : '32px',
              height: '4px',
              borderRadius: defined.radius.full,
              background:
                i < current
                  ? defined.colors.primary
                  : i === current
                    ? defined.colors.accent
                    : defined.colors.background.tertiary,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    ),
    [isMobile]
  );

  // =============================================================================
  // WATER STREAM VISUALIZATION
  // =============================================================================
  const renderWaterStreamVisualization = useCallback(() => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 350 : 420;
    const curveStrength = streamCurvature / 100;

    // Generate stream path - a curved path from top-left going down-right
    const streamStartX = 80;
    const streamStartY = 40;
    const streamEndX = width - 40;
    const streamEndY = height - 40;
    const controlX = streamStartX + (streamEndX - streamStartX) * 0.3;
    const controlY = streamStartY + (streamEndY - streamStartY) * (0.3 + curveStrength * 0.5);

    // Create bezier curve path for stream
    const streamPath = `M ${streamStartX} ${streamStartY} Q ${controlX} ${controlY}, ${streamEndX} ${streamEndY}`;

    // Calculate light bounces along the stream
    const numBounces = 8;
    const lightPoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= numBounces; i++) {
      const t = i / numBounces;
      // Bezier curve point calculation
      const x =
        Math.pow(1 - t, 2) * streamStartX +
        2 * (1 - t) * t * controlX +
        Math.pow(t, 2) * streamEndX;
      const y =
        Math.pow(1 - t, 2) * streamStartY +
        2 * (1 - t) * t * controlY +
        Math.pow(t, 2) * streamEndY;

      // Add small oscillation for zigzag effect
      const offset = (i % 2 === 0 ? 1 : -1) * 8;
      lightPoints.push({ x: x + offset, y });
    }

    // Animated light pulse position
    const pulsePosition = (animationFrame / 360) * numBounces;
    const pulseIndex = Math.floor(pulsePosition);
    const pulseFrac = pulsePosition - pulseIndex;

    let pulseX = streamStartX;
    let pulseY = streamStartY;
    if (pulseIndex < lightPoints.length - 1) {
      pulseX =
        lightPoints[pulseIndex].x +
        (lightPoints[pulseIndex + 1].x - lightPoints[pulseIndex].x) * pulseFrac;
      pulseY =
        lightPoints[pulseIndex].y +
        (lightPoints[pulseIndex + 1].y - lightPoints[pulseIndex].y) * pulseFrac;
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}
      >
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            {/* Water gradient */}
            <linearGradient id="waterStreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.7)" />
              <stop offset="100%" stopColor="rgba(14, 165, 233, 0.4)" />
            </linearGradient>

            {/* Light glow */}
            <filter id="lightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pulse glow */}
            <radialGradient id="pulseGlow">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 1)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill={defined.colors.background.secondary} rx="12" />

          {/* Faucet/Source */}
          <rect x={streamStartX - 30} y={0} width={60} height={streamStartY + 10} fill="#475569" rx="4" />
          <rect x={streamStartX - 20} y={streamStartY - 5} width={40} height={15} fill="#64748B" rx="2" />

          {/* Water stream */}
          <path
            d={streamPath}
            fill="none"
            stroke="url(#waterStreamGradient)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          {/* Stream highlights */}
          <path
            d={streamPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Light source indicator */}
          <circle
            cx={streamStartX}
            cy={streamStartY}
            r="12"
            fill={defined.colors.light.beam}
            filter="url(#lightGlow)"
          />
          <text
            x={streamStartX - 45}
            y={streamStartY + 5}
            fill={defined.colors.text.secondary}
            fontSize="11"
            fontFamily={defined.typography.fontFamily}
          >
            Light
          </text>

          {/* Light path (zigzag bounces) */}
          {showLightPath && isTIR && (
            <>
              <polyline
                points={lightPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={defined.colors.light.trapped}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lightGlow)"
                opacity={0.8}
              />
              {/* Bounce indicators */}
              {lightPoints.map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={defined.colors.light.trapped}
                  opacity={0.6}
                />
              ))}
            </>
          )}

          {/* Animated light pulse */}
          {isTIR && (
            <circle
              cx={pulseX}
              cy={pulseY}
              r="10"
              fill="url(#pulseGlow)"
              filter="url(#lightGlow)"
            />
          )}

          {/* If NOT TIR, show light escaping */}
          {!isTIR && (
            <g>
              {/* Light escaping the stream */}
              {[1, 2, 3].map((i) => {
                const escapeX = streamStartX + i * 60;
                const t = i / 4;
                const escapeY =
                  Math.pow(1 - t, 2) * streamStartY +
                  2 * (1 - t) * t * controlY +
                  Math.pow(t, 2) * streamEndY;

                return (
                  <g key={i}>
                    <line
                      x1={escapeX}
                      y1={escapeY}
                      x2={escapeX + 40}
                      y2={escapeY - 30}
                      stroke={defined.colors.light.beam}
                      strokeWidth="2"
                      opacity={0.5}
                      strokeDasharray="4,4"
                    />
                    <text
                      x={escapeX + 30}
                      y={escapeY - 35}
                      fill={defined.colors.warning}
                      fontSize="9"
                      fontFamily={defined.typography.fontFamily}
                    >
                      escapes
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Basin/collector */}
          <ellipse
            cx={streamEndX}
            cy={streamEndY + 15}
            rx="50"
            ry="15"
            fill="rgba(56, 189, 248, 0.3)"
          />
          <path
            d={`M ${streamEndX - 50} ${streamEndY + 15} Q ${streamEndX - 50} ${streamEndY + 50}, ${streamEndX} ${streamEndY + 55} Q ${streamEndX + 50} ${streamEndY + 50}, ${streamEndX + 50} ${streamEndY + 15}`}
            fill="rgba(56, 189, 248, 0.2)"
          />

          {/* TIR Status indicator */}
          <rect
            x={width - 130}
            y={20}
            width={110}
            height={60}
            rx="8"
            fill={defined.colors.background.card}
          />
          <text
            x={width - 75}
            y={42}
            fill={isTIR ? defined.colors.success : defined.colors.warning}
            fontSize="12"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
            fontWeight="bold"
          >
            {isTIR ? '✓ TIR Active' : '✗ Light Escaping'}
          </text>
          <text
            x={width - 75}
            y={62}
            fill={defined.colors.text.muted}
            fontSize="10"
            fontFamily={defined.typography.fontFamily}
            textAnchor="middle"
          >
            θ = {incidentAngle}° / θc = {currentMaterial.criticalAngle}°
          </text>
        </svg>

        {/* Info panel */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.md,
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isTIR ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            width: '100%',
            maxWidth: '350px',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              fontWeight: defined.typography.weights.bold,
              color: isTIR ? defined.colors.success : defined.colors.warning,
              marginBottom: defined.spacing.xs,
            }}
          >
            {isTIR ? '100% Light Trapped!' : `${getReflectionPercentage().toFixed(0)}% Reflected`}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
            }}
          >
            {isTIR
              ? 'Light bounces inside the stream, following its curve'
              : `Increase angle above ${currentMaterial.criticalAngle}° to trap all light`}
          </div>
        </div>
      </div>
    );
  }, [
    isMobile,
    streamCurvature,
    showLightPath,
    isTIR,
    incidentAngle,
    currentMaterial.criticalAngle,
    animationFrame,
    getReflectionPercentage,
  ]);

  // =============================================================================
  // SIMPLE TIR DIAGRAM (for understanding)
  // =============================================================================
  const renderTIRDiagram = useCallback(() => {
    const width = isMobile ? 280 : 350;
    const height = 200;
    const centerX = width / 2;
    const centerY = 100;

    const incidentRad = (incidentAngle * Math.PI) / 180;
    const criticalRad = (currentMaterial.criticalAngle * Math.PI) / 180;

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="mediumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.05)" />
            <stop offset="100%" stopColor={currentMaterial.color} />
          </linearGradient>
        </defs>

        {/* Air (top) */}
        <rect x={0} y={0} width={width} height={centerY} fill="rgba(148, 163, 184, 0.05)" />
        <text
          x={10}
          y={20}
          fill={defined.colors.text.muted}
          fontSize="11"
          fontFamily={defined.typography.fontFamily}
        >
          Air (n=1.0)
        </text>

        {/* Dense medium (bottom) */}
        <rect x={0} y={centerY} width={width} height={centerY} fill={currentMaterial.color} />
        <text
          x={10}
          y={height - 10}
          fill={defined.colors.text.muted}
          fontSize="11"
          fontFamily={defined.typography.fontFamily}
        >
          {currentMaterial.name} (n={currentMaterial.n})
        </text>

        {/* Interface */}
        <line x1={0} y1={centerY} x2={width} y2={centerY} stroke="white" strokeWidth="1" opacity={0.5} />

        {/* Normal line */}
        <line
          x1={centerX}
          y1={centerY - 60}
          x2={centerX}
          y2={centerY + 60}
          stroke="white"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity={0.3}
        />

        {/* Critical angle line (dashed) */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + Math.sin(criticalRad) * 70}
          y2={centerY - Math.cos(criticalRad) * 70}
          stroke={defined.colors.warning}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity={0.6}
        />
        <text
          x={centerX + Math.sin(criticalRad) * 75}
          y={centerY - Math.cos(criticalRad) * 75}
          fill={defined.colors.warning}
          fontSize="9"
          fontFamily={defined.typography.fontFamily}
        >
          θc={currentMaterial.criticalAngle}°
        </text>

        {/* Incident ray (from inside medium going up) */}
        <line
          x1={centerX - Math.sin(incidentRad) * 60}
          y1={centerY + Math.cos(incidentRad) * 60}
          x2={centerX}
          y2={centerY}
          stroke={defined.colors.light.beam}
          strokeWidth="3"
        />

        {/* Result ray */}
        {isTIR ? (
          // Reflected ray
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + Math.sin(incidentRad) * 60}
            y2={centerY + Math.cos(incidentRad) * 60}
            stroke={defined.colors.light.trapped}
            strokeWidth="3"
          />
        ) : (
          // Refracted ray
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + Math.sin(incidentRad * 1.5) * 50}
            y2={centerY - Math.cos(incidentRad * 1.5) * 50}
            stroke={defined.colors.light.beam}
            strokeWidth="3"
            opacity={0.5}
          />
        )}

        {/* Angle arc */}
        <path
          d={`M ${centerX} ${centerY + 30} A 30 30 0 0 1 ${centerX - Math.sin(incidentRad) * 30} ${centerY + Math.cos(incidentRad) * 30}`}
          fill="none"
          stroke={isTIR ? defined.colors.success : defined.colors.primary}
          strokeWidth="2"
        />

        {/* Status */}
        <text
          x={centerX}
          y={25}
          fill={isTIR ? defined.colors.success : defined.colors.text.secondary}
          fontSize="12"
          fontFamily={defined.typography.fontFamily}
          textAnchor="middle"
          fontWeight="bold"
        >
          {isTIR ? 'Total Internal Reflection!' : 'Light partially escapes'}
        </text>
      </svg>
    );
  }, [isMobile, incidentAngle, currentMaterial, isTIR]);

  // =============================================================================
  // CONTROLS PANEL
  // =============================================================================
  const renderControls = useCallback(
    () => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          width: isMobile ? '100%' : '280px',
        }}
      >
        {/* Incident Angle Slider */}
        <div>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            <span>Incident Angle</span>
            <span
              style={{
                color: isTIR ? defined.colors.success : defined.colors.text.primary,
                fontWeight: defined.typography.weights.semibold,
              }}
            >
              {incidentAngle}°
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="85"
            value={incidentAngle}
            onChange={(e) => setIncidentAngle(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: isTIR ? defined.colors.success : defined.colors.primary,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
              marginTop: defined.spacing.xs,
            }}
          >
            <span>0°</span>
            <span style={{ color: defined.colors.warning }}>
              Critical: {currentMaterial.criticalAngle}°
            </span>
            <span>85°</span>
          </div>
        </div>

        {/* Stream Curvature */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Stream Curvature: {streamCurvature}%
          </label>
          <input
            type="range"
            min="10"
            max="90"
            value={streamCurvature}
            onChange={(e) => setStreamCurvature(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: defined.colors.primary,
            }}
          />
        </div>

        {/* Material Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Material
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: defined.spacing.xs,
            }}
          >
            {Object.entries(MATERIALS).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => setMaterial(key as typeof material)}
                style={{
                  padding: defined.spacing.sm,
                  borderRadius: defined.radius.md,
                  border:
                    material === key
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    material === key
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: defined.colors.text.primary,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.xs,
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                }}
              >
                <div>{mat.name}</div>
                <div style={{ color: defined.colors.text.muted }}>θc={mat.criticalAngle}°</div>
              </button>
            ))}
          </div>
        </div>

        {/* Show Light Path Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
            }}
          >
            Show Light Path
          </span>
          <button
            onClick={() => setShowLightPath(!showLightPath)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showLightPath
                ? defined.colors.primary
                : defined.colors.background.tertiary,
              position: 'relative',
              transition: 'background 0.3s ease',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: showLightPath ? '23px' : '3px',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* Quick insight */}
        <div
          style={{
            background: isTIR
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            border: `1px solid ${isTIR ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: isTIR ? defined.colors.success : defined.colors.warning,
              fontWeight: defined.typography.weights.semibold,
              marginBottom: defined.spacing.xs,
            }}
          >
            {isTIR ? '⚡ Light is trapped!' : '💡 Light escaping'}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.secondary,
            }}
          >
            {isTIR
              ? `At ${incidentAngle}° (above ${currentMaterial.criticalAngle}°), 100% of light reflects back`
              : `Need ${currentMaterial.criticalAngle - incidentAngle}° more to achieve TIR`}
          </div>
        </div>
      </div>
    ),
    [isMobile, incidentAngle, streamCurvature, material, showLightPath, isTIR, currentMaterial]
  );

  // =============================================================================
  // REAL-WORLD APPLICATIONS DATA
  // =============================================================================
  const realWorldApps = [
    {
      icon: '🌐',
      title: 'Internet Backbone',
      short: 'Telecommunications',
      tagline: 'The invisible highways of global data',
      description: 'Fiber optic cables form the backbone of the global internet, carrying 99% of intercontinental data traffic. Using total internal reflection, light signals travel through thin glass fibers at nearly the speed of light, connecting continents through underwater cables that span thousands of kilometers. Each fiber can carry terabits of data per second, making modern cloud computing, streaming, and global communication possible.',
      connection: 'Total internal reflection keeps light trapped inside the fiber core as it bounces along, even around gentle bends. The high refractive index glass core surrounded by lower-index cladding creates the conditions for TIR at shallow angles, allowing signals to travel vast distances with minimal loss.',
      howItWorks: 'Light from laser diodes enters the fiber core at a shallow angle. The core (n≈1.5) is surrounded by cladding (n≈1.45). When light hits the core-cladding boundary above the critical angle (~8°), TIR occurs and 100% of light reflects back into the core. This bouncing continues millions of times per kilometer. Signals travel at about 200,000 km/s (2/3 the speed of light in vacuum) because light slows in glass.',
      stats: [
        { value: '99%', label: 'Of intercontinental data via fiber' },
        { value: '1.2M km', label: 'Undersea cables deployed' },
        { value: '100+ Tbps', label: 'Single cable capacity' }
      ],
      examples: [
        'Transatlantic cables connect North America to Europe in just 60ms',
        'MAREA cable between Virginia and Spain carries 160 Tbps',
        'Submarine cables support $10 trillion in daily financial transactions',
        'Single-mode fibers carry signals 100+ km without amplification'
      ],
      companies: ['Corning', 'Prysmian Group', 'SubCom', 'NEC', 'Alcatel Submarine Networks'],
      futureImpact: 'Next-generation hollow-core fibers will transmit light through air instead of glass, achieving 99.7% of vacuum light speed. Multi-core fibers with 19+ cores will multiply capacity. Space-division multiplexing and advanced modulation could push single-fiber capacity beyond 1 petabit per second.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🏥',
      title: 'Medical Endoscopy',
      short: 'Healthcare',
      tagline: 'Seeing inside the body without surgery',
      description: 'Medical endoscopes use fiber optic bundles to carry light into and images out of the human body, enabling minimally invasive diagnosis and surgery. Thousands of individual fibers work together - some transmitting illumination light in, others carrying the reflected image back to cameras or the physician\'s eye. This technology has revolutionized medicine by allowing doctors to see inside organs without major surgery.',
      connection: 'Each fiber in the bundle uses TIR to keep light trapped as the flexible scope bends through body passages. The fibers can turn corners while maintaining clear light transmission, something impossible with mirrors or lenses. Even at sharp bends, light continues reflecting internally as long as the critical angle is maintained.',
      howItWorks: 'Coherent fiber bundles contain 10,000-50,000 individual fibers arranged identically at both ends. Light enters one end and each fiber transmits its portion of the image via TIR. LED or halogen light travels down illumination fibers to light the tissue. Reflected light returns through imaging fibers, reconstructing a complete image. Modern systems add cameras with digital processing for enhanced visualization.',
      stats: [
        { value: '50M+', label: 'Endoscopies performed yearly in US' },
        { value: '3mm', label: 'Diameter of smallest scopes' },
        { value: '75%', label: 'Reduction in recovery time vs open surgery' }
      ],
      examples: [
        'Colonoscopy uses 1.5m flexible scopes to examine the entire colon',
        'Arthroscopy enables knee surgery through 5mm incisions',
        'Bronchoscopes navigate lung airways to diagnose cancer',
        'Capsule endoscopy uses swallowable cameras with fiber optic lighting'
      ],
      companies: ['Olympus', 'Karl Storz', 'Fujifilm', 'Stryker', 'Boston Scientific'],
      futureImpact: 'AI-enhanced endoscopes will automatically detect polyps and cancer with superhuman accuracy. Robotic surgical systems will use thinner fiber bundles for even less invasive procedures. New fiber materials will enable UV and infrared imaging for detecting invisible tissue abnormalities.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: '📡',
      title: 'Fiber Optic Sensors',
      short: 'Industrial',
      tagline: 'Measuring the unmeasurable with light',
      description: 'Fiber optic sensors use changes in light transmission through fibers to measure temperature, strain, pressure, and chemical composition in environments too harsh or inaccessible for electronic sensors. The same TIR principle that carries data can detect the tiniest changes in the fiber itself, making measurements with extraordinary precision over distances of many kilometers.',
      connection: 'When external forces slightly bend the fiber or change its refractive index, the conditions for TIR change subtly. This alters how light propagates through the fiber - its intensity, phase, or wavelength shifts. These changes can be measured with extreme precision, converting physical parameters into optical signals that travel long distances without electrical interference.',
      howItWorks: 'Distributed sensing uses Brillouin or Raman scattering along the entire fiber length. Light pulses travel down the fiber, and backscattered light reveals temperature or strain at every point. Fiber Bragg gratings are periodic refractive index variations that reflect specific wavelengths - when strain or temperature shifts, the reflected wavelength changes measurably. Evanescent wave sensors detect chemicals by measuring how much light escapes where the fiber contacts the sample.',
      stats: [
        { value: '0.1°C', label: 'Temperature resolution achievable' },
        { value: '100 km', label: 'Single fiber sensing range' },
        { value: '1 million', label: 'Sensing points per fiber possible' }
      ],
      examples: [
        'Pipeline monitoring detects leaks by sensing temperature changes along buried pipes',
        'Structural health monitoring embeds fibers in bridges and buildings to detect strain',
        'Oil well sensors operate at 300°C where electronics would fail',
        'Perimeter security systems detect footsteps through ground vibration sensing'
      ],
      companies: ['Luna Innovations', 'OFS Fitel', 'FBGS Technologies', 'Omnisens', 'Sensornet'],
      futureImpact: 'Smart infrastructure will embed millions of fiber sensors in roads, buildings, and pipelines for real-time structural monitoring. Wearable fiber sensors will continuously monitor vital signs. Quantum-enhanced fiber sensors will achieve measurement precision approaching fundamental physical limits.',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: '🖥️',
      title: 'Data Center Interconnects',
      short: 'Computing',
      tagline: 'Where light replaces electricity for speed',
      description: 'Inside massive data centers powering cloud services, fiber optic cables connect thousands of servers at speeds impossible with copper wires. These short-reach optical links, from meters to kilometers, carry the explosive data traffic between compute nodes, storage arrays, and network switches. As AI workloads demand ever more bandwidth, fiber optics enables the dense, high-speed interconnections that make modern computing possible.',
      connection: 'TIR enables dense wavelength-division multiplexing (WDM) where dozens of different light colors travel through the same fiber simultaneously, each carrying independent data. The fiber\'s ability to trap light perfectly means these channels don\'t interfere with each other, multiplying capacity without adding cables.',
      howItWorks: 'Vertical-cavity surface-emitting lasers (VCSELs) or distributed feedback lasers send modulated light into multimode or single-mode fibers. Multimode fibers (50μm core) use multiple light paths for short distances (<500m). Single-mode fibers (9μm core) support one path for longer reaches. Silicon photonics integrates optical components onto chips, enabling 800 Gbps transceivers. Co-packaged optics place fiber connections directly on switch ASICs.',
      stats: [
        { value: '800 Gbps', label: 'Per-port speeds now common' },
        { value: '51.2 Tbps', label: 'Single switch capacity' },
        { value: '10M km', label: 'Fiber in large hyperscale DC' }
      ],
      examples: [
        'GPU clusters for AI training need 400-800G links between every pair',
        'Storage area networks use fiber to achieve microsecond latency',
        'Spine-leaf architectures require thousands of parallel fiber links',
        'Active optical cables integrate transceivers directly into cable assemblies'
      ],
      companies: ['Broadcom', 'Intel', 'Cisco', 'Nvidia', 'Coherent'],
      futureImpact: 'Co-packaged optics will eliminate the transceiver bottleneck by integrating fiber directly with processors. Silicon photonics will enable 1.6 Tbps and 3.2 Tbps links. Optical switching will eventually replace electrical packet switching for lower latency and power consumption in next-generation AI supercomputers.',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Light Trapped in Water
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how light can follow curved paths through total internal reflection
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          {/* Illustration */}
          <svg width="280" height="160" className="mx-auto mb-6" style={{ display: 'block' }}>
            {/* Water stream */}
            <path
              d="M 40 30 Q 140 80, 240 130"
              fill="none"
              stroke="rgba(56, 189, 248, 0.5)"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Light path inside */}
            <path
              d="M 45 30 L 65 50 L 85 35 L 105 55 L 125 40 L 145 60 L 165 45 L 185 65 L 205 50 L 225 70"
              fill="none"
              stroke="#F472B6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Glow at end */}
            <circle cx="240" cy="130" r="20" fill="rgba(244, 114, 182, 0.3)" />
            <circle cx="240" cy="130" r="10" fill="#F472B6" />
            {/* Labels */}
            <text x="20" y="25" fill="#22D3EE" fontSize="12" fontWeight="bold">Light in</text>
            <text x="200" y="125" fill="#F472B6" fontSize="12" fontWeight="bold">Light out!</text>
          </svg>

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Shine a laser into a curved water stream
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The light doesn't escape - it <span className="text-pink-400 font-semibold">follows the curve</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                How does light get trapped inside water?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10 }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Critical Angles
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Fiber Optics
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Diamond Brilliance
        </div>
      </div>
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        Make Your Prediction
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Light travels from inside water toward the surface at a steep angle. Why might it get
        "trapped" instead of exiting?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          {
            id: 'critical',
            text: 'At steep angles, light physically cannot exit - it must reflect back',
          },
          { id: 'absorb', text: 'Water absorbs all the light at steep angles' },
          { id: 'scatter', text: 'Light scatters in all directions at the surface' },
          { id: 'slow', text: 'Light slows down so much it stops and reverses' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                prediction === option.id
                  ? `2px solid ${defined.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                prediction === option.id
                  ? 'rgba(99, 102, 241, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
              zIndex: 10,
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'Test My Prediction →',
        onClick: () => goToPhase('play'),
        disabled: !prediction,
        size: 'lg',
      })}
    </div>
  );

  // PLAY PHASE
  const renderPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Explore Total Internal Reflection
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Increase the incident angle and watch what happens when you cross the critical angle. Can
        you trap all the light?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        {renderWaterStreamVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: isTIR ? 'I Trapped the Light! → Review' : 'Increase angle to trap light first',
        onClick: () => goToPhase('review'),
        disabled: !isTIR,
        size: 'lg',
      })}
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        The Physics of Light Trapping
      </h2>

      <div
        style={{
          background:
            prediction === 'critical' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'critical' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'critical' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'critical' ? '✓ Correct!' : '✗ Not quite!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Above the critical angle, light physically cannot refract out - Snell's Law would require
          sinθ {">"} 1, which is impossible. 100% of light reflects back!
        </p>
      </div>

      {/* Visual diagram */}
      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.lg,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {renderTIRDiagram()}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: defined.spacing.lg,
          maxWidth: '700px',
        }}
      >
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📐</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Critical Angle
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            θc = arcsin(n₂/n₁). For water→air: arcsin(1/1.33) = 48.6°. Above this, all light
            reflects.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>💯</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            100% Reflection
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Unlike mirrors (which absorb some light), TIR reflects 100%. Perfect for optical
            applications!
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔄</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Repeated Bounces
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            In a curved stream, light bounces repeatedly. Each bounce exceeds the critical angle, so
            light follows the curve!
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>➡️</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Dense → Less Dense
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            TIR only works when light travels FROM a denser medium TO a less dense one (e.g., water
            → air, not air → water).
          </p>
        </div>
      </div>

      {Button({
        children: 'Try Fiber Optics →',
        onClick: () => goToPhase('twist_predict'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          🔄 TWIST CHALLENGE
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        The Diamond Challenge
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Diamond has a refractive index of 2.42 (vs water's 1.33). How do you think this affects its
        ability to trap light?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          { id: 'easier', text: 'EASIER to trap light - smaller critical angle (24.4°)' },
          { id: 'harder', text: 'HARDER to trap light - light moves too fast' },
          { id: 'same', text: 'SAME - refractive index doesn\'t affect TIR' },
          { id: 'none', text: 'IMPOSSIBLE - diamond is too transparent' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                twistPrediction === option.id
                  ? `2px solid ${defined.colors.accent}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                twistPrediction === option.id
                  ? 'rgba(245, 158, 11, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
              zIndex: 10,
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'Test with Diamond →',
        onClick: () => {
          setMaterial('diamond');
          setIncidentAngle(30);
          goToPhase('twist_play');
        },
        disabled: !twistPrediction,
        size: 'lg',
      })}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          💎 DIAMOND MODE
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Compare Materials
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Switch between materials and notice how the critical angle changes. Diamond traps light
        much more easily!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        {renderWaterStreamVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'See Why This Matters →',
        onClick: () => goToPhase('twist_review'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Why Diamonds Sparkle!
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'easier' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${twistPrediction === 'easier' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: twistPrediction === 'easier' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {twistPrediction === 'easier' ? '✓ Exactly right!' : '✗ Interesting!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Diamond's high refractive index (2.42) creates a tiny critical angle (24.4°). Light
          entering from almost any direction gets trapped and bounces inside multiple times!
        </p>
      </div>

      {/* Critical angle comparison */}
      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          width: '100%',
          maxWidth: '500px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3
          style={{
            color: defined.colors.text.primary,
            fontSize: defined.typography.sizes.lg,
            marginBottom: defined.spacing.lg,
            textAlign: 'center',
          }}
        >
          Critical Angle Comparison
        </h3>
        {Object.entries(MATERIALS).map(([key, mat]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: defined.spacing.md,
              marginBottom: defined.spacing.md,
            }}
          >
            <div
              style={{
                width: '80px',
                color: defined.colors.text.primary,
                fontSize: defined.typography.sizes.sm,
              }}
            >
              {mat.name}
            </div>
            <div
              style={{
                flex: 1,
                height: '24px',
                background: defined.colors.background.tertiary,
                borderRadius: defined.radius.full,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${(mat.criticalAngle / 90) * 100}%`,
                  height: '100%',
                  background:
                    key === 'diamond'
                      ? 'linear-gradient(90deg, #A855F7, #EC4899)'
                      : defined.colors.primary,
                  borderRadius: defined.radius.full,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.xs,
                  fontWeight: defined.typography.weights.semibold,
                }}
              >
                {mat.criticalAngle}°
              </span>
            </div>
          </div>
        ))}
        <p
          style={{
            color: defined.colors.text.muted,
            fontSize: defined.typography.sizes.xs,
            textAlign: 'center',
            marginTop: defined.spacing.md,
          }}
        >
          Smaller critical angle = easier to trap light = more sparkle!
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: defined.spacing.lg,
          maxWidth: '600px',
        }}
      >
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>💎</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            The Brilliant Cut
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Diamond cutters angle facets so light bounces multiple times via TIR before exiting
            through the top - maximum sparkle!
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: defined.spacing.sm }}>🌐</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Fiber Optic Design
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Engineers choose core/cladding materials with optimal refractive index difference for
            efficient light trapping.
          </p>
        </div>
      </div>

      {Button({
        children: 'See Real-World Applications →',
        onClick: () => goToPhase('transfer'),
        size: 'lg',
      })}
    </div>
  );

  // TRANSFER PHASE
  const renderTransfer = () => {
    const currentApp = applications[selectedApp];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.lg,
          padding: defined.spacing.lg,
          minHeight: '500px',
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
          }}
        >
          Real-World Applications
        </h2>

        {/* Progress indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: defined.spacing.xs,
          }}
        >
          {applications.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: completedApps[i]
                  ? defined.colors.success
                  : i === selectedApp
                    ? defined.colors.primary
                    : defined.colors.background.tertiary,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Application tabs */}
        <div
          style={{
            display: 'flex',
            gap: defined.spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {applications.map((app, i) => {
            const isCompleted = completedApps[i];
            const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

            return (
              <button
                key={app.id}
                onClick={() => !isLocked && setSelectedApp(i)}
                disabled={isLocked}
                style={{
                  padding: `${defined.spacing.sm} ${defined.spacing.md}`,
                  borderRadius: defined.radius.lg,
                  border:
                    selectedApp === i
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    selectedApp === i
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: isLocked ? defined.colors.text.muted : defined.colors.text.primary,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  opacity: isLocked ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: defined.spacing.xs,
                  zIndex: 10,
                }}
              >
                <span>{isLocked ? '🔒' : app.icon}</span>
                {!isMobile && app.title}
                {isCompleted && <span style={{ color: defined.colors.success }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Current application content */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: defined.spacing.md,
              marginBottom: defined.spacing.lg,
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{currentApp.icon}</span>
            <div>
              <h3
                style={{
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.xl,
                  margin: 0,
                }}
              >
                {currentApp.title}
              </h3>
              <p
                style={{
                  color: defined.colors.text.muted,
                  fontSize: defined.typography.sizes.sm,
                  margin: 0,
                }}
              >
                {currentApp.description}
              </p>
            </div>
          </div>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: defined.spacing.md,
            }}
          >
            {currentApp.details.map((detail, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: defined.spacing.md,
                  color: defined.colors.text.secondary,
                  fontSize: defined.typography.sizes.base,
                }}
              >
                <span style={{ color: defined.colors.primary, fontWeight: 'bold' }}>•</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: defined.spacing.md,
          }}
        >
          {selectedApp < applications.length - 1 ? (
            Button({
              children: 'Next Application →',
              onClick: () => {
                handleCompleteApp();
              },
              variant: 'primary',
            })
          ) : allAppsCompleted ? (
            Button({
              children: 'Take the Quiz →',
              onClick: () => goToPhase('test'),
              variant: 'success',
            })
          ) : (
            Button({
              children: 'Complete Application',
              onClick: handleCompleteApp,
              variant: 'primary',
            })
          )}
        </div>
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    const question = questions[currentQuestion];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
        }}
      >
        {ProgressBar({ current: currentQuestion, total: questions.length })}

        <div
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.muted,
          }}
        >
          Question {currentQuestion + 1} of {questions.length}
        </div>

        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.lg : defined.typography.sizes.xl,
            fontWeight: defined.typography.weights.semibold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
            maxWidth: '600px',
          }}
        >
          {question.question}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: defined.spacing.md,
            width: '100%',
            maxWidth: '500px',
          }}
        >
          {question.options.map((option, i) => {
            let background = defined.colors.background.secondary;
            let borderColor = 'rgba(255,255,255,0.1)';

            if (showResult) {
              if (option.correct) {
                background = 'rgba(16, 185, 129, 0.2)';
                borderColor = defined.colors.success;
              } else if (i === selectedAnswer && !option.correct) {
                background = 'rgba(239, 68, 68, 0.2)';
                borderColor = defined.colors.error;
              }
            } else if (i === selectedAnswer) {
              background = 'rgba(99, 102, 241, 0.2)';
              borderColor = defined.colors.primary;
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult}
                style={{
                  padding: defined.spacing.lg,
                  borderRadius: defined.radius.lg,
                  border: `2px solid ${borderColor}`,
                  background,
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.base,
                  textAlign: 'left',
                  cursor: showResult ? 'default' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                }}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.lg,
              maxWidth: '500px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p
              style={{
                color: defined.colors.text.secondary,
                fontSize: defined.typography.sizes.sm,
                margin: 0,
              }}
            >
              {question.explanation}
            </p>
          </div>
        )}

        {showResult &&
          Button({
            children: currentQuestion < questions.length - 1 ? 'Next Question →' : 'See Results →',
            onClick: handleNextQuestion,
            size: 'lg',
          })}
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => {
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '4rem',
            marginBottom: defined.spacing.md,
          }}
        >
          {passed ? '✨' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'TIR Master!' : 'Keep Practicing!'}
        </h1>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes['4xl'],
              fontWeight: defined.typography.weights.bold,
              color: passed ? defined.colors.success : defined.colors.accent,
              marginBottom: defined.spacing.sm,
            }}
          >
            {score}/{questions.length}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.text.secondary,
            }}
          >
            {percentage.toFixed(0)}% Correct
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '200px',
              height: '8px',
              background: defined.colors.background.tertiary,
              borderRadius: defined.radius.full,
              overflow: 'hidden',
              margin: `${defined.spacing.lg} auto 0`,
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: passed
                  ? defined.colors.success
                  : percentage >= 50
                    ? defined.colors.accent
                    : defined.colors.error,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: defined.spacing.md,
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>📐</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Critical Angle
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>💯</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              100% Reflection
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🌐</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Fiber Optics
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: defined.typography.sizes.base,
            color: defined.colors.text.secondary,
            maxWidth: '500px',
          }}
        >
          {passed
            ? 'You understand how light can be trapped and guided through materials - the foundation of fiber optics and diamond brilliance!'
            : 'Review the critical angle concept and try again. TIR is a fascinating phenomenon!'}
        </p>

        <div style={{ display: 'flex', gap: defined.spacing.md }}>
          {Button({
            children: 'Start Over',
            onClick: () => {
              setPhase('hook');
              setPrediction(null);
              setTwistPrediction(null);
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowResult(false);
              setScore(0);
              setCompletedApps([false, false, false, false]);
              setSelectedApp(0);
              setMaterial('water');
              setIncidentAngle(30);
            },
            variant: 'secondary',
          })}
        </div>
      </div>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Total Internal Reflection</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : currentPhaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ fontFamily: defined.typography.fontFamily }}>
        <div className="max-w-4xl mx-auto px-4">
          {phase === 'hook' && renderHook()}
          {phase === 'predict' && renderPredict()}
          {phase === 'play' && renderPlay()}
          {phase === 'review' && renderReview()}
          {phase === 'twist_predict' && renderTwistPredict()}
          {phase === 'twist_play' && renderTwistPlay()}
          {phase === 'twist_review' && renderTwistReview()}
          {phase === 'transfer' && renderTransfer()}
          {phase === 'test' && renderTest()}
          {phase === 'mastery' && renderMastery()}
        </div>
      </div>
    </div>
  );
}
