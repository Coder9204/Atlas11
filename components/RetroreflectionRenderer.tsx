import React, { useState, useEffect } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '🛣️',
    title: 'Highway Safety Signs',
    short: 'Retroreflective materials make road signs visible in headlight beams at night',
    tagline: 'Signs that shine back at you',
    description: 'Every highway sign visible in your headlights uses retroreflection. Tiny glass beads or prismatic microstructures return light directly back toward its source - your headlights and eyes are nearly collinear, so the sign appears to glow. This technology has prevented countless nighttime accidents since its widespread adoption in the 1960s.',
    connection: 'This game demonstrates how retroreflectors return light to its source regardless of angle - the exact physics that makes road signs visible to every driver on the highway.',
    howItWorks: 'Glass bead retroreflectors focus incoming light at the back surface where it reflects and retraces its path. Prismatic retroreflectors use corner-cube geometry - three mutually perpendicular surfaces that return any ray parallel to its incoming direction. Both achieve 50-100x the brightness of white paint.',
    stats: [
      { value: '100x', label: 'Brighter than white paint', icon: '💡' },
      { value: '500M+', label: 'Signs using retroreflection', icon: '🪧' },
      { value: '$3B', label: 'Retroreflective market', icon: '💰' }
    ],
    examples: ['Stop signs', 'Highway markers', 'Construction signs', 'License plates'],
    companies: ['3M', 'Avery Dennison', 'Nippon Carbide', 'ORAFOL'],
    futureImpact: 'Smart retroreflective materials could embed sensors and change appearance to show real-time traffic or weather information.',
    color: '#EF4444'
  },
  {
    icon: '🚴',
    title: 'Cyclist and Pedestrian Safety',
    short: 'Retroreflective strips on clothing and bikes make people visible to drivers',
    tagline: 'Be seen to be safe',
    description: 'Cyclists, runners, and construction workers rely on retroreflective tape and fabrics to be visible to motorists. Unlike ordinary reflective materials that scatter light in all directions, retroreflectors send light back exactly toward the car headlights - and the driver eyes. This makes the difference between being seen and being invisible.',
    connection: 'The corner-cube and glass bead retroreflection physics in this game explains why properly placed retroreflective gear makes pedestrians 500+ feet visible to drivers.',
    howItWorks: 'Retroreflective fabric contains millions of microscopic glass beads or prisms. Each returns incident light toward its source. Placed on moving limbs (ankles, wrists), the biomotion effect makes the human form immediately recognizable to drivers brains.',
    stats: [
      { value: '500+ ft', label: 'Visibility distance', icon: '👁️' },
      { value: '85%', label: 'Nighttime pedestrian deaths preventable', icon: '⚠️' },
      { value: '$500M', label: 'Safety apparel market', icon: '👷' }
    ],
    examples: ['Running vests', 'Bicycle reflectors', 'Construction vests', 'School crossing guard gear'],
    companies: ['Proviz', 'Reflective Apparel Factory', 'Salzmann', 'Nathan Sports'],
    futureImpact: 'Integration with smart fabrics could add active LED elements that work with retroreflection for even greater visibility.',
    color: '#F59E0B'
  },
  {
    icon: '🌙',
    title: 'Lunar Laser Ranging',
    short: 'Apollo retroreflectors enable millimeter-precision Earth-Moon distance measurement',
    tagline: 'Reflecting lasers from the Moon',
    description: 'Apollo astronauts left corner-cube retroreflector arrays on the Moon that still work today. Scientists bounce laser pulses off these reflectors and measure the round-trip time to calculate Earth-Moon distance with millimeter precision. This has confirmed Einstein general relativity and revealed the Moon is slowly spiraling away from Earth.',
    connection: 'This game shows how corner-cube retroreflectors return light exactly parallel to incoming rays - essential for returning laser light across 384,000 km of space.',
    howItWorks: 'Ground observatories fire short laser pulses at the lunar surface. The retroreflector arrays (100 corner cubes each) return a tiny fraction of photons. Timing the 2.5-second round trip with picosecond precision gives distance measurements accurate to millimeters. Only 1 in 10^17 photons returns.',
    stats: [
      { value: '384,400 km', label: 'Earth-Moon distance', icon: '🌍' },
      { value: '±1 mm', label: 'Measurement precision', icon: '📏' },
      { value: '3.8 cm/yr', label: 'Moon recession rate', icon: '📈' }
    ],
    examples: ['Apollo 11 retroreflector', 'Apollo 14 array', 'Apollo 15 array', 'Lunokhod reflectors'],
    companies: ['NASA', 'ESA', 'Apache Point Observatory', 'Observatoire de la Cote d\'Azur'],
    futureImpact: 'New retroreflector arrays on future lunar missions could improve precision further, testing fundamental physics at even higher accuracy.',
    color: '#6366F1'
  },
  {
    icon: '📏',
    title: 'Surveying and Construction',
    short: 'Prism retroreflectors enable precise distance and angle measurements',
    tagline: 'Building with millimeter precision',
    description: 'Total stations and laser distance meters rely on prism retroreflectors to measure distances with millimeter accuracy over kilometers. A surveyor places prisms at target points; the instrument sends laser pulses that return precisely to the receiver regardless of prism orientation. This enables the precise layouts needed for modern construction.',
    connection: 'The angle-independent return property of corner-cube retroreflectors explored in this game is exactly what makes surveying prisms work from any viewing angle.',
    howItWorks: 'Surveying prisms are precision corner cubes with anti-reflection coatings. The total station measures the time or phase delay of returned light pulses. Combined with precise angle encoders, this gives 3D coordinates of the prism position. Modern instruments achieve sub-millimeter accuracy.',
    stats: [
      { value: '±1 mm', label: 'Distance accuracy', icon: '📐' },
      { value: '5 km', label: 'Maximum range', icon: '📡' },
      { value: '$15B', label: 'Surveying equipment market', icon: '🏗️' }
    ],
    examples: ['Building layout', 'Bridge construction', 'Tunnel surveying', 'Mining measurement'],
    companies: ['Leica Geosystems', 'Trimble', 'Topcon', 'Sokkia'],
    futureImpact: 'GPS-RTK is reducing surveying prism usage, but retroreflectors remain essential for indoor and high-precision applications.',
    color: '#10B981'
  }
];

