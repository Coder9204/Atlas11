'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// LAW OF REFLECTION RENDERER - MIRROR GEOMETRY
// Premium 10-phase educational game with complete structure
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface LawOfReflectionRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  gamePhase?: string;
}

// Premium Design System
const colors = {
  background: '#0a0f1a',
  cardBg: '#141e2c',
  primary: '#60a5fa',
  secondary: '#818cf8',
  accent: '#f472b6',
  success: '#34d399',
  warning: '#fbbf24',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#1e3a5f',
  gradientStart: '#1e3a8a',
  gradientEnd: '#7c3aed',
};

const typography = {
  h1: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' },
  h2: { fontSize: '22px', fontWeight: '600', letterSpacing: '-0.01em' },
  h3: { fontSize: '18px', fontWeight: '600' },
  body: { fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
  small: { fontSize: '14px', fontWeight: '400' },
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

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

const predictions = {
  initial: {
    question: "You shine a flashlight at a flat mirror at a 30 degree angle from the vertical (normal line). At what angle will the light bounce off?",
    options: [
      { id: 'a', text: '30 degrees on the same side as the flashlight', icon: '1' },
      { id: 'b', text: '30 degrees on the opposite side from the flashlight', icon: '2' },
      { id: 'c', text: '60 degrees from the mirror surface', icon: '3' },
      { id: 'd', text: 'Depends on the type of mirror material', icon: '4' },
    ],
    correct: 'b',
    explanation: "The Law of Reflection: angle of incidence = angle of reflection. Light bounces at exactly the same angle on the other side of the normal. This is why you can see yourself in a mirror - each ray follows this simple rule!"
  },
  twist: {
    question: "You place two mirrors at a 90 degree angle to each other (like a corner). If you shine light at one mirror, what happens to the outgoing beam?",
    options: [
      { id: 'a', text: 'It gets stuck bouncing between the mirrors forever', icon: '1' },
      { id: 'b', text: 'It comes back parallel to the original direction', icon: '2' },
      { id: 'c', text: 'It scatters in all directions', icon: '3' },
      { id: 'd', text: 'It passes through the corner', icon: '4' },
    ],
    correct: 'b',
    explanation: "A corner reflector sends light back exactly where it came from! Two 90 degree reflections rotate the beam by 180 degrees. This is why corner reflectors are on road signs, bicycles, and were even placed on the Moon by Apollo astronauts!"
  }
};

const realWorldApps = [
  {
    icon: '🔭',
    title: 'Telescope Mirrors',
    short: 'Gathering starlight precisely',
    tagline: 'Reflecting the cosmos into focus',
    description: 'Astronomical telescopes use precisely curved mirrors to gather and focus starlight. The law of reflection determines how each point on the mirror directs light to the focal point. Even nanometer-scale surface errors cause image degradation.',
    connection: 'Every photon striking the mirror obeys the law of reflection—angle in equals angle out relative to the local surface normal. Parabolic shapes ensure all parallel rays converge at one focus.',
    howItWorks: 'Primary mirrors are ground to parabolic shapes accurate to fractions of a wavelength. Secondary mirrors redirect light to detectors. Adaptive optics use deformable mirrors that adjust shape hundreds of times per second to correct for atmospheric turbulence.',
    stats: [
      { value: '10nm', label: 'Surface accuracy', icon: '⚡' },
      { value: '39m', label: 'ELT diameter', icon: '📈' },
      { value: '$1.4B', label: 'ELT cost', icon: '🚀' }
    ],
    examples: ['James Webb Space Telescope', 'Keck Observatory', 'Extremely Large Telescope', 'Hubble primary mirror'],
    companies: ['L3Harris', 'Safran Reosc', 'Schott', 'Corning'],
    futureImpact: 'Next-generation telescopes will use segmented mirrors with hundreds of individually controlled segments, each applying the law of reflection to create continent-sized virtual apertures.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Vehicle Mirrors',
    short: 'Seeing around corners safely',
    tagline: 'Reflection saves lives on roads',
    description: 'Car mirrors use the law of reflection to show drivers what is behind and beside them. Convex mirrors on passenger sides provide wider fields of view by reflecting light from a larger area, though objects appear smaller and farther away.',
    connection: 'Each point on a mirror reflects light according to the law of reflection. Flat mirrors show true size and distance; convex mirrors curve outward, with local normals pointing in different directions to capture a wider view.',
    howItWorks: 'Driver-side flat mirrors provide accurate distance perception for lane changes. Passenger-side convex mirrors show blind spots but require the "objects closer than they appear" warning. Auto-dimming mirrors reduce glare by electronically adjusting reflectivity.',
    stats: [
      { value: '180°', label: 'Convex FOV', icon: '⚡' },
      { value: '24%', label: 'Crash reduction', icon: '📈' },
      { value: '$8.2B', label: 'Mirror market', icon: '🚀' }
    ],
    examples: ['Side-view mirrors', 'Rear-view auto-dimming', 'Truck convex mirrors', 'Motorcycle bar-end mirrors'],
    companies: ['Gentex', 'Magna', 'Ficosa', 'Murakami'],
    futureImpact: 'Camera-based mirror replacement systems will eliminate blind spots entirely while maintaining the intuitive reflected-image experience drivers expect.',
    color: '#3B82F6'
  },
  {
    icon: '☀️',
    title: 'Solar Concentrators',
    short: 'Focusing sunlight for power',
    tagline: 'Mirrors that harvest the sun',
    description: 'Concentrated solar power plants use thousands of mirrors to focus sunlight onto receivers. Each heliostat applies the law of reflection to direct its beam precisely. Tower plants can reach temperatures above 1000°C for efficient thermal generation.',
    connection: 'The law of reflection determines exactly how each mirror must be angled to reflect sunlight toward the central tower. Two-axis tracking adjusts angles throughout the day as the sun moves across the sky.',
    howItWorks: 'Heliostats are flat or slightly curved mirrors mounted on two-axis trackers. Control systems calculate required angles using solar position and the law of reflection. Concentrated light heats molten salt that stores energy for 24-hour generation.',
    stats: [
      { value: '1000°C', label: 'Receiver temp', icon: '⚡' },
      { value: '10,000+', label: 'Heliostats', icon: '📈' },
      { value: '$6.2B', label: 'CSP market', icon: '🚀' }
    ],
    examples: ['Ivanpah Solar Plant', 'Crescent Dunes Tower', 'Noor Ouarzazate', 'Gemasolar'],
    companies: ['BrightSource', 'SolarReserve', 'Abengoa', 'ACWA Power'],
    futureImpact: 'Falling photovoltaic costs challenge CSP, but its thermal storage capability makes it valuable for providing dispatchable solar power after sunset.',
    color: '#F59E0B'
  },
  {
    icon: '🌙',
    title: 'Lunar Laser Ranging',
    short: 'Measuring Earth-Moon distance',
    tagline: 'Corner reflectors on the Moon',
    description: 'Apollo astronauts left retroreflector arrays on the Moon. These corner-cube reflectors use the law of reflection to send laser beams straight back to Earth. Scientists measure the round-trip time to track Earth-Moon distance to millimeter precision.',
    connection: 'Corner reflectors work because of the law of reflection applied twice (or three times in 3D). Light entering any angle exits parallel to its entry direction—directly back toward the source.',
    howItWorks: 'Ground stations fire short laser pulses at the Moon. Retroreflectors return photons along the same path. Timing the round trip gives distance to ±1mm. Data reveals lunar orbit details, tests general relativity, and measures continental drift.',
    stats: [
      { value: '1mm', label: 'Distance precision', icon: '⚡' },
      { value: '2.5s', label: 'Round trip time', icon: '📈' },
      { value: '384,400km', label: 'Mean distance', icon: '🚀' }
    ],
    examples: ['Apollo 11 retroreflector', 'Apache Point Observatory', 'Grasse laser station', 'LURE facility'],
    companies: ['NASA', 'McDonald Observatory', 'OCA France', 'JPL'],
    futureImpact: 'New retroreflectors on future lunar missions will enable even more precise measurements, improving tests of gravitational physics and lunar interior models.',
    color: '#10B981'
  }
];

const realWorldApplications = [
  {
    id: 'mirrors',
    title: 'Bathroom Mirrors',
    subtitle: 'Why you see yourself',
    description: 'Flat mirrors create virtual images that appear to be behind the mirror. Every light ray from your face reflects according to the law, and your brain traces them back to where they seem to originate - creating your reflection at the same distance behind as you are in front.',
    formula: 'Object distance = Image distance (for flat mirrors)',
    realExample: 'Your reflection appears the same size as you and the same distance behind the mirror as you stand in front.',
    interactiveHint: 'Touch your mirror - your reflection\'s finger meets yours exactly at the glass surface!'
  },
  {
    id: 'periscopes',
    title: 'Periscopes',
    subtitle: 'Seeing around corners',
    description: 'Submarines and tanks use two 45 degree mirrors to redirect light. Each mirror turns the light 90 degrees, allowing you to see above water or over walls while staying hidden below.',
    formula: '45 degrees + 45 degrees = 90 degree turn x 2 = light redirected by 180 degrees',
    realExample: 'Submarine periscopes can be 30+ feet tall, using precision mirrors to see the surface from deep underwater.',
    interactiveHint: 'Make a simple periscope with two small mirrors at 45 degrees in a cardboard tube!'
  },
  {
    id: 'kaleidoscopes',
    title: 'Kaleidoscopes',
    subtitle: 'Infinite reflections',
    description: 'Multiple mirrors at specific angles create stunning patterns through repeated reflections. Two mirrors at 60 degrees create 5 reflections, at 45 degrees create 7 reflections. The pattern depends on the angle between mirrors.',
    formula: 'Number of images = (360 degrees/angle) - 1',
    realExample: 'A kaleidoscope with mirrors at 60 degrees creates hexagonal patterns with 5 mirror images.',
    interactiveHint: 'Stand between two parallel mirrors - you\'ll see infinite copies of yourself!'
  },
  {
    id: 'solar',
    title: 'Solar Concentrators',
    subtitle: 'Harnessing sunlight',
    description: 'Solar power plants use arrays of mirrors (heliostats) to reflect sunlight onto a central tower. Each mirror is precisely angled so that incident sunlight reflects to the focal point, concentrating energy to generate electricity.',
    formula: 'All reflected rays converge at focal point',
    realExample: 'The Ivanpah Solar Plant uses 173,500 heliostats to generate 392 MW of electricity.',
    interactiveHint: 'A magnifying glass focuses light by bending it; solar concentrators do the same with reflection!'
  }
];

const quizQuestions = [
  {
    question: "What is the Law of Reflection?",
    options: [
      { text: "Light always reflects straight back", correct: false },
      { text: "Angle of incidence equals angle of reflection", correct: true },
      { text: "Light bends when it reflects", correct: false },
      { text: "Reflection only works with flat surfaces", correct: false }
    ],
    explanation: "The Law of Reflection states that the angle of incidence (incoming) equals the angle of reflection (outgoing), both measured from the normal (perpendicular line)."
  },
  {
    question: "Angles in reflection are measured from what reference line?",
    options: [
      { text: "The mirror surface", correct: false },
      { text: "The horizontal", correct: false },
      { text: "The normal (perpendicular to surface)", correct: true },
      { text: "The vertical", correct: false }
    ],
    explanation: "Both angles are measured from the normal - an imaginary line perpendicular to the mirror surface at the point where light hits."
  },
  {
    question: "If light hits a mirror at 0 degrees to the normal, at what angle does it reflect?",
    options: [
      { text: "90 degrees", correct: false },
      { text: "45 degrees", correct: false },
      { text: "180 degrees", correct: false },
      { text: "0 degrees", correct: true }
    ],
    explanation: "If light comes straight in (0 degrees to normal), it bounces straight back (0 degrees on the other side). This is called normal incidence."
  },
  {
    question: "Why does a flat mirror create a 'virtual' image?",
    options: [
      { text: "The image is blurry", correct: false },
      { text: "The image doesn't really exist where it appears to be", correct: true },
      { text: "The image is upside down", correct: false },
      { text: "The image is smaller than the object", correct: false }
    ],
    explanation: "A virtual image is where light rays APPEAR to come from when traced backward. No actual light exists behind the mirror - it's an optical illusion created by your brain."
  },
  {
    question: "In a flat mirror, how does the image distance compare to the object distance?",
    options: [
      { text: "Image is closer", correct: false },
      { text: "Image is farther", correct: false },
      { text: "They are equal", correct: true },
      { text: "Depends on mirror size", correct: false }
    ],
    explanation: "For a flat mirror, the virtual image appears exactly as far behind the mirror as the object is in front. This is why your reflection seems to be inside the mirror."
  },
  {
    question: "Two mirrors are placed at 90 degrees to form a corner. Light enters at 30 degrees to one mirror. What angle does it exit?",
    options: [
      { text: "30 degrees in the same direction", correct: false },
      { text: "30 degrees but going back the way it came", correct: true },
      { text: "60 degrees", correct: false },
      { text: "90 degrees", correct: false }
    ],
    explanation: "A corner reflector (90 degree angle) always sends light back parallel to its incoming direction. After two reflections, the exit angle equals the entry angle but in the opposite direction."
  },
  {
    question: "Why are corner cube reflectors used on road signs?",
    options: [
      { text: "They're cheaper to make", correct: false },
      { text: "They look prettier", correct: false },
      { text: "They reflect light back to the source regardless of entry angle", correct: true },
      { text: "They absorb less light", correct: false }
    ],
    explanation: "Corner cubes (three 90 degree mirrors) are retroreflectors - they send light back exactly where it came from. Car headlights reflect straight back to the driver's eyes."
  },
  {
    question: "If you place two parallel mirrors facing each other, how many images do you see?",
    options: [
      { text: "2", correct: false },
      { text: "4", correct: false },
      { text: "Infinite (theoretically)", correct: true },
      { text: "1", correct: false }
    ],
    explanation: "Parallel mirrors create infinite reflections! Each image reflects in the other mirror, creating images of images. In practice, light loss limits how many you can see."
  },
  {
    question: "A periscope uses two mirrors at what angle?",
    options: [
      { text: "30 degrees", correct: false },
      { text: "45 degrees", correct: true },
      { text: "60 degrees", correct: false },
      { text: "90 degrees", correct: false }
    ],
    explanation: "Periscope mirrors are at 45 degrees to the vertical. Light hits at 45 degrees and reflects at 45 degrees, turning 90 degrees. Two such mirrors redirect light by 180 degrees, allowing you to see around corners."
  },
  {
    question: "If mirrors are at 60 degree angle, how many images will you see between them?",
    options: [
      { text: "3", correct: false },
      { text: "4", correct: false },
      { text: "5", correct: true },
      { text: "6", correct: false }
    ],
    explanation: "The formula is: Number of images = (360 degrees/angle) - 1. For 60 degrees: (360/60) - 1 = 6 - 1 = 5 images. This is the principle behind kaleidoscopes."
  }
];

// ============================================================================
// TEST QUESTIONS - Scenario-based multiple choice for Test phase
// ============================================================================

const testQuestions = [
  {
    scenario: "You are setting up a laser pointer to demonstrate reflection for a science class. The laser beam hits a flat mirror at 35 degrees from the normal line.",
    question: "At what angle from the normal will the reflected beam travel?",
    options: [
      { id: 'a', label: "55 degrees, because the angles must add up to 90 degrees" },
      { id: 'b', label: "35 degrees, on the opposite side of the normal", correct: true },
      { id: 'c', label: "70 degrees, because reflection doubles the incident angle" },
      { id: 'd', label: "35 degrees, on the same side of the normal" }
    ],
    explanation: "The Law of Reflection states that the angle of incidence equals the angle of reflection, both measured from the normal (perpendicular line). The reflected ray is always on the opposite side of the normal from the incident ray, so the beam reflects at 35 degrees on the other side."
  },
  {
    scenario: "A child stands 2 meters in front of a large flat mirror in a dance studio. She notices her reflection appears to be standing inside the mirror.",
    question: "How far behind the mirror surface does her reflection appear to be?",
    options: [
      { id: 'a', label: "1 meter, because mirrors cut distances in half" },
      { id: 'b', label: "4 meters, because the light travels there and back" },
      { id: 'c', label: "2 meters, the same distance she stands in front", correct: true },
      { id: 'd', label: "0 meters, because the image is on the mirror surface" }
    ],
    explanation: "In a flat mirror, the virtual image always appears at the same distance behind the mirror as the object is in front. Since she stands 2 meters in front, her reflection appears 2 meters behind the mirror surface. This is why your reflection seems to be 'inside' the mirror at a matching distance."
  },
  {
    scenario: "A submarine captain needs to observe ships on the ocean surface while the submarine remains safely underwater. The ship uses a periscope with two mirrors.",
    question: "At what angle must each periscope mirror be positioned relative to the vertical tube?",
    options: [
      { id: 'a', label: "45 degrees, so each mirror turns the light 90 degrees", correct: true },
      { id: 'b', label: "90 degrees, so the mirrors are horizontal" },
      { id: 'c', label: "30 degrees, to minimize light loss" },
      { id: 'd', label: "60 degrees, for optimal viewing angle" }
    ],
    explanation: "Periscope mirrors are positioned at 45 degrees to the vertical. When light hits a mirror at 45 degrees from the normal, it reflects at 45 degrees on the other side, creating a 90-degree turn. Two such mirrors redirect light by 180 degrees total, allowing horizontal viewing from a vertical offset."
  },
  {
    scenario: "A highway engineer is designing road signs that will be visible to drivers at night. The signs use retroreflective material containing tiny corner cube reflectors.",
    question: "Why do corner cube retroreflectors make road signs so effective at night?",
    options: [
      { id: 'a', label: "They absorb headlight beams and re-emit the light as a glow" },
      { id: 'b', label: "They scatter light in all directions so everyone can see them" },
      { id: 'c', label: "They reflect light directly back toward the car's headlights and driver", correct: true },
      { id: 'd', label: "They magnify the headlight beams to appear brighter" }
    ],
    explanation: "Corner cube retroreflectors use three mutually perpendicular mirrors (like the corner of a room). Through successive reflections, light always returns parallel to its incoming direction, sending headlight beams directly back to the driver. This makes signs appear brilliantly lit without requiring external power."
  },
  {
    scenario: "An art museum displays a painting under special lighting. When viewed from different positions, the painting looks uniformly bright, but a mirror on a nearby wall shows a distinct bright spot that moves as you walk.",
    question: "What causes this difference between the painting surface and the mirror?",
    options: [
      { id: 'a', label: "The painting absorbs all light while the mirror reflects it" },
      { id: 'b', label: "The painting exhibits diffuse reflection while the mirror exhibits specular reflection", correct: true },
      { id: 'c', label: "The mirror is curved while the painting is flat" },
      { id: 'd', label: "The painting is illuminated from multiple angles while the mirror is not" }
    ],
    explanation: "Diffuse reflection occurs when light hits a rough surface and scatters in many directions, making the object visible from all angles without bright spots. Specular reflection from smooth surfaces like mirrors reflects light at a single angle (equal to incidence), creating a bright spot only visible from one direction. The painting's textured surface causes diffuse reflection."
  },
  {
    scenario: "A toy kaleidoscope uses two mirrors arranged at 60 degrees to each other. A child looks through it and sees a beautiful symmetrical pattern of colored beads.",
    question: "How many images of a single bead will the child see in the kaleidoscope?",
    options: [
      { id: 'a', label: "2 images, one from each mirror" },
      { id: 'b', label: "3 images, forming a triangle" },
      { id: 'c', label: "5 images, forming a hexagonal pattern", correct: true },
      { id: 'd', label: "Infinite images, like parallel mirrors" }
    ],
    explanation: "The number of images formed by two plane mirrors at angle θ is given by (360°/θ) - 1. For mirrors at 60 degrees: (360/60) - 1 = 6 - 1 = 5 images. These 5 images plus the original object create the characteristic 6-fold symmetry seen in kaleidoscopes, forming hexagonal patterns."
  },
  {
    scenario: "A precision manufacturing facility uses a laser alignment system to ensure machine components are perfectly straight. The laser bounces off several mirrors positioned along a 50-meter assembly line.",
    question: "If the first mirror is misaligned by just 0.5 degrees, how much will the laser beam deviate from its intended path at a target 10 meters away?",
    options: [
      { id: 'a', label: "About 8.7 cm, because the reflection angle doubles the error", correct: true },
      { id: 'b', label: "About 4.4 cm, matching the 0.5-degree error over 10 meters" },
      { id: 'c', label: "About 17.4 cm, because errors multiply at each reflection" },
      { id: 'd', label: "Negligible, because 0.5 degrees is too small to matter" }
    ],
    explanation: "When a mirror tilts by 0.5 degrees, the reflected beam deviates by 1 degree (double the mirror tilt) because both incident and reflected angles change. Over 10 meters, a 1-degree deviation produces approximately 10 × tan(1°) ≈ 0.087 meters or 8.7 cm displacement. This demonstrates why precision mirror alignment is critical in laser systems."
  },
  {
    scenario: "A solar thermal power plant uses thousands of mirrors (heliostats) to concentrate sunlight onto a central tower. Each heliostat must be precisely angled throughout the day as the sun moves across the sky.",
    question: "If the sun is at 30 degrees elevation and a heliostat needs to direct light to a tower directly north, where must the mirror's normal point?",
    options: [
      { id: 'a', label: "Directly at the sun to maximize light capture" },
      { id: 'b', label: "Directly at the tower to aim the reflection" },
      { id: 'c', label: "Halfway between the sun and tower directions", correct: true },
      { id: 'd', label: "Perpendicular to the ground for stability" }
    ],
    explanation: "For light to reflect from sun to tower, the mirror's normal must bisect the angle between incoming sunlight and the desired reflection direction. This is because the angle of incidence equals the angle of reflection, both measured from the normal. The normal points halfway between source and target, requiring continuous adjustment as the sun moves."
  },
  {
    scenario: "A concert hall architect is designing the ceiling to ensure audience members in the back rows can hear the orchestra clearly. Sound waves, like light, follow the law of reflection when bouncing off hard surfaces.",
    question: "How should the ceiling panels above the stage be angled to direct sound toward the back of the hall?",
    options: [
      { id: 'a', label: "Flat and horizontal to reflect sound straight up and back down" },
      { id: 'b', label: "Tilted downward toward the audience, with the normal pointing between stage and back seats", correct: true },
      { id: 'c', label: "Curved inward like a bowl to focus sound at one point" },
      { id: 'd', label: "Angled upward to bounce sound off the back wall first" }
    ],
    explanation: "Sound reflects following the same law as light: angle of incidence equals angle of reflection. To direct sound from the stage to the back seats, ceiling panels must be tilted so their normal (perpendicular) bisects the angle between the sound source (stage) and target (back seats). This creates an acoustic reflection path that reinforces direct sound for distant listeners."
  },
  {
    scenario: "Military stealth aircraft are designed to be nearly invisible to radar. Radar works by detecting radio waves that bounce back from objects. The F-117 Nighthawk uses flat, angled surfaces instead of curves.",
    question: "Why do stealth aircraft use specific angular surfaces rather than smooth curves?",
    options: [
      { id: 'a', label: "Angular surfaces absorb more radar energy than curves" },
      { id: 'b', label: "Flat surfaces at specific angles reflect radar away from the source rather than back to it", correct: true },
      { id: 'c', label: "Curved surfaces create stronger radar returns due to focusing" },
      { id: 'd', label: "Angular construction is lighter and more fuel-efficient" }
    ],
    explanation: "Stealth design exploits the law of reflection. Curved surfaces always have some area with a normal pointing back toward the radar, creating returns. Flat panels angled strategically ensure their normals never point at the radar source, so reflections are directed harmlessly away. Combined with radar-absorbing materials, this dramatically reduces the aircraft's radar cross-section."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LawOfReflectionRenderer: React.FC<LawOfReflectionRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  gamePhase
}) => {
  // Core state - using string phases
  const [phase, setPhase] = useState<Phase>('hook');

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

  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [completedApps, setCompletedApps] = useState<string[]>([]);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive state for simulation
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [showNormal, setShowNormal] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showVirtualImage, setShowVirtualImage] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Animation ref
  const animationRef = useRef<number>();
  const isTransitioningRef = useRef(false);

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
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setIncidentAngle(45);
      setShowVirtualImage(false);
    } else if (newPhase === 'twist_play') {
      setIncidentAngle(30);
    }
  }, [playSound]);

  // Prediction handling
  const handlePredictionSelect = useCallback((optionId: string) => {
    if (showPredictionFeedback || isTransitioningRef.current) return;
    setSelectedPrediction(optionId);
  }, [showPredictionFeedback]);

  const handlePredictionSubmit = useCallback(() => {
    if (!selectedPrediction || showPredictionFeedback || isTransitioningRef.current) return;
    setShowPredictionFeedback(true);
  }, [selectedPrediction, showPredictionFeedback]);

  // Quiz handling
  const handleAnswerSelect = useCallback((index: number) => {
    if (showQuizFeedback || isTransitioningRef.current) return;
    setSelectedAnswer(index);
  }, [showQuizFeedback]);

  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || showQuizFeedback || isTransitioningRef.current) return;
    setShowQuizFeedback(true);
    if (quizQuestions[currentQuestion].options[selectedAnswer]?.correct) {
      setScore(s => s + 1);
    }
  }, [selectedAnswer, showQuizFeedback, currentQuestion]);

  const handleNextQuestion = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowQuizFeedback(false);
    } else {
      goToPhase('mastery');
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [currentQuestion, goToPhase]);

  // Application navigation with sequential unlock
  const handleCompleteApp = useCallback((appId: string) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (!completedApps.includes(appId)) {
      setCompletedApps(prev => [...prev, appId]);
    }

    if (currentAppIndex < realWorldApplications.length - 1) {
      setCurrentAppIndex(i => i + 1);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [completedApps, currentAppIndex]);

  const canAccessQuiz = completedApps.length >= realWorldApplications.length;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) => {
    const bgColor = variant === 'primary' ? colors.primary
      : variant === 'success' ? colors.success
      : 'transparent';
    const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: variant === 'secondary' ? colors.primary : colors.text,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: radius.md,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          zIndex: 10,
          position: 'relative' as const,
        }}
      >
        {label}
      </button>
    );
  };

  // ============================================================================
  // REFLECTION VISUALIZATION
  // ============================================================================

  const renderReflectionSimulation = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 320;
    const mirrorY = simHeight / 2 + 40;
    const centerX = simWidth / 2;
    const rayLength = 100;

    // Convert angle for SVG
    const incidentRad = incidentAngle * Math.PI / 180;
    const reflectedRad = incidentRad; // Same angle for reflection

    // Calculate ray endpoints
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
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="mirrorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#88c0d0" />
              <stop offset="50%" stopColor="#5e81ac" />
              <stop offset="100%" stopColor="#88c0d0" />
            </linearGradient>
            <pattern id="mirrorReflect" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#2e3440" />
              <line x1="0" y1="0" x2="20" y2="20" stroke="#4c566a" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Area above mirror (real space) */}
          <rect x={0} y={0} width={simWidth} height={mirrorY} fill="transparent" />
          <text x={20} y={30} fill={colors.textSecondary} fontSize={12}>Real Space</text>

          {/* Area below mirror (virtual space - shown faded) */}
          {showVirtualImage && (
            <>
              <rect x={0} y={mirrorY} width={simWidth} height={simHeight - mirrorY}
                    fill="url(#mirrorReflect)" opacity={0.3} />
              <text x={20} y={mirrorY + 30} fill={colors.textSecondary} fontSize={12} opacity={0.6}>
                Virtual Space (behind mirror)
              </text>
            </>
          )}

          {/* Mirror surface */}
          <rect x={50} y={mirrorY - 3} width={simWidth - 100} height={6}
                fill="url(#mirrorGrad)" />
          <rect x={50} y={mirrorY + 3} width={simWidth - 100} height={10}
                fill="#4c566a" />

          {/* Normal line (dashed) */}
          {showNormal && (
            <>
              <line
                x1={centerX}
                y1={mirrorY - 120}
                x2={centerX}
                y2={mirrorY + 60}
                stroke={colors.textSecondary}
                strokeWidth={1}
                strokeDasharray="5,5"
              />
              <text x={centerX + 5} y={mirrorY - 105} fill={colors.textSecondary} fontSize={10}>
                Normal
              </text>
            </>
          )}

          {/* Angle arcs */}
          {showAngles && (
            <>
              {/* Incident angle arc */}
              <path
                d={`M ${centerX} ${mirrorY - 30} A 30 30 0 0 0 ${centerX - 30 * Math.sin(incidentRad)} ${mirrorY - 30 * Math.cos(incidentRad)}`}
                fill="none"
                stroke={colors.warning}
                strokeWidth={2}
              />
              <text
                x={centerX - 55}
                y={mirrorY - 40}
                fill={colors.warning}
                fontSize={12}
              >
                Oi = {incidentAngle} deg
              </text>

              {/* Reflected angle arc */}
              <path
                d={`M ${centerX} ${mirrorY - 30} A 30 30 0 0 1 ${centerX + 30 * Math.sin(reflectedRad)} ${mirrorY - 30 * Math.cos(reflectedRad)}`}
                fill="none"
                stroke={colors.success}
                strokeWidth={2}
              />
              <text
                x={centerX + 35}
                y={mirrorY - 40}
                fill={colors.success}
                fontSize={12}
              >
                Or = {incidentAngle} deg
              </text>
            </>
          )}

          {/* Incident ray */}
          <line
            x1={incidentStart.x}
            y1={incidentStart.y}
            x2={hitPoint.x}
            y2={hitPoint.y}
            stroke="#ffd700"
            strokeWidth={3}
          />
          {/* Arrow for incident */}
          <polygon
            points={`${hitPoint.x},${hitPoint.y} ${hitPoint.x - 8},${hitPoint.y - 15} ${hitPoint.x + 4},${hitPoint.y - 12}`}
            fill="#ffd700"
            transform={`rotate(${incidentAngle}, ${hitPoint.x}, ${hitPoint.y})`}
          />

          {/* Animated pulse on incident ray */}
          {[0, 1, 2].map(i => {
            const t = (animationTime + i * 0.33) % 1;
            const x = incidentStart.x + (hitPoint.x - incidentStart.x) * t;
            const y = incidentStart.y + (hitPoint.y - incidentStart.y) * t;
            return (
              <circle
                key={`inc-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill="#ffd700"
                opacity={1 - t}
              />
            );
          })}

          {/* Reflected ray */}
          <line
            x1={hitPoint.x}
            y1={hitPoint.y}
            x2={reflectedEnd.x}
            y2={reflectedEnd.y}
            stroke={colors.success}
            strokeWidth={3}
          />
          {/* Arrow for reflected */}
          <polygon
            points={`${reflectedEnd.x},${reflectedEnd.y} ${reflectedEnd.x - 4},${reflectedEnd.y + 12} ${reflectedEnd.x - 12},${reflectedEnd.y + 8}`}
            fill={colors.success}
            transform={`rotate(${-incidentAngle}, ${reflectedEnd.x}, ${reflectedEnd.y})`}
          />

          {/* Animated pulse on reflected ray */}
          {[0, 1, 2].map(i => {
            const t = ((animationTime - 0.5 + i * 0.33) % 1 + 1) % 1;
            if (animationTime < 0.5 && i === 0) return null;
            const x = hitPoint.x + (reflectedEnd.x - hitPoint.x) * t;
            const y = hitPoint.y + (reflectedEnd.y - hitPoint.y) * t;
            return (
              <circle
                key={`ref-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill={colors.success}
                opacity={1 - t}
              />
            );
          })}

          {/* Hit point indicator */}
          <circle cx={hitPoint.x} cy={hitPoint.y} r={6} fill={colors.primary}>
            <animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Virtual image line (extended behind mirror) */}
          {showVirtualImage && (
            <>
              <line
                x1={hitPoint.x}
                y1={hitPoint.y}
                x2={hitPoint.x - Math.sin(incidentRad) * 80}
                y2={hitPoint.y + Math.cos(incidentRad) * 80}
                stroke={colors.warning}
                strokeWidth={2}
                strokeDasharray="5,3"
                opacity={0.5}
              />
              <text
                x={hitPoint.x - 80}
                y={mirrorY + 70}
                fill={colors.warning}
                fontSize={10}
                opacity={0.7}
              >
                Virtual ray (traced back)
              </text>
            </>
          )}

          {/* Labels */}
          <text x={incidentStart.x - 40} y={incidentStart.y - 5} fill="#ffd700" fontSize={11}>
            Incident
          </text>
          <text x={reflectedEnd.x + 5} y={reflectedEnd.y - 5} fill={colors.success} fontSize={11}>
            Reflected
          </text>
          <text x={simWidth / 2 - 20} y={mirrorY + 25} fill={colors.primary} fontSize={11}>
            Mirror
          </text>
        </svg>

        {/* Law display */}
        <div style={{
          textAlign: 'center',
          marginTop: spacing.lg,
          padding: spacing.md,
          background: colors.background,
          borderRadius: radius.md,
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.primary,
            fontFamily: 'monospace',
          }}>
            Oi = Or
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: spacing.xl,
            marginTop: spacing.sm,
          }}>
            <div>
              <span style={{ color: colors.warning }}>Incident: </span>
              <span style={{ color: colors.text, fontWeight: '600' }}>{incidentAngle} deg</span>
            </div>
            <div>
              <span style={{ color: colors.success }}>Reflected: </span>
              <span style={{ color: colors.text, fontWeight: '600' }}>{incidentAngle} deg</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCornerReflector = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 320;
    const cornerX = simWidth / 2;
    const cornerY = simHeight / 2 + 40;

    // First hit on horizontal mirror
    const rayStart = { x: cornerX - 120, y: cornerY - 80 };
    const hit1 = { x: cornerX - 40, y: cornerY };

    // Second hit on vertical mirror
    const hit2Y = cornerY - 60;
    const hit2X = cornerX;

    // After two 90 degree reflections, light returns parallel to original
    const finalEnd = {
      x: cornerX - 120,
      y: hit2Y
    };

    return (
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="mirrorGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#88c0d0" />
              <stop offset="50%" stopColor="#5e81ac" />
              <stop offset="100%" stopColor="#88c0d0" />
            </linearGradient>
          </defs>

          {/* Horizontal mirror */}
          <rect x={cornerX - 100} y={cornerY - 3} width={100} height={6}
                fill="url(#mirrorGrad2)" />
          <rect x={cornerX - 100} y={cornerY + 3} width={100} height={8}
                fill="#4c566a" />

          {/* Vertical mirror */}
          <rect x={cornerX - 3} y={cornerY - 100} width={6} height={100}
                fill="url(#mirrorGrad2)" />

          {/* Corner point */}
          <circle cx={cornerX} cy={cornerY} r={5} fill={colors.accent} />

          {/* Normals */}
          {showNormal && (
            <>
              {/* Normal to horizontal */}
              <line
                x1={hit1.x} y1={cornerY - 50}
                x2={hit1.x} y2={cornerY + 30}
                stroke={colors.textSecondary}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              {/* Normal to vertical */}
              <line
                x1={cornerX - 50} y1={hit2Y}
                x2={cornerX + 30} y2={hit2Y}
                stroke={colors.textSecondary}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </>
          )}

          {/* Incoming ray */}
          <line
            x1={rayStart.x}
            y1={rayStart.y}
            x2={hit1.x}
            y2={hit1.y}
            stroke="#ffd700"
            strokeWidth={3}
          />
          <polygon
            points={`${hit1.x},${hit1.y} ${hit1.x - 10},${hit1.y - 10} ${hit1.x - 5},${hit1.y - 15}`}
            fill="#ffd700"
          />

          {/* First reflection (to vertical mirror) */}
          <line
            x1={hit1.x}
            y1={hit1.y}
            x2={hit2X}
            y2={hit2Y}
            stroke={colors.secondary}
            strokeWidth={3}
          />

          {/* Second reflection (back out) */}
          <line
            x1={hit2X}
            y1={hit2Y}
            x2={finalEnd.x}
            y2={finalEnd.y}
            stroke={colors.success}
            strokeWidth={3}
          />
          <polygon
            points={`${finalEnd.x},${finalEnd.y} ${finalEnd.x + 15},${finalEnd.y - 5} ${finalEnd.x + 15},${finalEnd.y + 5}`}
            fill={colors.success}
          />

          {/* Animated pulses */}
          {[0, 1].map(i => {
            const t = (animationTime * 0.5 + i * 0.5) % 1;
            let x, y;
            if (t < 0.33) {
              const segment = t / 0.33;
              x = rayStart.x + (hit1.x - rayStart.x) * segment;
              y = rayStart.y + (hit1.y - rayStart.y) * segment;
            } else if (t < 0.66) {
              const segment = (t - 0.33) / 0.33;
              x = hit1.x + (hit2X - hit1.x) * segment;
              y = hit1.y + (hit2Y - hit1.y) * segment;
            } else {
              const segment = (t - 0.66) / 0.34;
              x = hit2X + (finalEnd.x - hit2X) * segment;
              y = hit2Y + (finalEnd.y - hit2Y) * segment;
            }
            return (
              <circle
                key={`pulse-${i}`}
                cx={x}
                cy={y}
                r={5}
                fill={t < 0.33 ? '#ffd700' : t < 0.66 ? colors.secondary : colors.success}
              />
            );
          })}

          {/* Angle labels */}
          {showAngles && (
            <>
              <text x={hit1.x - 30} y={cornerY - 55} fill={colors.warning} fontSize={11}>
                {incidentAngle} deg
              </text>
              <text x={hit1.x + 5} y={cornerY - 55} fill={colors.secondary} fontSize={11}>
                {incidentAngle} deg
              </text>
              <text x={cornerX - 45} y={hit2Y - 10} fill={colors.secondary} fontSize={11}>
                {90 - incidentAngle} deg
              </text>
              <text x={cornerX - 45} y={hit2Y + 20} fill={colors.success} fontSize={11}>
                {90 - incidentAngle} deg
              </text>
            </>
          )}

          {/* Labels */}
          <text x={rayStart.x - 10} y={rayStart.y - 10} fill="#ffd700" fontSize={11}>
            In
          </text>
          <text x={finalEnd.x - 10} y={finalEnd.y - 10} fill={colors.success} fontSize={11}>
            Out (parallel!)
          </text>
          <text x={cornerX + 10} y={cornerY + 20} fill={colors.accent} fontSize={11}>
            90 deg corner
          </text>
        </svg>

        {/* Explanation */}
        <div style={{
          textAlign: 'center',
          marginTop: spacing.lg,
          padding: spacing.md,
          background: colors.background,
          borderRadius: radius.md,
        }}>
          <div style={{ color: colors.success, fontWeight: '600', marginBottom: spacing.xs }}>
            Retroreflection!
          </div>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
            After two 90 degree reflections, light returns <strong>parallel</strong> to its original direction.
            <br/>
            Entry angle = {incidentAngle} deg - Exit angle = {incidentAngle} deg (opposite direction)
          </p>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
      }}>
        <label style={{
          color: colors.warning,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Incident Angle: {incidentAngle} deg
        </label>
        <input
          type="range"
          min={5}
          max={85}
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <button
          onClick={() => setShowNormal(!showNormal)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: showNormal ? colors.primary : colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
            zIndex: 10,
            position: 'relative' as const,
          }}
        >
          Normal Line
        </button>
        <button
          onClick={() => setShowAngles(!showAngles)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: showAngles ? colors.secondary : colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
            zIndex: 10,
            position: 'relative' as const,
          }}
        >
          Angle Labels
        </button>
        {phase === 'play' && (
          <button
            onClick={() => setShowVirtualImage(!showVirtualImage)}
            style={{
              padding: `${spacing.xs}px ${spacing.md}px`,
              background: showVirtualImage ? colors.accent : colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              color: colors.text,
              fontSize: typography.small.fontSize,
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative' as const,
            }}
          >
            Virtual Image
          </button>
        )}
      </div>
    </div>
  );

  const renderQuickButtons = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      justifyContent: 'center',
    }}>
      {[15, 30, 45, 60, 75].map(angle => (
        <button
          key={angle}
          onClick={() => setIncidentAngle(angle)}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: incidentAngle === angle ? colors.primary : colors.cardBg,
            border: `1px solid ${incidentAngle === angle ? colors.primary : colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.small.fontSize,
            cursor: 'pointer',
            zIndex: 10,
            position: 'relative' as const,
          }}
        >
          {angle} deg
        </button>
      ))}
    </div>
  );

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Mirror's Secret
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the elegant rule that makes mirrors work
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">Angle In = Angle Out</div>

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Every ray of light follows one simple rule
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The same rule lets submarines see above water, makes road signs glow, and helps measure the Moon!
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                The simplest law with the biggest impact
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10, position: 'relative' }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Law
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
          Periscopes
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
          Retroreflectors
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
          Lunar Ranging
        </div>
      </div>
    </div>
  );

  const renderPredict = () => {
    const pred = predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          Make Your Prediction
        </h2>
        <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          {pred.question}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          {pred.options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handlePredictionSelect(opt.id)}
              style={{
                padding: spacing.lg,
                background: selectedPrediction === opt.id
                  ? `linear-gradient(135deg, ${colors.primary}33, ${colors.secondary}33)`
                  : colors.cardBg,
                border: `2px solid ${selectedPrediction === opt.id ? colors.primary : colors.border}`,
                borderRadius: radius.lg,
                cursor: showPredictionFeedback ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>{opt.icon}</div>
              <p style={{ color: colors.text, margin: 0 }}>{opt.text}</p>
            </div>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{
            padding: spacing.lg,
            background: selectedPrediction === pred.correct
              ? `${colors.success}22`
              : `${colors.warning}22`,
            border: `1px solid ${selectedPrediction === pred.correct ? colors.success : colors.warning}`,
            borderRadius: radius.lg,
            marginBottom: spacing.lg,
          }}>
            <h3 style={{
              color: selectedPrediction === pred.correct ? colors.success : colors.warning,
              marginBottom: spacing.sm,
            }}>
              {selectedPrediction === pred.correct ? 'Perfect!' : 'Let\'s explore this!'}
            </h3>
            <p style={{ color: colors.text, margin: 0 }}>{pred.explanation}</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          {!showPredictionFeedback ? (
            renderButton('Lock In Prediction', handlePredictionSubmit, 'primary', !selectedPrediction)
          ) : (
            renderButton('See It In Action', () => goToPhase('play'))
          )}
        </div>
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        Reflection Playground
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        Change the angle and watch how incidence always equals reflection.
      </p>

      {renderReflectionSimulation()}
      {renderControls()}
      {renderQuickButtons()}

      <div style={{ textAlign: 'center' }}>
        {renderButton('I Understand This', () => goToPhase('review'))}
      </div>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
        The Law of Reflection
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>The Fundamental Law</h3>

        <div style={{
          textAlign: 'center',
          padding: spacing.lg,
          background: colors.background,
          borderRadius: radius.md,
          marginBottom: spacing.lg,
        }}>
          <div style={{ fontSize: '32px', color: colors.primary, fontFamily: 'monospace' }}>
            Oi = Or
          </div>
          <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
            Angle of incidence = Angle of reflection
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: spacing.md,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>RULER</div>
            <div style={{ color: colors.text, fontWeight: '600' }}>Measured from Normal</div>
            <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
              Not from the mirror surface!
            </p>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>ROTATE</div>
            <div style={{ color: colors.text, fontWeight: '600' }}>Same Plane</div>
            <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
              Incident, reflected, and normal all in one plane
            </p>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: spacing.xs }}>GHOST</div>
            <div style={{ color: colors.text, fontWeight: '600' }}>Virtual Images</div>
            <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.small.fontSize }}>
              Appear behind the mirror (not really there!)
            </p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        {renderButton('What\'s the Twist?', () => goToPhase('twist_predict'))}
      </div>
    </div>
  );

  const renderTwistPredict = () => {
    const pred = predictions.twist;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          Corner Magic
        </h2>
        <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          {pred.question}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          {pred.options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handlePredictionSelect(opt.id)}
              style={{
                padding: spacing.lg,
                background: selectedPrediction === opt.id
                  ? `linear-gradient(135deg, ${colors.primary}33, ${colors.secondary}33)`
                  : colors.cardBg,
                border: `2px solid ${selectedPrediction === opt.id ? colors.primary : colors.border}`,
                borderRadius: radius.lg,
                cursor: showPredictionFeedback ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>{opt.icon}</div>
              <p style={{ color: colors.text, margin: 0 }}>{opt.text}</p>
            </div>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{
            padding: spacing.lg,
            background: selectedPrediction === pred.correct
              ? `${colors.success}22`
              : `${colors.warning}22`,
            border: `1px solid ${selectedPrediction === pred.correct ? colors.success : colors.warning}`,
            borderRadius: radius.lg,
            marginBottom: spacing.lg,
          }}>
            <h3 style={{
              color: selectedPrediction === pred.correct ? colors.success : colors.warning,
              marginBottom: spacing.sm,
            }}>
              {selectedPrediction === pred.correct ? 'Perfect!' : 'Let\'s explore this!'}
            </h3>
            <p style={{ color: colors.text, margin: 0 }}>{pred.explanation}</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          {!showPredictionFeedback ? (
            renderButton('Lock In Prediction', handlePredictionSubmit, 'primary', !selectedPrediction)
          ) : (
            renderButton('See It In Action', () => goToPhase('twist_play'))
          )}
        </div>
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        Corner Reflector Lab
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        Watch how two 90 degree mirrors send light back the way it came!
      </p>

      {renderCornerReflector()}
      {renderControls()}

      <div style={{
        background: `${colors.accent}22`,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>Apollo Connection</h3>
        <p style={{ color: colors.text, margin: 0 }}>
          Astronauts left corner cube reflectors on the Moon. We bounce lasers off them to
          measure Earth-Moon distance to within centimeters! The laser returns to Earth after
          traveling 770,000 km - only possible because corner reflectors send light back exactly
          where it came from.
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        {renderButton('I Understand This', () => goToPhase('twist_review'))}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
        Retroreflector Geometry
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>Why 90 Degree Corners Work Magic</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.lg,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: spacing.sm }}>2D Corner (2 mirrors)</h4>
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              Light enters at angle O<br/>
              First reflection: O<br/>
              Second reflection: (90 deg - O)<br/>
              <strong style={{ color: colors.success }}>Returns parallel to entry!</strong>
            </p>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
          }}>
            <h4 style={{ color: colors.secondary, marginBottom: spacing.sm }}>3D Corner Cube (3 mirrors)</h4>
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              Works in all 3 dimensions<br/>
              Light returns to source<br/>
              Regardless of entry angle<br/>
              <strong style={{ color: colors.success }}>True retroreflection!</strong>
            </p>
          </div>
        </div>

        <div style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          background: colors.background,
          borderRadius: radius.md,
          textAlign: 'center',
        }}>
          <p style={{ color: colors.text, margin: 0 }}>
            <span style={{ fontSize: '24px' }}>CAR</span> This is why bike reflectors and road signs
            are visible from any angle - <strong style={{ color: colors.accent }}>they reflect light
            straight back to your headlights!</strong>
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        {renderButton('See Real Applications', () => goToPhase('transfer'))}
      </div>
    </div>
  );

  const renderTransfer = () => {
    const currentApp = realWorldApplications[currentAppIndex];

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
          Reflection in the Real World
        </h2>

        {/* App navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}>
          {realWorldApplications.map((app, index) => {
            const isCompleted = completedApps.includes(app.id);
            const isCurrent = index === currentAppIndex;
            const isLocked = index > 0 && !completedApps.includes(realWorldApplications[index - 1].id);

            return (
              <div
                key={app.id}
                onClick={() => {
                  if (!isLocked && !isTransitioningRef.current) {
                    setCurrentAppIndex(index);
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCurrent ? colors.primary : isCompleted ? colors.success : colors.cardBg,
                  border: `2px solid ${isCurrent ? colors.primary : isCompleted ? colors.success : colors.border}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.4 : 1,
                  transition: 'all 0.3s ease',
                  fontSize: '16px',
                  color: colors.text,
                }}
              >
                {isLocked ? 'X' : isCompleted ? 'OK' : index + 1}
              </div>
            );
          })}
        </div>

        {/* Current application card */}
        <div style={{
          background: colors.cardBg,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ ...typography.h3, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' }}>
            {currentApp.title}
          </h3>
          <p style={{ color: colors.secondary, textAlign: 'center', marginBottom: spacing.lg }}>
            {currentApp.subtitle}
          </p>

          <p style={{ ...typography.body, color: colors.text, marginBottom: spacing.lg }}>
            {currentApp.description}
          </p>

          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typography.small.fontSize, marginBottom: 4 }}>
              Key Concept:
            </div>
            <code style={{ color: colors.primary }}>{currentApp.formula}</code>
          </div>

          <div style={{
            background: `${colors.success}22`,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.success, marginBottom: 4 }}>Real Example:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.realExample}</p>
          </div>

          <div style={{
            background: `${colors.accent}22`,
            padding: spacing.md,
            borderRadius: radius.md,
          }}>
            <div style={{ color: colors.accent, marginBottom: 4 }}>Try This:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.interactiveHint}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          {!completedApps.includes(currentApp.id) ? (
            renderButton('Got It!', () => handleCompleteApp(currentApp.id), 'success')
          ) : currentAppIndex < realWorldApplications.length - 1 ? (
            renderButton('Next Application', () => setCurrentAppIndex(i => i + 1))
          ) : null}

          {canAccessQuiz && (
            renderButton('Take the Quiz', () => {
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowQuizFeedback(false);
              setScore(0);
              goToPhase('test');
            }, 'success')
          )}
        </div>

        {!canAccessQuiz && (
          <p style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginTop: spacing.md,
            fontSize: typography.small.fontSize,
          }}>
            Complete all {realWorldApplications.length} applications to unlock the quiz
            ({completedApps.length}/{realWorldApplications.length} completed)
          </p>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = quizQuestions[currentQuestion];

    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}>
          <span style={{ color: colors.textSecondary }}>
            Question {currentQuestion + 1} of {quizQuestions.length}
          </span>
          <span style={{ color: colors.success, fontWeight: '600' }}>
            Score: {score}/{currentQuestion + (showQuizFeedback ? 1 : 0)}
          </span>
        </div>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ ...typography.h3, color: colors.text, marginBottom: spacing.lg }}>
            {question.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.correct;
              const showResult = showQuizFeedback;

              let bgColor = colors.background;
              let borderColor = colors.border;

              if (showResult) {
                if (isCorrect) {
                  bgColor = `${colors.success}33`;
                  borderColor = colors.success;
                } else if (isSelected && !isCorrect) {
                  bgColor = `${colors.warning}33`;
                  borderColor = colors.warning;
                }
              } else if (isSelected) {
                bgColor = `${colors.primary}33`;
                borderColor = colors.primary;
              }

              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  style={{
                    padding: spacing.md,
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: radius.md,
                    cursor: showQuizFeedback ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: colors.text }}>{option.text}</span>
                  {showResult && isCorrect && <span style={{ marginLeft: 8 }}>OK</span>}
                  {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 8 }}>X</span>}
                </div>
              );
            })}
          </div>

          {showQuizFeedback && (
            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: `${colors.primary}22`,
              borderRadius: radius.md,
            }}>
              <p style={{ color: colors.text, margin: 0 }}>{question.explanation}</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          {!showQuizFeedback ? (
            renderButton('Submit Answer', handleAnswerSubmit, 'primary', selectedAnswer === null)
          ) : (
            renderButton(
              currentQuestion < quizQuestions.length - 1 ? 'Next Question' : 'See Results',
              handleNextQuestion
            )
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: spacing.lg }}>
          {passed ? 'TROPHY' : 'BOOK'}
        </div>
        <h2 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
          {passed ? 'Reflection Master!' : 'Keep Reflecting!'}
        </h2>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
          maxWidth: 400,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: passed ? colors.success : colors.warning,
            marginBottom: spacing.sm,
          }}>
            {percentage}%
          </div>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {score} out of {quizQuestions.length} correct
          </p>

          <div style={{
            height: 8,
            background: colors.border,
            borderRadius: radius.sm,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: passed ? colors.success : colors.warning,
              borderRadius: radius.sm,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.xl,
          maxWidth: 500,
          margin: '0 auto 24px',
        }}>
          <h3 style={{ color: colors.text, marginBottom: spacing.sm }}>Key Takeaways</h3>
          <ul style={{ color: colors.textSecondary, textAlign: 'left', margin: 0, paddingLeft: 20 }}>
            <li>Law of Reflection: Oi = Or (angles from normal)</li>
            <li>Flat mirrors create virtual images</li>
            <li>Image distance = object distance for flat mirrors</li>
            <li>Corner reflectors return light to its source</li>
            <li>Multiple mirrors can create many images</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!passed && renderButton('Try Again', () => {
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowQuizFeedback(false);
            setScore(0);
            goToPhase('test');
          })}
          {renderButton('Restart Journey', () => {
            setCompletedApps([]);
            setCurrentAppIndex(0);
            goToPhase('hook');
          }, 'secondary')}
          {onBack && renderButton('Back to Menu', onBack, 'secondary')}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderPhaseContent = () => {
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

  const currentIdx = phaseOrder.indexOf(phase);

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
          <span className="text-sm font-semibold text-white/80 tracking-wide">Law of Reflection</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : currentIdx > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10, position: 'relative' }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div className="max-w-4xl mx-auto px-4">
          {renderPhaseContent()}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default LawOfReflectionRenderer;
