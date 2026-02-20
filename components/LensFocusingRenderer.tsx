'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Lens Focusing - Complete 10-Phase Game
// The thin lens equation: how lenses form images
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

interface LensFocusingRendererProps {
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
    scenario: "A child uses a magnifying glass to focus sunlight onto a piece of paper. After holding it at different distances, they find one specific distance where the light forms the smallest, brightest spot.",
    question: "Why does the light concentrate into a single bright point at this particular distance?",
    options: [
      { id: 'a', label: "The glass absorbs light at other distances but releases it all at this point" },
      { id: 'b', label: "The convex lens bends parallel light rays so they all converge at the focal point", correct: true },
      { id: 'c', label: "The paper only reflects light when held at the right distance" },
      { id: 'd', label: "Sunlight naturally concentrates itself when passing through any glass" }
    ],
    explanation: "A convex lens has curved surfaces that bend (refract) light rays. Parallel rays from the distant sun are bent inward as they pass through, all converging at a single point called the focal point. This distance from the lens to the focal point is the focal length - a fixed property of each lens determined by its curvature and material."
  },
  {
    scenario: "A jeweler examines a tiny diamond by holding a magnifying glass close to the gem. The diamond appears much larger and right-side up through the lens.",
    question: "What optical condition allows the magnifying glass to create this enlarged, upright image?",
    options: [
      { id: 'a', label: "The diamond must be placed beyond twice the focal length" },
      { id: 'b', label: "The diamond is positioned closer to the lens than the focal length, creating a virtual magnified image", correct: true },
      { id: 'c', label: "The lens flips the image twice so it appears right-side up" },
      { id: 'd', label: "Only precious gems can be magnified this way due to their crystal structure" }
    ],
    explanation: "When an object is placed inside the focal length of a convex lens, the light rays diverge after passing through and cannot form a real image. Instead, your eye traces these diverging rays backward, perceiving a virtual image that appears larger and upright on the same side as the object. This is the fundamental principle behind all magnifying glasses."
  },
  {
    scenario: "A photographer switches from taking a portrait of someone 3 meters away to photographing a mountain on the horizon. They hear the camera lens motor adjusting focus.",
    question: "What physical change does the camera make to achieve sharp focus on objects at different distances?",
    options: [
      { id: 'a', label: "The camera changes the shape of the lens like the human eye does" },
      { id: 'b', label: "The camera adjusts the distance between the lens and sensor to satisfy the thin lens equation", correct: true },
      { id: 'c', label: "The camera adds or removes lens elements from the optical path" },
      { id: 'd', label: "The camera rotates the lens to a different angle" }
    ],
    explanation: "The thin lens equation (1/f = 1/d_object + 1/d_image) dictates that for a fixed focal length, changing the object distance requires changing the image distance to maintain focus. Cameras move the lens closer to the sensor for distant objects and farther from the sensor for close objects. The portrait at 3m needs the lens farther out than the mountain at infinity."
  },
  {
    scenario: "A 50-year-old architect who has always had perfect vision notices they must hold blueprints at arm's length to read them clearly. Their eye doctor prescribes +2.0 diopter reading glasses.",
    question: "What age-related change causes presbyopia, and how do reading glasses correct it?",
    options: [
      { id: 'a', label: "The cornea becomes cloudy; glasses filter out scattered light" },
      { id: 'b', label: "The eye's lens loses flexibility and cannot focus on near objects; converging glasses add the missing focusing power", correct: true },
      { id: 'c', label: "The retina moves backward; glasses project the image farther into the eye" },
      { id: 'd', label: "Eye muscles weaken; glasses magnify text so less muscle effort is needed" }
    ],
    explanation: "With age, the crystalline lens inside the eye becomes stiffer and cannot change shape as much. This reduces the eye's ability to add focusing power for near objects. Reading glasses with positive diopters (converging lenses) add external focusing power, compensating for what the aging lens can no longer provide. +2.0 diopters means a focal length of 0.5 meters."
  },
  {
    scenario: "A wildlife photographer has two lenses: a 24mm wide-angle and a 400mm telephoto. From the same position, they photograph an elephant. The wide-angle shows the elephant small within a vast savanna, while the telephoto fills the frame with just the elephant's face.",
    question: "How does focal length determine what portion of a scene the camera captures?",
    options: [
      { id: 'a', label: "Longer focal lengths physically zoom by moving the lens forward like a telescope" },
      { id: 'b', label: "Shorter focal length = wider field of view and less magnification; longer focal length = narrower field and more magnification", correct: true },
      { id: 'c', label: "Wide-angle lenses have larger glass elements that gather more of the scene" },
      { id: 'd', label: "Focal length only affects brightness, not field of view" }
    ],
    explanation: "Focal length directly determines angular field of view. A short focal length lens bends light more sharply, projecting a wide scene onto the sensor (85 degrees for 24mm). A long focal length bends light gently, projecting a narrow slice of the scene (6 degrees for 400mm). The ratio of focal lengths (400/24 = 17x) roughly equals the magnification difference between the two views."
  },
  {
    scenario: "An optician tests a lens and finds that when a candle is placed 30 cm from the lens, a sharp image forms on a screen 60 cm on the other side. They need to calculate the lens's focal length for the customer's prescription.",
    question: "Using the thin lens equation (1/f = 1/d_o + 1/d_i), what is this lens's focal length?",
    options: [
      { id: 'a', label: "45 cm - the average of object and image distances" },
      { id: 'b', label: "20 cm - calculated as 1/f = 1/30 + 1/60 gives f = 20 cm", correct: true },
      { id: 'c', label: "90 cm - the sum of both distances" },
      { id: 'd', label: "30 cm - equal to the object distance" }
    ],
    explanation: "Applying the thin lens equation: 1/f = 1/30 + 1/60 = 2/60 + 1/60 = 3/60 = 1/20, so f = 20 cm. This means parallel rays would focus at 20 cm from the lens. The equation works because the focal length is a harmonic mean relationship - it's always less than both the object and image distances for a real image formed by a converging lens."
  },
  {
    scenario: "A microscope uses two converging lenses: an objective lens with f = 4mm positioned near the specimen, and an eyepiece with f = 25mm that the user looks through. The objective creates an intermediate image that the eyepiece then magnifies.",
    question: "Why does using two lenses in series achieve much higher magnification than either lens alone?",
    options: [
      { id: 'a', label: "The lenses add their focal lengths together to create one super-powerful lens" },
      { id: 'b', label: "The total magnification multiplies: the objective magnifies the specimen, then the eyepiece magnifies that already-enlarged image", correct: true },
      { id: 'c', label: "Two lenses cancel each other's aberrations, making the image clearer but not larger" },
      { id: 'd', label: "The second lens reverses the inversion from the first lens" }
    ],
    explanation: "In a compound microscope, magnifications multiply rather than add. If the objective creates a 40x magnified real image, and the eyepiece provides 10x magnification of that image, total magnification is 40 x 10 = 400x. This multiplicative effect is why microscopes can achieve magnifications impossible with a single lens - a 400x single lens would need an impractically short focal length."
  },
  {
    scenario: "A telescope designer notices that stars at the edge of the field appear as small colored smears rather than white points. They add a second lens element made of a different type of glass to correct this problem.",
    question: "What causes this color fringing (chromatic aberration), and how does an achromatic doublet correct it?",
    options: [
      { id: 'a', label: "The glass absorbs some colors; adding different glass absorbs complementary colors" },
      { id: 'b', label: "Different wavelengths refract at different angles; a second lens with opposite dispersion cancels this spreading", correct: true },
      { id: 'c', label: "Stars emit different colors from different parts; the second lens blocks the edge colors" },
      { id: 'd', label: "Temperature differences in the glass cause color shifts; the second lens has opposite thermal properties" }
    ],
    explanation: "Glass bends blue light more than red light (dispersion), so a simple lens has different focal lengths for different colors - blue focuses closer than red, creating colored fringes. An achromatic doublet pairs a converging lens of crown glass with a diverging lens of flint glass. Flint glass has higher dispersion, so the diverging element cancels the color spreading while preserving most of the converging power."
  },
  {
    scenario: "A smartphone camera can lock focus on a face in milliseconds, even as the person moves. The phone uses phase-detection autofocus pixels embedded directly in the image sensor.",
    question: "How do phase-detection autofocus systems determine both the direction and amount of focus adjustment needed?",
    options: [
      { id: 'a', label: "They measure the brightness of the image and adjust until it's maximum" },
      { id: 'b', label: "Paired pixels see light from opposite edges of the lens; the offset between their images indicates focus error direction and magnitude", correct: true },
      { id: 'c', label: "They emit infrared light and measure the time for it to return from the subject" },
      { id: 'd', label: "They compare the current image to stored photos of focused faces" }
    ],
    explanation: "Phase-detection AF uses pairs of masked pixels that each see only half the lens aperture. When in focus, both halves see the same image. When out of focus, the images from left and right lens halves are offset. The direction of offset indicates whether focus is front or back, and the amount of offset indicates how far. This allows single-shot focus correction instead of hunting back and forth."
  },
  {
    scenario: "The Keck Observatory uses a laser to create an artificial 'star' in the upper atmosphere. A sensor measures how this point of light is distorted, and a deformable mirror with hundreds of actuators adjusts its shape 1000 times per second.",
    question: "What fundamental focusing problem does adaptive optics solve, and how?",
    options: [
      { id: 'a', label: "It corrects lens manufacturing defects by measuring a reference star" },
      { id: 'b', label: "It counteracts atmospheric turbulence that randomly bends light, by reshaping the mirror to cancel the distortions in real-time", correct: true },
      { id: 'c', label: "It compensates for the Earth's rotation by continuously moving the telescope" },
      { id: 'd', label: "It filters out light pollution from nearby cities" }
    ],
    explanation: "Earth's atmosphere has turbulent cells of varying temperature and density that bend light randomly, causing stars to twinkle and blur telescope images. Adaptive optics measures these distortions using a reference point source (laser guide star), then deforms a flexible mirror into a shape that exactly cancels the atmospheric aberrations. This happens hundreds of times per second, restoring near-space-quality images from ground-based telescopes."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '📷',
    title: 'Camera Autofocus',
    short: 'Sharp photos in milliseconds',
    tagline: 'Finding focus at the speed of light',
    description: 'Modern cameras use the thin lens equation to calculate where to position lens elements for sharp focus. Phase detection and contrast detection autofocus systems measure image sharpness and drive motors to the exact position where the image plane coincides with the sensor.',
    connection: 'The relationship 1/f = 1/do + 1/di tells cameras exactly where the image forms for any object distance. Autofocus systems solve this equation in reverse - given desired di (sensor position), they adjust lens position to achieve correct do.',
    howItWorks: 'Phase detection AF splits incoming light and compares the two halves to determine focus direction and distance. Contrast AF moves the lens and measures sharpness peaks. Hybrid systems combine both for speed and accuracy.',
    stats: [
      { value: '0.02s', label: 'AF speed', icon: '⚡' },
      { value: '1000+', label: 'AF points', icon: '📈' },
      { value: '$35B', label: 'Market size', icon: '💰' }
    ],
    examples: ['Smartphone portrait mode', 'DSLR action shooting', 'Mirrorless eye tracking', 'Security camera zoom'],
    companies: ['Sony', 'Canon', 'Nikon', 'Apple'],
    futureImpact: 'Computational photography will combine focus stacking and AI to create images with infinite depth of field.',
    color: '#3B82F6'
  },
  {
    icon: '👁️',
    title: 'LASIK Eye Surgery',
    short: 'Reshaping corneas for perfect vision',
    tagline: 'Precision optics meets medicine',
    description: 'LASIK surgery uses excimer lasers to reshape the cornea, changing its focal length. By removing microscopic amounts of tissue, surgeons correct myopia, hyperopia, and astigmatism - effectively creating a custom lens surface on the eye itself.',
    connection: 'The cornea and lens together form an optical system. LASIK changes the cornea\'s radius of curvature, adjusting its contribution to total eye power so images focus correctly on the retina.',
    howItWorks: 'Wavefront analysis maps the eye\'s optical aberrations. A femtosecond laser creates a corneal flap. An excimer laser ablates tissue in a pattern calculated to correct refractive errors. The flap is replaced and heals naturally.',
    stats: [
      { value: '96%', label: 'Success rate', icon: '⚡' },
      { value: '0.25um', label: 'Precision', icon: '📈' },
      { value: '$3.5B', label: 'Market size', icon: '💰' }
    ],
    examples: ['Myopia correction', 'Hyperopia treatment', 'Astigmatism surgery', 'Presbyopia solutions'],
    companies: ['Alcon', 'Johnson & Johnson Vision', 'ZEISS', 'Bausch + Lomb'],
    futureImpact: 'Implantable lenses and corneal inlays will offer reversible vision correction.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Microscope Objectives',
    short: 'Seeing the invisible world',
    tagline: 'Magnification meets resolution',
    description: 'Microscope objectives are complex multi-element lenses designed to minimize aberrations while achieving high magnification. The numerical aperture and focal length determine both magnification and resolution limits.',
    connection: 'Microscope optics apply the thin lens equation at extreme ratios. Very short focal lengths create high magnification, while oil immersion increases numerical aperture to improve resolution beyond what air allows.',
    howItWorks: 'Objectives contain 8-15 lens elements correcting for chromatic and spherical aberration. Immersion oil matches the refractive index of glass, increasing NA. Higher NA means better resolution: d = wavelength/(2NA).',
    stats: [
      { value: '100x', label: 'Max magnification', icon: '⚡' },
      { value: '200nm', label: 'Resolution', icon: '📈' },
      { value: '$7.2B', label: 'Market size', icon: '💰' }
    ],
    examples: ['Medical pathology', 'Semiconductor inspection', 'Cell biology research', 'Quality control'],
    companies: ['ZEISS', 'Olympus', 'Nikon', 'Leica'],
    futureImpact: 'Super-resolution techniques bypass diffraction limits, while AI-enhanced imaging extracts more information from fewer photons.',
    color: '#8B5CF6'
  },
  {
    icon: '🎥',
    title: 'Cinematic Lenses',
    short: 'Hollywood\'s optical magic',
    tagline: 'Storytelling through glass',
    description: 'Cinema lenses are engineered for precise focus control, minimal breathing, and consistent color rendition. Focus pullers use lens markings calibrated to the thin lens equation to smoothly rack focus between actors.',
    connection: 'Cinema lenses have calibrated focus scales showing object distances. The thin lens equation relates these markings to actual lens element positions, enabling repeatable focus pulls.',
    howItWorks: 'Cine lenses have long focus throw (300+ degrees rotation) for precise control. Internal focusing minimizes breathing (focal length change with focus). Matched lens sets maintain consistent color and contrast.',
    stats: [
      { value: '300deg', label: 'Focus throw', icon: '⚡' },
      { value: 'T1.3', label: 'Fast aperture', icon: '📈' },
      { value: '$50K+', label: 'Lens set cost', icon: '💰' }
    ],
    examples: ['Feature film production', 'Television drama', 'Commercial advertising', 'Documentary filming'],
    companies: ['ARRI', 'Cooke', 'Panavision', 'Zeiss'],
    futureImpact: 'Motorized smart lenses with metadata embedding will enable perfect focus tracking and post-production adjustment.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const LensFocusingRenderer: React.FC<LensFocusingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [focalLength, setFocalLength] = useState(80);
  const [objectDistance, setObjectDistance] = useState(160);
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number>();

  // Twist phase - inside focal length scenario
  const [twistObjectDistance, setTwistObjectDistance] = useState(50);

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

  // Animation loop for light pulses
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

  // Calculate image properties using thin lens equation
  const calculateImage = useCallback((objDist: number, fLen: number) => {
    const f = fLen;
    const d_o = objDist;

    // 1/f = 1/d_o + 1/d_i  ->  d_i = (f x d_o) / (d_o - f)
    const d_i = (f * d_o) / (d_o - f);

    // Magnification M = -d_i / d_o
    const M = -d_i / d_o;

    const isReal = d_i > 0;
    const isUpright = M > 0;

    return {
      imageDistance: d_i,
      magnification: M,
      isReal,
      isUpright,
      imageHeight: Math.abs(M) * 40
    };
  }, []);

  const imageData = calculateImage(objectDistance, focalLength);
  const twistImageData = calculateImage(twistObjectDistance, focalLength);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#22d3ee', // Cyan for optics
    accentGlow: 'rgba(34, 211, 238, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#cbd5e1',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
    lens: '#22d3ee',
    ray: '#fbbf24',
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
    twist_play: 'Explore Twist',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'lens-focusing',
        gameTitle: 'Lens Focusing',
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

  // Lens Visualization SVG Component
  const LensVisualization = ({ objDist, fLen, showVirtual = false }: { objDist: number; fLen: number; showVirtual?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = isMobile ? 280 : 320;
    const centerX = width / 2;
    const centerY = height / 2;

    const scale = 1.5;
    const objectX = centerX - objDist * scale / 2;
    const objectHeight = 40;
    const lensX = centerX;

    const imgData = calculateImage(objDist, fLen);
    const imageX = lensX + imgData.imageDistance * scale / 2;
    const focalX_left = lensX - fLen * scale / 2;
    const focalX_right = lensX + fLen * scale / 2;

    const isVirtual = !imgData.isReal;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.1"/>
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.1"/>
          </linearGradient>
          <linearGradient id="objectGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#4ade80"/>
          </linearGradient>
          <linearGradient id="imageGradReal" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#f472b6"/>
          </linearGradient>
          <linearGradient id="imageGradVirtual" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#c084fc"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          {showVirtual ? 'Object Inside Focal Length' : 'Thin Lens Ray Diagram'}
        </text>

        {/* Optical axis */}
        <line x1={20} y1={centerY} x2={width - 20} y2={centerY} stroke="#334155" strokeWidth={1} strokeDasharray="8,4"/>

        {/* Focal points */}
        <circle cx={focalX_left} cy={centerY} r={6} fill="#fbbf24" filter="url(#glow)"/>
        <text x={focalX_left} y={centerY + 18} textAnchor="middle" fill="#fbbf24" fontSize="12">F</text>
        <circle cx={focalX_right} cy={centerY} r={6} fill="#fbbf24" filter="url(#glow)"/>
        <text x={focalX_right} y={centerY + 18} textAnchor="middle" fill="#fbbf24" fontSize="12">F&apos;</text>

        {/* 2F points */}
        <circle cx={focalX_left - fLen * scale / 2} cy={centerY} r={4} fill="#a78bfa" opacity={0.7}/>
        <text x={focalX_left - fLen * scale / 2} y={centerY + 16} textAnchor="middle" fill="#a78bfa" fontSize="11">2F</text>
        <circle cx={focalX_right + fLen * scale / 2} cy={centerY} r={4} fill="#a78bfa" opacity={0.7}/>
        <text x={focalX_right + fLen * scale / 2} y={centerY + 16} textAnchor="middle" fill="#a78bfa" fontSize="11">2F&apos;</text>

        {/* Lens */}
        <ellipse cx={lensX} cy={centerY} rx={12} ry={90} fill="url(#lensGrad)" stroke={colors.lens} strokeWidth={2}/>

        {/* Object */}
        <line x1={objectX} y1={centerY} x2={objectX} y2={centerY - objectHeight} stroke="url(#objectGrad)" strokeWidth={4} strokeLinecap="round"/>
        <polygon
          points={`${objectX},${centerY - objectHeight - 10} ${objectX - 8},${centerY - objectHeight + 2} ${objectX + 8},${centerY - objectHeight + 2}`}
          fill="#4ade80"
        />
        <circle cx={objectX} cy={centerY} r={3} fill="#22c55e"/>

        {/* Ray 1: Parallel to axis, then through F' */}
        <line x1={objectX} y1={centerY - objectHeight} x2={lensX} y2={centerY - objectHeight} stroke="#fbbf24" strokeWidth={2}/>
        {imgData.isReal ? (
          <line
            x1={lensX}
            y1={centerY - objectHeight}
            x2={Math.min(width - 20, imageX)}
            y2={centerY + imgData.imageHeight}
            stroke="#fbbf24"
            strokeWidth={2}
          />
        ) : (
          <>
            <line
              x1={lensX}
              y1={centerY - objectHeight}
              x2={width - 20}
              y2={centerY - objectHeight + (width - 20 - lensX) * (objectHeight / fLen)}
              stroke="#fbbf24"
              strokeWidth={2}
            />
            <line
              x1={lensX}
              y1={centerY - objectHeight}
              x2={Math.max(20, imageX)}
              y2={centerY - imgData.imageHeight}
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="6,4"
              opacity={0.6}
            />
          </>
        )}

        {/* Ray 2: Through center (undeviated) */}
        <line
          x1={objectX}
          y1={centerY - objectHeight}
          x2={lensX}
          y2={centerY}
          stroke="#f472b6"
          strokeWidth={2}
        />
        <line
          x1={lensX}
          y1={centerY}
          x2={imgData.isReal ? Math.min(width - 20, imageX) : width - 20}
          y2={imgData.isReal
            ? centerY + imgData.imageHeight
            : centerY + (width - 20 - lensX) * objectHeight / objDist}
          stroke="#f472b6"
          strokeWidth={2}
        />
        {isVirtual && (
          <line
            x1={lensX}
            y1={centerY}
            x2={Math.max(20, imageX)}
            y2={centerY - imgData.imageHeight}
            stroke="#f472b6"
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.6}
          />
        )}

        {/* Ray 3: Through F, emerges parallel */}
        {objDist > fLen && (
          <>
            <line
              x1={objectX}
              y1={centerY - objectHeight}
              x2={lensX}
              y2={centerY - objectHeight * (objDist - fLen) / objDist}
              stroke="#a78bfa"
              strokeWidth={2}
            />
            <line
              x1={lensX}
              y1={centerY - objectHeight * (objDist - fLen) / objDist}
              x2={width - 20}
              y2={centerY - objectHeight * (objDist - fLen) / objDist}
              stroke="#a78bfa"
              strokeWidth={2}
            />
          </>
        )}

        {/* Image */}
        {imgData.imageDistance > -200 && imgData.imageDistance < 300 && (
          <g opacity={isVirtual ? 0.8 : 1}>
            <line
              x1={Math.max(20, Math.min(width - 20, imageX))}
              y1={centerY}
              x2={Math.max(20, Math.min(width - 20, imageX))}
              y2={isVirtual ? centerY - imgData.imageHeight : centerY + imgData.imageHeight}
              stroke={isVirtual ? "url(#imageGradVirtual)" : "url(#imageGradReal)"}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={isVirtual ? "6,4" : "none"}
            />
            <polygon
              points={`${Math.max(20, Math.min(width - 20, imageX))},${isVirtual ? centerY - imgData.imageHeight - 10 : centerY + imgData.imageHeight + 10} ${Math.max(20, Math.min(width - 20, imageX)) - 8},${isVirtual ? centerY - imgData.imageHeight + 2 : centerY + imgData.imageHeight - 2} ${Math.max(20, Math.min(width - 20, imageX)) + 8},${isVirtual ? centerY - imgData.imageHeight + 2 : centerY + imgData.imageHeight - 2}`}
              fill={isVirtual ? "#c084fc" : "#f472b6"}
              opacity={isVirtual ? 0.8 : 1}
            />
            <circle
              cx={Math.max(20, Math.min(width - 20, imageX))}
              cy={centerY}
              r={3}
              fill={isVirtual ? "#a855f7" : "#ec4899"}
            />
          </g>
        )}

        {/* Light pulses */}
        {[0, 1, 2].map(i => {
          const t = (animationTime * 0.4 + i * 0.33) % 1;
          const x = objectX + (lensX - objectX) * t;
          const y = centerY - objectHeight;
          if (t > 0.95) return null;
          return (
            <circle
              key={`pulse-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill="#fef08a"
              opacity={(1 - t) * 0.8}
            />
          );
        })}

        {/* Info box */}
        <g transform={`translate(${width - 110}, 35)`}>
          <rect x="0" y="0" width="100" height="70" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1"/>
          <text x="50" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="11">Image Distance</text>
          <text x="50" y="35" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="700">
            {imgData.imageDistance.toFixed(0)} px
          </text>
          <text x="50" y="52" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            {imgData.isReal ? 'Real' : 'Virtual'}, {imgData.isUpright ? 'Upright' : 'Inverted'}
          </text>
          <text x="50" y="67" textAnchor="middle" fill={colors.success} fontSize="11">
            M = {imgData.magnification.toFixed(2)}x
          </text>
        </g>
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

  // Bottom bar with Back/Next
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestPhase = phase === 'test';
    const quizComplete = isTestPhase && testSubmitted;
    const canGoNext = !isLast && (!isTestPhase || quizComplete);
    return (
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: `1px solid ${colors.border}`, background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, transition: 'all 0.2s ease', fontWeight: 600 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div key={p} onClick={() => i <= currentIndex && goToPhase(p)} title={phaseLabels[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? colors.accent : i < currentIndex ? colors.success : 'rgba(255,255,255,0.2)', cursor: i <= currentIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? `linear-gradient(135deg, ${colors.accent}, #0891b2)` : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4, transition: 'all 0.2s ease', fontWeight: 700 }}>
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
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

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        height: '100vh',
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontWeight: 400,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔍📸
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Lens Focusing
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "How does a <span style={{ color: colors.accent }}>curved piece of glass</span> create images? From camera lenses to your own eyes, the <span style={{ color: colors.ray }}>thin lens equation</span> governs it all."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '24px', color: colors.accent, marginBottom: '12px', fontFamily: 'monospace' }}>
            1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "This one equation determines where every image forms - from microscopes revealing cells to telescopes showing distant galaxies."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Geometric Optics
          </p>
        </div>

        <p style={{ color: colors.textMuted, fontSize: '12px', maxWidth: '400px', marginBottom: '16px' }}>
          Discover the fundamental optics equation that governs every lens system
        </p>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Exploring
        </button>

        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'When the lens is exactly halfway between candle and wall' },
      { id: 'b', text: 'When the lens is at a specific distance determined by its focal length', correct: true },
      { id: 'c', text: 'Any distance works equally well for focusing' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontWeight: 400,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ fontSize: '14px', color: colors.accent, margin: 0, fontWeight: 600 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens when you hold a magnifying glass between a candle and a wall?
          </h2>

          <svg width="400" height="180" viewBox="0 0 400 180" style={{ display: 'block', margin: '0 auto 20px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.accent} stopOpacity="0.2" />
                <stop offset="50%" stopColor={colors.accent} stopOpacity="0.6" />
                <stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
              </linearGradient>
              <filter id="predictLensGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g className="background"><rect x="0" y="0" width="400" height="180" fill="#0f172a" rx="12" /></g>
            <g className="objects">
              <rect x="30" y="50" width="6" height="80" fill="#f59e0b" rx="2" />
              <circle cx="33" cy="45" r="8" fill="#f59e0b" filter="url(#predictLensGlow)" />
              <text x="20" y="150" fill={colors.textSecondary} fontSize="11">Candle</text>
            </g>
            <g className="lens">
              <ellipse cx="200" cy="90" rx="8" ry="55" fill="url(#lensGrad)" stroke={colors.accent} strokeWidth="2" />
              <text x="180" y="165" fill={colors.accent} fontSize="11" fontWeight="600">Lens</text>
            </g>
            <g className="screen">
              <rect x="360" y="30" width="8" height="120" fill="#64748b" rx="2" />
              <text x="345" y="165" fill={colors.textSecondary} fontSize="11">Screen</text>
            </g>
            <g className="rays">
              <line x1="38" y1="60" x2="192" y2="60" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="208" y1="60" x2="365" y2="120" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="38" y1="120" x2="192" y2="120" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="208" y1="120" x2="365" y2="60" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <text x="340" y="25" fill="#34d399" fontSize="11">Image?</text>
            </g>
          </svg>

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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Lens Simulator
  if (phase === 'play') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Lens Optics Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Thin Lens Equation: 1/f = 1/d_o + 1/d_i. Magnification M = -d_i/d_o.
            Watch how the image changes as you adjust the controls.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '12px' }}>
            When you increase the object distance, the image becomes smaller. When you decrease the focal length, light bends more sharply which affects where the image forms.
            This is why camera lenses are used in photography - adjusting focus allows us to capture sharp images at different distances.
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
            Image distance = {imageData.imageDistance.toFixed(1)} mm | Magnification factor = {imageData.magnification.toFixed(2)}×
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <LensVisualization objDist={objectDistance} fLen={focalLength} />
                </div>

                {/* Stats display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{imageData.imageDistance.toFixed(0)} px</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Image Distance</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>{imageData.magnification.toFixed(2)}x</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Magnification</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: imageData.isReal ? '#f472b6' : '#a855f7' }}>
                      {imageData.isReal ? 'Real' : 'Virtual'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>
                      {imageData.isUpright ? 'Upright' : 'Inverted'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Focal length slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Focal Length (f)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{focalLength} px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={focalLength}
                  onChange={(e) => setFocalLength(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                  }}
                />
              </div>

              {/* Object distance slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Object Dist (d_o)</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>
                    {objectDistance} px
                    {objectDistance < focalLength && <span style={{ color: colors.warning, marginLeft: '4px' }}>(Inside f!)</span>}
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="250"
                  value={objectDistance}
                  onChange={(e) => setObjectDistance(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                  }}
                />
              </div>

              {/* Quick preset buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <button
                  onClick={() => setObjectDistance(focalLength * 2.5)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.bgSecondary,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  d &gt; 2f (small image)
                </button>
                <button
                  onClick={() => setObjectDistance(focalLength * 1.5)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.bgSecondary,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  f &lt; d &lt; 2f (large image)
                </button>
                <button
                  onClick={() => setObjectDistance(focalLength * 0.6)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.warning}`,
                    background: colors.warning + '22',
                    color: colors.warning,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  d &lt; f (magnifier!)
                </button>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {objectDistance < focalLength && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                The object is inside the focal length - notice the virtual, upright, magnified image!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Thin Lens Equation
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
            As you observed in your experiment, the image location depends on where the object is placed relative to the focal length.
            Your prediction about lens focusing was correct - the focal length determines exactly where a sharp image forms!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '28px',
              color: colors.accent,
              textAlign: 'center',
              marginBottom: '20px',
              fontFamily: 'monospace',
            }}>
              1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>f = focal length:</strong> The distance from the lens where parallel rays converge. Determined by lens curvature and material.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>d<sub>o</sub> = object distance:</strong> How far the object is from the lens.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>d<sub>i</sub> = image distance:</strong> Where the image forms. Positive = real image (opposite side), negative = virtual image (same side).
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: Image Location Depends on Object Position
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li><strong>Object beyond 2f:</strong> Smaller, inverted, real image between f and 2f</li>
              <li><strong>Object at 2f:</strong> Same size, inverted, real image at 2f</li>
              <li><strong>Object between f and 2f:</strong> Larger, inverted, real image beyond 2f</li>
              <li><strong>Object at f:</strong> Rays emerge parallel - image at infinity!</li>
              <li style={{ color: colors.warning }}><strong>Object inside f:</strong> Larger, upright, VIRTUAL image</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Magnification: M = -d<sub>i</sub>/d<sub>o</sub>
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The ratio of image size to object size. Negative M means inverted. When |M| &gt; 1, the image is magnified. When |M| &lt; 1, the image is reduced.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Magnifier Effect
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'No image forms at all - the lens cannot focus' },
      { id: 'b', text: 'A smaller, inverted real image forms on the other side' },
      { id: 'c', text: 'A larger, upright virtual image forms - the magnifying glass effect!', correct: true },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ fontSize: '14px', color: colors.warning, margin: 0, fontWeight: 600 }}>
              New Variable: What happens when the object is INSIDE the focal length?
            </p>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '24px' }}>
            Think about using a magnifying glass. What do you expect to see?
          </h2>

          <svg width="400" height="180" viewBox="0 0 400 180" style={{ display: 'block', margin: '0 auto 20px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="twistLensGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.accent} stopOpacity="0.2" />
                <stop offset="50%" stopColor={colors.accent} stopOpacity="0.6" />
                <stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
              </linearGradient>
              <filter id="twistLensGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g className="background"><rect x="0" y="0" width="400" height="180" fill="#0f172a" rx="12" /></g>
            <g className="lens">
              <ellipse cx="250" cy="90" rx="8" ry="55" fill="url(#twistLensGrad)" stroke={colors.accent} strokeWidth="2" />
              <text x="235" y="165" fill={colors.accent} fontSize="11" fontWeight="600">Lens</text>
              <line x1="250" y1="90" x2="310" y2="90" stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" />
              <text x="265" y="85" fill={colors.accent} fontSize="11">f</text>
            </g>
            <g className="object">
              <rect x="200" y="55" width="4" height="70" fill="#f59e0b" rx="2" />
              <circle cx="202" cy="50" r="6" fill="#f59e0b" filter="url(#twistLensGlow)" />
              <text x="185" y="145" fill={colors.textSecondary} fontSize="11">Object</text>
              <text x="175" y="160" fill={colors.warning} fontSize="11">(inside f)</text>
            </g>
            <g className="eye">
              <ellipse cx="370" cy="90" rx="15" ry="10" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="370" cy="90" r="5" fill="#64748b" />
              <text x="355" y="115" fill={colors.textSecondary} fontSize="11">Eye</text>
            </g>
            <g className="rays">
              <line x1="202" y1="60" x2="242" y2="70" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="258" y1="70" x2="360" y2="85" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="202" y1="120" x2="242" y2="110" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="258" y1="110" x2="360" y2="95" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="30" y="90" fill="#34d399" fontSize="11">Virtual image?</text>
            </g>
          </svg>

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
              See the Magnifier Effect
            </button>
          )}
        </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Magnifying Glass Effect
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Place the object inside the focal length and observe the virtual image
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <LensVisualization objDist={twistObjectDistance} fLen={focalLength} showVirtual={true} />
                </div>

                {/* Comparison stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: '#a855f7' }}>
                      Virtual
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Image Type</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>
                      Upright
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Orientation</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>
                      {Math.abs(twistImageData.magnification).toFixed(1)}x
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Magnification</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Object distance slider (constrained to inside f) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Object Distance</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{twistObjectDistance} px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max={focalLength - 5}
                  value={twistObjectDistance}
                  onChange={(e) => setTwistObjectDistance(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Close to lens</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Near focal pt</span>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  f = {focalLength} px (inside focal length)
                </p>
              </div>
            </div>
          </div>

          {twistObjectDistance < focalLength * 0.5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice: Moving the object closer to the lens increases magnification! This is how magnifying glasses work.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Virtual Images
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real vs Virtual Images
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid #f472b6`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📽️</span>
                <h3 style={{ ...typo.h3, color: '#f472b6', margin: 0 }}>Real Images</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Light rays actually converge at the image point. Can be projected onto a screen. Form when object is beyond focal length. Always inverted.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Examples: Camera sensors, projectors, movie screens
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid #a855f7`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔮</span>
                <h3 style={{ ...typo.h3, color: '#a855f7', margin: 0 }}>Virtual Images</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Light rays appear to diverge from the image point but never actually pass through it. Cannot be projected - only seen by looking through the lens. Always upright.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Examples: Magnifying glasses, bathroom mirrors, eyeglasses
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>The Math Tells the Story</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When d<sub>i</sub> comes out <strong>negative</strong> from the thin lens equation, it means the image is virtual - on the same side as the object. When M is <strong>positive</strong>, the image is upright.
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

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Real-World Applications</p>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
                Lens Focusing in Action
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                App {selectedApp + 1} of {realWorldApps.length} {allAppsCompleted && '- All completed!'}
              </p>
            </div>

            {/* App selector */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                    background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>}
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{app.icon}</div>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ color: app.color, fontSize: '14px', fontWeight: 600, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: '20px', lineHeight: 1.7 }}>
                {app.description}
              </p>

              <div style={{
                background: `${app.color}15`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <h4 style={{ fontSize: '14px', color: app.color, marginBottom: '8px', fontWeight: 700 }}>
                  How Lens Physics Connects:
                </h4>
                <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ fontSize: '18px', color: app.color, fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: colors.textSecondary }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  The global optics industry is valued at over $35B. Camera autofocus achieves speeds of 20 ms. LASIK has 96% success rate with 0.25 nm precision. Microscope objectives achieve 200 nm resolution at 100x magnification.
                </p>
              </div>
            </div>

            {/* Got It button */}
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');
                // Auto-advance to next incomplete app
                const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextIncomplete !== -1) {
                  setSelectedApp(nextIncomplete);
                } else {
                  const first = newCompleted.findIndex(c => !c);
                  if (first !== -1) setSelectedApp(first);
                }
              }}
              disabled={completedApps[selectedApp]}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.bgCard : `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
                color: completedApps[selectedApp] ? colors.textSecondary : 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: completedApps[selectedApp] ? 'default' : 'pointer',
                minHeight: '52px',
              }}
            >
              {completedApps[selectedApp] ? '✓ Completed' : 'Got It! Continue'}
            </button>
            <p style={{ textAlign: 'center', color: colors.textSecondary, fontSize: '13px', marginTop: '12px' }}>
              {completedApps.filter(c => c).length} of {realWorldApps.length} completed {allAppsCompleted && '- Ready for test!'}
            </p>
          </div>
        </div>

        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: colors.bgCard, borderTop: `1px solid ${colors.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '72px' }}>
          <button
            onClick={() => goToPhase(phaseOrder[phaseOrder.indexOf(phase) - 1])}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textPrimary,
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px',
            }}
          >
            Back
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i <= phaseOrder.indexOf(phase) && goToPhase(p)}
                title={phaseLabels[p]}
                style={{
                  width: p === phase ? '20px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: p === phase ? colors.accent : i < phaseOrder.indexOf(phase) ? colors.success : 'rgba(255,255,255,0.2)',
                  cursor: i <= phaseOrder.indexOf(phase) ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => allAppsCompleted && nextPhase()}
            disabled={!allAppsCompleted}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              border: 'none',
              background: allAppsCompleted ? `linear-gradient(135deg, ${colors.accent}, #0891b2)` : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: allAppsCompleted ? 'pointer' : 'not-allowed',
              opacity: allAppsCompleted ? 1 : 0.5,
              minHeight: '48px',
            }}
          >
            Take the Test
          </button>
        </nav>
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
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

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
                ? 'You understand lens focusing and image formation!'
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Lens Focusing Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the fundamental optics that power cameras, microscopes, and human vision.
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
              'The thin lens equation: 1/f = 1/d_o + 1/d_i',
              'Real images form when object is beyond f',
              'Virtual images form when object is inside f',
              'Magnification = -d_i / d_o',
              'Focal length determines lens power',
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
    );
  }

  return null;
};

export default LensFocusingRenderer;