interface RetroreflectionRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightBeam: '#fbbf24',
  mirror: '#3b82f6',
  retroreflector: '#10b981',
};

const RetroreflectionRenderer: React.FC<RetroreflectionRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const phaseNames = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const initialPhase = phaseProp || gamePhase || 'hook';
  const initialIndex = Math.max(0, phaseNames.indexOf(initialPhase));
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(initialIndex);

  const phase = phaseNames[currentPhaseIndex] as typeof initialPhase;

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const [sourceAngle, setSourceAngle] = useState(30);
  const [viewerAngle, setViewerAngle] = useState(30);
  const [showMirror, setShowMirror] = useState(true);
  const [showRetro, setShowRetro] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const goNext = () => {
    if (currentPhaseIndex < phaseNames.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  const goBack = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(currentPhaseIndex - 1);
    }
  };

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const externalPhase = phaseProp || gamePhase;
    if (externalPhase) {
      const idx = phaseNames.indexOf(externalPhase);
      if (idx !== -1) setCurrentPhaseIndex(idx);
    }
  }, [phaseProp, gamePhase]);

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

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setSourceAngle(prev => {
        const newVal = prev + 1;
        if (newVal > 70) return 10;
        return newVal;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Both reflect light the same way' },
    { id: 'mirror_better', label: 'The mirror reflects more light overall' },
    { id: 'retro_source', label: 'The retroreflector sends light back toward the source' },
    { id: 'retro_scatter', label: 'The retroreflector scatters light in all directions' },
  ];

  const twistPredictions = [
    { id: 'same_brightness', label: 'Both types appear equally bright' },
    { id: 'mirror_bright', label: 'The flat mirror appears brighter' },
    { id: 'retro_bright', label: 'The retroreflector appears brighter from the source position' },
    { id: 'neither', label: 'Neither reflects back to the source' },
  ];

  const transferApplications = [
    {
      title: 'Road Signs and Lane Markers',
      description: 'Highway signs and road markings use tiny glass beads or prisms to reflect headlights back to drivers, making them visible at night. The retroreflective material contains millions of microscopic corner cubes or glass spheres that return light to its source. This works because the driver\'s eyes are positioned very close to the headlights, so reflected light comes directly back toward the viewer. Engineers optimize the bead size and refractive index to maximize brightness at typical viewing angles. Modern retroreflective sheeting can be 50-100 times brighter than ordinary white paint, dramatically improving nighttime visibility and reducing accidents.',
      question: 'Why do road signs seem to glow when your headlights hit them?',
      answer: 'Retroreflective materials send light back toward its source. Since your headlights and eyes are nearly in the same position, the sign reflects your headlights directly back to you, appearing bright. This is the retroreflection principle: light returns parallel to its incoming direction regardless of sign angle.',
    },
    {
      title: 'Lunar Laser Ranging',
      description: 'Apollo astronauts left retroreflector arrays on the Moon. Scientists bounce lasers off them to measure Earth-Moon distance to millimeter precision. The arrays contain corner-cube prisms that return photons exactly parallel to their incoming path. Ground observatories fire powerful laser pulses at the lunar surface; only about 1 in 10^17 photons returns to Earth. By measuring the 2.5-second round-trip time with picosecond precision, scientists track the Moon\'s orbit with millimeter accuracy. This has revealed that the Moon is receding from Earth at 3.8 cm per year and provided tests of general relativity. The retroreflectors still work perfectly after 50+ years in the harsh lunar environment.',
      question: 'Why are retroreflectors essential for measuring Moon distance with lasers?',
      answer: 'A regular mirror would need perfect alignment to return light. Retroreflectors return light parallel to its incoming path from any angle, so the laser pulse comes back to its source regardless of Moon orientation. This angle-independence is crucial because the Moon\'s orientation relative to Earth constantly changes.',
    },
    {
      title: 'Safety Gear and Clothing',
      description: 'Reflective strips on safety vests, running shoes, and bike gear use retroreflective materials to make wearers visible to drivers. Unlike ordinary reflective materials that scatter light diffusely, retroreflectors concentrate reflected light back toward the source - car headlights and thus the driver\'s eyes. This creates a bright reflection visible from hundreds of feet away. The biomotion effect occurs when retroreflective strips are placed on moving joints (wrists, ankles): the brain recognizes the distinctive motion pattern of a human walker or cyclist even when the person themselves is barely visible. Studies show retroreflective gear can make pedestrians visible at 500+ feet compared to just 50 feet for dark clothing.',
      question: 'Why is retroreflective tape more effective than just bright colors at night?',
      answer: 'Bright colors need ambient light to be visible. Retroreflective tape redirects car headlights back to drivers, creating intense brightness from the driver\'s viewpoint even in complete darkness. The retroreflection principle ensures maximum visibility because the reflected light goes exactly where it needs to go: back to the observer.',
    },
    {
      title: 'Surveying and Distance Measurement',
      description: 'Total station surveying instruments use retroreflective prisms as targets. The instrument measures distance by timing reflected laser pulses. Surveyors place prisms at target points and the laser rangefinder automatically locks onto the returned signal. Because retroreflectors work from any angle, the prism doesn\'t need precise alignment - saving enormous time on construction sites. Modern total stations achieve millimeter accuracy over kilometer distances. The retroreflector ensures strong signal return even in bright sunlight and through dust or light fog. Combined with precise angle measurement, this enables 3D coordinate determination for building layout, bridge construction, tunnel surveying, and topographic mapping.',
      question: 'Why do surveyors use retroreflective prisms instead of regular targets?',
      answer: 'Retroreflectors return light to the source regardless of exact alignment. This means the prism doesn\'t need to be perfectly aimed at the instrument, making surveying faster and more reliable. The angle-independent property of corner-cube retroreflectors ensures strong signal return from any prism orientation.',
    },
  ];

  const testQuestions = [
    {
      question: 'Scenario: A driver shines headlights at a road sign at a 30-degree angle. The sign uses retroreflective material instead of flat mirror coating. What happens to the light?',
      options: [
        { text: 'Light reflects away at 30 degrees to the other side', correct: false },
        { text: 'Light returns toward the driver regardless of sign angle', correct: true },
        { text: 'Light is absorbed by the coating', correct: false },
        { text: 'Light scatters diffusely in all directions', correct: false },
      ],
    },
    {
      question: 'Scenario: You are designing a corner-cube retroreflector for a surveying prism. The core mechanism relies on which geometric principle to return light to its source?',
      options: [
        { text: 'Bending light like a converging lens', correct: false },
        { text: 'Three perpendicular mirror surfaces that each reverse one direction component', correct: true },
        { text: 'Interference between multiple reflected beams', correct: false },
        { text: 'Absorbing photons and re-emitting them toward the source', correct: false },
      ],
    },
    {
      question: 'Scenario: In a physics lab, you shine a laser pointer at a corner-cube retroreflector at 45 degrees to its surface. Where does the reflected beam go?',
      options: [
        { text: 'At 45 degrees to the opposite side (standard mirror law)', correct: false },
        { text: 'Parallel back to the incoming beam, toward the source', correct: true },
        { text: 'The beam is completely absorbed', correct: false },
        { text: 'Scattered randomly in all directions', correct: false },
      ],
    },
    {
      question: 'Scenario: A flat mirror is placed on a road sign. Under what condition would it reflect headlight beams back to the driver?',
      options: [
        { text: 'When light hits at any angle', correct: false },
        { text: 'Only when the light hits perpendicular to the mirror surface', correct: true },
        { text: 'Only when the mirror is curved inward', correct: false },
        { text: 'Only when the light is polarized horizontally', correct: false },
      ],
    },
    {
      question: 'Scenario: Highway engineers replaced flat paint on road signs with retroreflective sheeting. What is the key reason signs are now 50-100x brighter for drivers at night?',
      options: [
        { text: 'The sheeting contains luminescent paint that glows in the dark', correct: false },
        { text: 'Retroreflective materials return headlight light directly back to the driver', correct: true },
        { text: 'The sheeting has built-in LED lights powered by piezoelectricity', correct: false },
        { text: 'The coating amplifies moonlight through fluorescence', correct: false },
      ],
    },
    {
      question: 'Scenario: Apollo 11 left retroreflector arrays on the Moon. Scientists fire laser pulses from Earth and detect the returned signal. What property makes this possible?',
      options: [
        { text: 'The arrays are precisely aimed at Earth and tracked constantly', correct: false },
        { text: 'Retroreflectors return light parallel to incoming rays regardless of orientation angle', correct: true },
        { text: 'The arrays amplify the laser signal before returning it', correct: false },
        { text: 'Special Moon rock materials naturally reflect light back to its source', correct: false },
      ],
    },
    {
      question: 'Scenario: You observe cat\'s eye road markers glowing brightly as your headlights hit them at various angles. What explains the consistent brightness at different viewing angles?',
      options: [
        { text: 'Each marker contains a small battery-powered LED', correct: false },
        { text: 'Retroreflective glass beads or prisms inside return light toward the driver', correct: true },
        { text: 'Moonlight is reflected and amplified by a curved mirror', correct: false },
        { text: 'Phosphorescent paint charges during daylight and glows at night', correct: false },
      ],
    },
    {
      question: 'Scenario: A bicycle rider attaches a standard plastic reflector to their bike. The reflector is most effective because it uses:',
      options: [
        { text: 'A flat polished mirror surface angled at 45 degrees', correct: false },
        { text: 'An array of corner-cube microprisms that return light to drivers', correct: true },
        { text: 'Fluorescent dye that re-emits absorbed UV light as visible light', correct: false },
        { text: 'Miniature LED strips powered by wheel rotation', correct: false },
      ],
    },
    {
      question: 'Scenario: Explain the core geometry that makes corner-cube retroreflection work. Each bounce off the three perpendicular surfaces does what?',
      options: [
        { text: 'Focuses light to a single point like a concave mirror', correct: false },
        { text: 'Reverses one axis component of the light ray direction', correct: true },
        { text: 'Causes light to diffract around the cube edges', correct: false },
        { text: 'Changes the wavelength through Doppler shifting', correct: false },
      ],
    },
    {
      question: 'Scenario: A surveyor uses a total station to measure distance to a prism retroreflector 500 meters away. Why is a retroreflective prism used instead of a flat mirror target?',
      options: [
        { text: 'Retroreflective prisms are cheaper to manufacture than precision mirrors', correct: false },
        { text: 'Prisms return laser light to the instrument without requiring precise angular alignment', correct: true },
        { text: 'Retroreflective prisms only function in bright daylight conditions', correct: false },
        { text: 'Flat mirrors would measure angles rather than distances', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;
    const centerY = height / 2;

    // Calculate mirror reflection (angle in = angle out)
    const mirrorReflectAngle = -sourceAngle;

    // Calculate angles in radians
    const sourceRad = (sourceAngle * Math.PI) / 180;
    const mirrorReflectRad = (mirrorReflectAngle * Math.PI) / 180;

    // Positions
    const lightSourceX = 100;
    const lightSourceY = centerY - 20;
    const viewerX = 100;
    const viewerY = centerY + 60;

    const mirrorX = 320;
    const mirrorY = centerY - 70;

    const retroX = 320;
    const retroY = centerY + 100;

    // Mirror hit point
    const mirrorHitX = mirrorX + 60;
    const mirrorHitY = mirrorY;

    // Retro hit point
    const retroHitX = retroX + 70;
    const retroHitY = retroY;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #030712 0%, #0a0f1a 50%, #030712 100%)', borderRadius: '12px', maxWidth: '700px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium light source gradient - sun/lamp effect */}
            <radialGradient id="retroLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Light source housing gradient */}
            <linearGradient id="retroLightHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Flat mirror surface gradient - reflective metal */}
            <linearGradient id="retroMirrorSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#93c5fd" />
              <stop offset="80%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Mirror frame gradient */}
            <linearGradient id="retroMirrorFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Corner cube retroreflector gradient - glass prism effect */}
            <linearGradient id="retroCornerCubeGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>

            {/* Corner cube face gradients for 3D effect */}
            <linearGradient id="retroCubeFace1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="retroCubeFace2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="retroCubeFace3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>

            {/* Retroreflector housing gradient */}
            <linearGradient id="retroHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="30%" stopColor="#047857" />
              <stop offset="70%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* Light beam gradient - incoming */}
            <linearGradient id="retroBeamIncoming" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Light beam gradient - returned (green) */}
            <linearGradient id="retroBeamReturned" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="1" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>

            {/* Light beam gradient - reflected away (dimmer yellow) */}
            <linearGradient id="retroBeamReflectedAway" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>

            {/* Eye/viewer gradient */}
            <radialGradient id="retroEyeGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </radialGradient>

            {/* Eye sclera gradient */}
            <radialGradient id="retroEyeSclera" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </radialGradient>

            {/* Lab background gradient */}
            <linearGradient id="retroLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Glow filter for light source */}
            <filter id="retroLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for light beams */}
            <filter id="retroBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for returned beam */}
            <filter id="retroReturnGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass reflection effect */}
            <filter id="retroGlassShine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Mirror shine effect */}
            <filter id="retroMirrorShine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Interactive point filter */}
            <filter id="interactiveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="retroArrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
            </marker>
            <marker id="retroArrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
            </marker>

            {/* Grid pattern for lab background */}
            <pattern id="retroLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="4 4" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#retroLabBg)" />
          <rect width={width} height={height} fill="url(#retroLabGrid)" opacity="0.3" />

          {/* Optical table base */}
          <rect x="10" y={height - 40} width={width - 20} height="35" rx="4" fill="#111827" />
          <rect x="10" y={height - 40} width={width - 20} height="4" fill="#1f2937" />

          {/* === PREMIUM LIGHT SOURCE === */}
          <g transform={`translate(${lightSourceX}, ${lightSourceY})`}>
            {/* Housing */}
            <rect x="-35" y="-30" width="70" height="60" rx="8" fill="url(#retroLightHousing)" stroke="#475569" strokeWidth="1.5" />
            <rect x="-30" y="-25" width="60" height="50" rx="6" fill="#1e293b" opacity="0.3" />

            {/* Lens/emitter */}
            <circle cx="20" cy="0" r="18" fill="url(#retroLightSourceGlow)" opacity="0.9">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="20" cy="0" r="12" fill="#fef3c7" opacity="0.9" />
            <circle cx="20" cy="0" r="6" fill="#ffffff" />

            {/* Power indicator */}
            <circle cx="-20" cy="20" r="4" fill="#22c55e">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="-42" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">LIGHT SOURCE</text>
          </g>

          {/* === PREMIUM VIEWER/OBSERVER === */}
          <g transform={`translate(${viewerX}, ${viewerY})`}>
            {/* Eye sclera (white) */}
            <ellipse cx="0" cy="0" rx="22" ry="14" fill="url(#retroEyeSclera)" stroke="#cbd5e1" strokeWidth="1" />

            {/* Iris */}
            <circle cx="3" cy="0" r="10" fill="url(#retroEyeGradient)" />

            {/* Pupil */}
            <circle cx="3" cy="0" r="5" fill="#1e293b" />

            {/* Eye highlight */}
            <circle cx="6" cy="-3" r="2.5" fill="#ffffff" opacity="0.9" />
            <circle cx="1" cy="2" r="1" fill="#ffffff" opacity="0.5" />

            {/* Eyelids hint */}
            <path d="M -22 0 Q 0 -18 22 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
            <path d="M -22 0 Q 0 18 22 0" fill="none" stroke="#94a3b8" strokeWidth="1" />

            {/* Label */}
            <text x="0" y="-25" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">OBSERVER</text>
          </g>

          {/* === FLAT MIRROR SECTION === */}
          {showMirror && (
            <g>
              {/* Section label */}
              <rect x={mirrorX - 20} y="25" width="120" height="20" rx="4" fill="rgba(59, 130, 246, 0.2)" />
              <text x={mirrorX + 40} y="39" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">FLAT MIRROR</text>

              {/* Mirror frame */}
              <rect x={mirrorX + 45} y={mirrorY - 55} width="35" height="110" rx="6" fill="url(#retroMirrorFrame)" stroke="#4b5563" strokeWidth="1" />

              {/* Mirror surface */}
              <rect x={mirrorX + 52} y={mirrorY - 48} width="12" height="96" fill="url(#retroMirrorSurface)" filter="url(#retroMirrorShine)" rx="2" />

              {/* Reflection lines on mirror */}
              <line x1={mirrorX + 54} y1={mirrorY - 40} x2={mirrorX + 62} y2={mirrorY - 35} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />
              <line x1={mirrorX + 54} y1={mirrorY - 20} x2={mirrorX + 62} y2={mirrorY - 15} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.4" />
              <line x1={mirrorX + 54} y1={mirrorY + 10} x2={mirrorX + 62} y2={mirrorY + 15} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />

              {/* Normal line (perpendicular to mirror) */}
              <line
                x1={mirrorX + 58} y1={mirrorY - 60}
                x2={mirrorX + 58} y2={mirrorY + 60}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
              <text x={mirrorX + 75} y={mirrorY - 50} fill="#64748b" fontSize="11">Normal</text>

              {/* Incident ray to mirror */}
              <line
                x1={lightSourceX + 40}
                y1={lightSourceY}
                x2={mirrorHitX}
                y2={mirrorHitY}
                stroke="#fbbf24"
                strokeWidth="4"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Interactive point at mirror hit - moves with angle */}
              <circle
                cx={mirrorHitX}
                cy={mirrorHitY + sourceAngle * 0.5}
                r="8"
                fill="#fbbf24"
                opacity="0.6"
                filter="url(#interactiveGlow)"
              />

              {/* Reflected ray from mirror (goes AWAY from viewer) */}
              <line
                x1={mirrorHitX}
                y1={mirrorHitY}
                x2={mirrorHitX + 120 * Math.cos(mirrorReflectRad)}
                y2={mirrorHitY - 120 * Math.sin(mirrorReflectRad)}
                stroke="#fbbf24"
                strokeWidth="3"
                opacity="0.5"
                strokeDasharray="10,5"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Angle indicators */}
              <path
                d={`M ${mirrorHitX + 20} ${mirrorHitY} A 20 20 0 0 0 ${mirrorHitX} ${mirrorHitY - 20}`}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={mirrorHitX + 25} y={mirrorHitY - 15} fill="#fbbf24" fontSize="11">i</text>

              <path
                d={`M ${mirrorHitX + 20 * Math.cos(mirrorReflectRad)} ${mirrorHitY - 20 * Math.sin(mirrorReflectRad)} A 20 20 0 0 0 ${mirrorHitX} ${mirrorHitY - 20}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={mirrorHitX - 5} y={mirrorHitY - 25} fill="#f59e0b" fontSize="11">r</text>

              {/* Miss indicator - absolute position */}
              {(() => {
                const mx = mirrorHitX + 140 * Math.cos(mirrorReflectRad);
                const my = mirrorHitY - 140 * Math.sin(mirrorReflectRad) + 30;
                return (
                  <g>
                    <rect x={mx - 40} y={my - 10} width="80" height="20" rx="4" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
                    <text x={mx} y={my + 5} textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">MISS</text>
                  </g>
                );
              })()}

              {/* Physics note */}
              <text x={mirrorX + 40} y={mirrorY + 80} textAnchor="middle" fill="#64748b" fontSize="11">angle in = angle out</text>
            </g>
          )}

          {/* === RETROREFLECTOR SECTION === */}
          {showRetro && (
            <g>
              {/* Section label */}
              <rect x={retroX - 20} y={retroY - 90} width="140" height="20" rx="4" fill="rgba(16, 185, 129, 0.2)" />
              <text x={retroX + 50} y={retroY - 76} textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold">CORNER CUBE RETROREFLECTOR</text>

              {/* Retroreflector housing */}
              <rect x={retroX + 40} y={retroY - 50} width="80" height="100" rx="8" fill="url(#retroHousing)" stroke="#059669" strokeWidth="1.5" />

              {/* Corner cube prism visualization - 3D effect */}
              <g transform={`translate(${retroX + 55}, ${retroY - 30})`}>
                {/* Back face */}
                <polygon points="0,0 50,0 50,60 0,60" fill="url(#retroCubeFace3)" stroke="#10b981" strokeWidth="1" />

                {/* Left face */}
                <polygon points="0,0 0,60 -15,45 -15,-15" fill="url(#retroCubeFace1)" stroke="#10b981" strokeWidth="1" filter="url(#retroGlassShine)" />

                {/* Top face */}
                <polygon points="0,0 50,0 35,-15 -15,-15" fill="url(#retroCubeFace2)" stroke="#10b981" strokeWidth="1" filter="url(#retroGlassShine)" />

                {/* Corner edges - the key geometry */}
                <line x1="0" y1="0" x2="-15" y2="-15" stroke="#34d399" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2="60" stroke="#34d399" strokeWidth="2" />
                <line x1="0" y1="0" x2="50" y2="0" stroke="#34d399" strokeWidth="2" />

                {/* Corner vertex highlight */}
                <circle cx="0" cy="0" r="4" fill="#6ee7b7" opacity="0.8" />

                {/* Glass microbeads visualization (array of small spheres) */}
                {[10, 25, 40].map((x, i) => (
                  [15, 35].map((y, j) => (
                    <circle key={`bead-${i}-${j}`} cx={x} cy={y} r="6" fill="url(#retroCornerCubeGlass)" stroke="#34d399" strokeWidth="0.5" opacity="0.7" />
                  ))
                ))}
              </g>

              {/* Incident ray to retroreflector */}
              <line
                x1={lightSourceX + 40}
                y1={lightSourceY + 30}
                x2={retroHitX}
                y2={retroHitY}
                stroke="#fbbf24"
                strokeWidth="4"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Interactive point at retro hit - moves with angle */}
              <circle
                cx={retroHitX}
                cy={retroHitY + sourceAngle * 0.5}
                r="9"
                fill="#10b981"
                opacity="0.6"
                filter="url(#interactiveGlow)"
              />

              {/* Internal reflection path visualization */}
              <g opacity="0.8">
                <polyline
                  points={`${retroHitX},${retroHitY} ${retroHitX + 25},${retroHitY - 15} ${retroHitX + 35},${retroHitY + 10} ${retroHitX + 20},${retroHitY + 5}`}
                  fill="none"
                  stroke="#fcd34d"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                {/* Bounce points */}
                <circle cx={retroHitX + 25} cy={retroHitY - 15} r="3" fill="#fbbf24" opacity="0.8" />
                <circle cx={retroHitX + 35} cy={retroHitY + 10} r="3" fill="#fbbf24" opacity="0.8" />
              </g>

              {/* Returned ray - PARALLEL to incident, going back to source */}
              <line
                x1={retroHitX}
                y1={retroHitY}
                x2={lightSourceX + 35}
                y2={lightSourceY + 25}
                stroke="#10b981"
                strokeWidth="4"
                filter="url(#retroReturnGlow)"
                markerEnd="url(#retroArrowGreen)"
              />

              {/* Success indicator - absolute position */}
              {(() => {
                const rx2 = (retroHitX + lightSourceX + 35) / 2 - 35;
                const ry2 = (retroHitY + lightSourceY + 25) / 2 + 40;
                return (
                  <g>
                    <rect x={rx2 - 45} y={ry2 - 10} width="90" height="22" rx="6" fill="rgba(16, 185, 129, 0.3)" stroke="#10b981" strokeWidth="1" />
                    <text x={rx2} y={ry2 + 5} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">RETURN</text>
                  </g>
                );
              })()}

              {/* Physics note */}
              <text x={retroX + 60} y={retroY + 68} textAnchor="middle" fill="#64748b" fontSize="11">3 reflections reverse dir</text>
            </g>
          )}

          {/* === PHYSICS EQUATIONS (absolute coords) === */}
          <g>
            <rect x={width - 135} y={height - 80} width="130" height="70" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" strokeWidth="1" />
            <text x={width - 70} y={height - 62} textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">Mirror:</text>
            <text x={width - 70} y={height - 47} textAnchor="middle" fill="#94a3b8" fontSize="11">theta-i = theta-r</text>
            <text x={width - 70} y={height - 32} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">Retro:</text>
            <text x={width - 70} y={height - 17} textAnchor="middle" fill="#94a3b8" fontSize="11">r-out = -r-in</text>
          </g>

          {/* === CALCULATED VALUES (absolute coords) === */}
          <g>
            <rect x="10" y={height - 80} width="130" height="70" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" strokeWidth="1" />
            <text x="18" y={height - 62} fill="#fbbf24" fontSize="11" fontWeight="bold">Angle Values:</text>
            <text x="18" y={height - 47} fill="#94a3b8" fontSize="11">In: {sourceAngle} deg</text>
            <text x="18" y={height - 32} fill="#94a3b8" fontSize="11">Out: {Math.abs(mirrorReflectAngle)} deg</text>
            <text x="18" y={height - 17} fill="#10b981" fontSize="11">Retro: returns</text>
          </g>

          {/* === LEGEND (top center) === */}
          <g transform={`translate(${width / 2 - 140}, 8)`}>
            <rect x="-5" y="-4" width="290" height="26" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
            <rect x="5" y="2" width="14" height="14" rx="3" fill="#fbbf24" />
            <text x="25" y="13" fill="#94a3b8" fontSize="11">Incoming light</text>
            <rect x="140" y="2" width="14" height="14" rx="3" fill="#10b981" />
            <text x="160" y="13" fill="#94a3b8" fontSize="11">Returned light</text>
          </g>

          {/* Comparison divider */}
          {showMirror && showRetro && (
            <g>
              <line x1={width / 2} y1="42" x2={width / 2} y2={height - 55} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px', maxWidth: '700px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Angle'}
            </button>
            <button
              onClick={() => { setSourceAngle(30); setIsAnimating(false); setShowMirror(true); setShowRetro(true); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              Reset View
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '600', lineHeight: 1.5 }}>
          Light Source Angle: {sourceAngle} degrees
        </label>
        <input
          type="range"
          min="10"
          max="70"
          step="5"
          value={sourceAngle}
          onChange={(e) => setSourceAngle(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>10°</span>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>70°</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showMirror} onChange={(e) => setShowMirror(e.target.checked)} />
          Show Mirror
        </label>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showRetro} onChange={(e) => setShowRetro(e.target.checked)} />
          Show Retroreflector
        </label>
      </div>
      <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1))', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
          <strong style={{ color: colors.accent }}>Notice:</strong> The mirror reflects at the opposite angle, missing the source. The retroreflector always returns light to the source because each of its three perpendicular reflections reverses one component of the light's direction!
        </div>
      </div>
    </div>
  );

  const renderProgressDots = () => {
    const dotLabels = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    return (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        {dotLabels.map((label, i) => (
          <button
            key={i}
            aria-label={label}
            onClick={() => setCurrentPhaseIndex(i)}
            style={{
              minHeight: '44px',
              padding: '18px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{
              display: 'block',
              width: i === currentPhaseIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i <= currentPhaseIndex ? colors.accent : 'rgba(148,163,184,0.7)',
              transition: 'all 0.3s ease',
              boxShadow: i <= currentPhaseIndex ? `0 0 8px ${colors.accentGlow}` : 'none'
            }} />
          </button>
        ))}
      </div>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    const isHookPhase = currentPhaseIndex === 0;
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.95) 20%, rgba(15, 23, 42, 0.98) 100%)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, boxShadow: '0 -4px 12px rgba(0,0,0,0.3)' }}>
        <button
          onClick={goBack}
          disabled={isHookPhase}
          aria-label="Back"
          style={{
            minHeight: '44px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: `2px solid ${isHookPhase ? 'rgba(148,163,184,0.3)' : colors.textMuted}`,
            background: 'transparent',
            color: isHookPhase ? 'rgba(148,163,184,0.3)' : colors.textSecondary,
            fontWeight: '600',
            cursor: isHookPhase ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            opacity: isHookPhase ? 0.4 : 1,
          }}
        >
          Back
        </button>
        {renderProgressDots()}
        <button
          onClick={goNext}
          disabled={disabled && !canProceed}
          aria-label="Next"
          style={{
            minHeight: '44px',
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(148,163,184,0.3)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            boxShadow: canProceed ? '0 4px 12px rgba(249, 115, 22, 0.4)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif'
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ color: colors.accent, fontSize: '36px', marginBottom: '12px', fontWeight: '800', lineHeight: 1.4 }}>Welcome to Retroreflection</h1>
            <p style={{ color: colors.textSecondary, fontSize: '20px', marginBottom: '8px', fontWeight: '600', lineHeight: 1.5 }}>Discover how light returns to the source no matter the angle</p>
            <p style={{ color: colors.textMuted, fontSize: '16px', marginBottom: '24px', lineHeight: 1.7 }}>Begin your exploration of the magic geometry of retroreflectors</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', padding: '24px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.8, fontWeight: '700' }}>
                Bike reflectors, road signs, and even mirrors on the Moon all use a special trick: no matter what angle light comes from, it bounces straight back to the source.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', lineHeight: 1.7, fontWeight: '400' }}>
                This is retroreflection - and it uses clever geometry, not magic.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px' }}>
          {renderVisualization(false)}
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700', lineHeight: 1.6 }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              A light source shining on both a flat mirror (top) and a corner-cube retroreflector (bottom). The yellow lines show incoming light, the green lines show returned light. A viewer/eye is positioned near the light source.
            </p>
          </div>
          <div style={{ paddingTop: '16px', paddingBottom: '0' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700', lineHeight: 1.6 }}>Make Your Prediction</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', lineHeight: 1.7 }}>Think carefully: what do you expect will happen when light hits each surface? How do you predict these two reflectors differ?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(249, 115, 22, 0.2))' : 'rgba(30, 41, 59, 0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: 1.6,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: prediction === p.id ? '0 4px 12px rgba(249, 115, 22, 0.4)' : 'none'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Explore Simulation')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '800', fontSize: '28px', lineHeight: 1.5 }}>Explore Retroreflection</h2>
            <p style={{ color: colors.textSecondary, fontSize: '15px', fontWeight: '500', lineHeight: 1.7 }}>
              This matters in the real world: retroreflection is why road signs, bike reflectors, and lunar retroreflectors work.
              Change the source angle and compare mirror vs retroreflector to understand how geometry determines light behavior.
            </p>
          </div>
          {/* Side-by-side layout: SVG left, controls right */}

          <div style={{

            display: 'flex',

            flexDirection: isMobile ? 'column' : 'row',

            gap: isMobile ? '12px' : '20px',

            width: '100%',

            alignItems: isMobile ? 'center' : 'flex-start',

          }}>

            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>

              {renderVisualization(true)}

            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {renderControls()}

            </div>

          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px', padding: '20px', borderRadius: '12px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700', lineHeight: 1.5 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: '400', lineHeight: 1.9, paddingLeft: '20px', margin: 0 }}>
              <li><strong style={{ fontWeight: '700' }}>Change the source angle</strong> - mirror reflection direction changes, but retroreflector always returns to source</li>
              <li><strong style={{ fontWeight: '700' }}>At steep angles</strong>, mirror light goes far from viewer - this is why flat mirrors don't work for road signs</li>
              <li><strong style={{ fontWeight: '700' }}>Notice the green beam</strong> - retroreflected light always traces back to the observer, no matter the angle</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'See Results')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'retro_source';
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ background: wasCorrect ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.2))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.2))', margin: '16px 0', padding: '24px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '12px', fontWeight: '700', lineHeight: 1.5 }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary, lineHeight: 1.7 }}>The retroreflector always sends light back toward its source because the three perpendicular reflections reverse all direction components!</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontWeight: '700', lineHeight: 1.5 }}>The Physics of Retroreflection</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}><strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Corner-Cube Geometry:</strong> Three mutually perpendicular surfaces form a corner. Light bouncing off all three surfaces has each of its direction components reversed, sending it back parallel to the incoming ray. This means the reason this works is because each reflection flips one axis of the light ray.</p>
              <p style={{ marginBottom: '16px' }}><strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Angle Independence:</strong> Unlike a flat mirror (angle in = angle out), a corner cube returns light parallel to its entry regardless of the entry angle. Therefore, you observed that changing the source angle doesn't affect where the retroreflector sends the light.</p>
              <p><strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Practical Design:</strong> Bike reflectors use arrays of tiny corner cubes molded into plastic. Road signs use glass microbeads that act as tiny spherical retroreflectors.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Explore the Twist')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700', fontSize: '28px', lineHeight: 1.5 }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>Standing next to a car at night with headlights on...</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700', lineHeight: 1.6 }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>Imagine you're a driver with headlights shining on two road signs: one with a regular mirror surface, one with retroreflective material. Both are angled slightly away from perpendicular to your view.</p>
          </div>
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '700', lineHeight: 1.6 }}>Which sign appears brighter to the driver?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.2))' : 'rgba(30, 41, 59, 0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: 1.6,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: twistPrediction === p.id ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test This Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700', fontSize: '28px', lineHeight: 1.5 }}>Test Driver Visibility</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>Compare what the driver sees from each surface type</p>
          </div>
          {/* Side-by-side layout: SVG left, controls right */}

          <div style={{

            display: 'flex',

            flexDirection: isMobile ? 'column' : 'row',

            gap: isMobile ? '12px' : '20px',

            width: '100%',

            alignItems: isMobile ? 'center' : 'flex-start',

          }}>

            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>

              {renderVisualization(true)}

            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {renderControls()}

            </div>

          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.2))', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}`, maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px', fontWeight: '700', lineHeight: 1.5 }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>The mirror reflects light away from the driver at most angles. The retroreflector sends headlight light back to the driver's eyes, appearing brilliantly bright even when the sign isn't perpendicular!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'retro_bright';
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ background: wasCorrect ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.2))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.2))', margin: '16px 0', padding: '24px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '12px', fontWeight: '700', lineHeight: 1.5 }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary, lineHeight: 1.7 }}>The retroreflector appears much brighter from the driver's position because it returns light directly to the source!</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: colors.warning, marginBottom: '16px', fontWeight: '700', lineHeight: 1.5 }}>Why Road Signs Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}><strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Source-Observer Coincidence:</strong> In a car, your eyes are very close to the headlights. Retroreflectors return light to the source - which is almost exactly where your eyes are! This means the reason you saw bright reflections is because your viewing position and light source are nearly the same.</p>
              <p><strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Practical Result:</strong> Road signs covered with retroreflective material appear to "glow" when your headlights hit them, even though they have no internal light source. The brightness comes from your own headlights being returned directly to you. Therefore, this makes nighttime driving much safer.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Retroreflection"
        applications={realWorldApps}
        onComplete={() => setCurrentPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const app = transferApplications[currentTransferApp];
    const isCompleted = transferCompleted.has(currentTransferApp);
    const allCompleted = transferCompleted.size >= transferApplications.length;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ paddingTop: '16px', paddingBottom: '0' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '4px', textAlign: 'center', fontWeight: '800', fontSize: '28px', lineHeight: 1.5 }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '12px', fontSize: '14px', fontWeight: '600', lineHeight: 1.7 }}>
              App {currentTransferApp + 1} of {transferApplications.length}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              {transferApplications.map((_, i) => (
                <div key={i} style={{ width: '32px', height: '6px', borderRadius: '3px', background: transferCompleted.has(i) ? colors.success : i === currentTransferApp ? colors.accent : 'rgba(148,163,184,0.3)', transition: 'all 0.3s ease' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[
                { value: '100x', label: 'Brighter than paint', icon: '💡' },
                { value: '500+ ft', label: 'Visibility distance', icon: '👁️' },
                { value: '384,400 km', label: 'Earth-Moon measured', icon: '🌍' },
                { value: '$15B', label: 'Surveying market', icon: '🏗️' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(30,41,59,0.9)', padding: '12px 16px', borderRadius: '8px', textAlign: 'center', minWidth: '100px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: colors.accent, fontSize: '18px', fontWeight: '800', marginBottom: '2px' }}>{stat.value}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px', lineHeight: 1.4, fontWeight: '500' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '8px 0 16px', padding: '20px', borderRadius: '12px', border: isCompleted ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700', lineHeight: 1.5 }}>{app.title}</h3>
              {isCompleted && <span style={{ color: colors.success, fontWeight: '700', fontSize: '16px' }}>✓ Done</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.8 }}>{app.description}</p>
            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1))', padding: '14px', borderRadius: '8px', marginBottom: '14px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: '700', lineHeight: 1.6, margin: 0 }}>{app.question}</p>
            </div>
            {!isCompleted ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, currentTransferApp]))}
                style={{
                  minHeight: '44px',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${colors.accent}`,
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1))',
                  color: colors.accent,
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease'
                }}
              >
                Got It
              </button>
            ) : (
              <div>
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>{app.answer}</p>
                </div>
                {currentTransferApp < transferApplications.length - 1 ? (
                  <button
                    onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
                    style={{
                      minHeight: '44px',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)'
                    }}
                  >
                    Next App
                  </button>
                ) : null}
              </div>
            )}
          </div>
          {allCompleted && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <button
                onClick={goNext}
                style={{
                  minHeight: '44px',
                  padding: '14px 40px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '800',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)'
                }}
              >
                Take the Test
              </button>
            </div>
          )}
        </div>
        {renderBottomBar(!allCompleted, allCompleted, 'Take the Quiz')}
      </div>
    );
  }

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
          <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
            <div style={{ background: testScore >= 8 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.2))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.2))', margin: '16px 0', padding: '24px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, fontWeight: '700', lineHeight: 1.5 }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: '800' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '700', lineHeight: 1.6 }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '10px 12px', marginBottom: '6px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, lineHeight: 1.6, fontWeight: opt.correct || userAnswer === oIndex ? '600' : '400' }}>{opt.correct ? '✓ Correct:' : userAnswer === oIndex ? '✗ Your answer:' : ''} {opt.text}</div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '24px', lineHeight: 1.5 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: '16px', fontWeight: '600' }}>Question {currentTestQuestion + 1} of 10</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '6px', borderRadius: '3px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(148,163,184,0.3)', cursor: 'pointer', transition: 'all 0.3s ease' }} />
              ))}
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', padding: '24px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '700', lineHeight: 1.7 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(249, 115, 22, 0.2))' : 'rgba(30, 41, 59, 0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: 1.6,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: testAnswers[currentTestQuestion] === oIndex ? '0 4px 12px rgba(249, 115, 22, 0.4)' : 'none'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', gap: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.textMuted}`,
                background: 'rgba(30, 41, 59, 0.5)',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              Previous
            </button>
            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)'
                }}
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: testAnswers.includes(null) ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: testAnswers.includes(null) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '900px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '0', paddingBottom: '16px', width: '100%' }}>
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '12px', fontWeight: '800', fontSize: '32px', lineHeight: 1.4 }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>You understand how retroreflectors return light to its source</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', margin: '16px 0', padding: '24px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontWeight: '700', fontSize: '20px', lineHeight: 1.5 }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.9, paddingLeft: '20px', margin: 0, fontSize: '15px' }}>
              <li>Corner-cube geometry reverses ray direction</li>
              <li>Retroreflection is angle-independent</li>
              <li>Driver sees reflected headlights from road signs</li>
              <li>Lunar ranging uses retroreflector arrays</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  // Default fallback - unique from hook
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', paddingTop: '60px', paddingBottom: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Inter", sans-serif' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ padding: '24px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ color: colors.error, fontSize: '36px', marginBottom: '12px', fontWeight: '800', lineHeight: 1.4 }}>Invalid Phase Configuration</h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', lineHeight: 1.7 }}>Please select a valid game phase to continue. This component requires a phase prop to render properly.</p>
        </div>
      </div>
      {renderBottomBar(false, true, 'Continue')}
    </div>
  );
};

export default RetroreflectionRenderer;
