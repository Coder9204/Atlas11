import React, { useState, useEffect, useCallback } from 'react';

interface CameraObscuraRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
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
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightRay: '#fcd34d',
  boxColor: '#475569',
  screenColor: '#f1f5f9',
  objectColor: '#ef4444',
};

const CameraObscuraRenderer: React.FC<CameraObscuraRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography system
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

  // Simulation state
  const [holeSize, setHoleSize] = useState(10);
  const [objectDistance, setObjectDistance] = useState(150);
  const [showRays, setShowRays] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation for hole size
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setHoleSize(prev => {
        const next = prev + 2;
        if (next > 40) return 5;
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'brighter', label: 'The image gets brighter and stays sharp' },
    { id: 'sharper', label: 'The image gets sharper but dimmer' },
    { id: 'brighter_blurry', label: 'The image gets brighter but blurrier' },
    { id: 'nothing', label: 'Nothing changes - the image stays the same' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both hole sizes produce identical images' },
    { id: 'tradeoff', label: 'Small hole = sharp but dim; Large hole = bright but blurry' },
    { id: 'large_better', label: 'The larger hole is always better' },
    { id: 'small_better', label: 'The smaller hole is always better' },
  ];

  const transferApplications = [
    {
      title: 'Pinhole Cameras',
      description: 'The simplest camera uses no lens - just a tiny hole. Light from each point in the scene passes through to create an inverted image.',
      question: 'Why do pinhole cameras produce images without a lens?',
      answer: 'A tiny hole restricts each point in the scene to send rays along nearly a single path. This creates a one-to-one mapping between scene points and image points, forming a sharp (if dim) image.',
    },
    {
      title: 'Eye Pupil Function',
      description: 'Your eye\'s pupil dilates in darkness and constricts in bright light. This isn\'t just about brightness control.',
      question: 'Why does squinting help you see more clearly when you don\'t have your glasses?',
      answer: 'Squinting acts like a smaller pinhole - it reduces the blur from unfocused light. With a smaller aperture, rays from each point travel along narrower paths, improving depth of field and reducing blur from refractive errors.',
    },
    {
      title: 'Solar Eclipse Viewing',
      description: 'During a solar eclipse, you can safely view the sun by projecting its image through a pinhole onto a surface.',
      question: 'Why is a pinhole projection safe for viewing the sun?',
      answer: 'The tiny hole drastically reduces light intensity while still forming an image. Unlike looking directly or through inadequate filters, the projected image is dim enough to view safely while showing the eclipse\'s progress.',
    },
    {
      title: 'Earliest Photography',
      description: 'Before lenses were perfected, the camera obscura principle was used for drawing aids and eventually the first photographs.',
      question: 'Why were early cameras called "camera obscura" (dark room)?',
      answer: 'Artists literally used dark rooms with small holes to project outside scenes onto walls for tracing. "Camera obscura" means "dark chamber" in Latin. The darkness was necessary to see the dim projected image clearly.',
    },
  ];

  const testQuestions = [
    {
      question: 'What happens to the image when you make the pinhole larger?',
      options: [
        { text: 'It becomes brighter and sharper', correct: false },
        { text: 'It becomes brighter but blurrier', correct: true },
        { text: 'It becomes dimmer and sharper', correct: false },
        { text: 'It disappears completely', correct: false },
      ],
    },
    {
      question: 'Why does a smaller pinhole produce a sharper image?',
      options: [
        { text: 'It filters out certain wavelengths of light', correct: false },
        { text: 'It reduces the overlap of rays from different points', correct: true },
        { text: 'It amplifies the light intensity', correct: false },
        { text: 'It changes the focal length', correct: false },
      ],
    },
    {
      question: 'The image formed in a camera obscura is:',
      options: [
        { text: 'Upright and same size as the object', correct: false },
        { text: 'Inverted and reversed left-to-right', correct: true },
        { text: 'Upright but reversed left-to-right', correct: false },
        { text: 'The same orientation as the object', correct: false },
      ],
    },
    {
      question: 'What is the fundamental tradeoff in pinhole imaging?',
      options: [
        { text: 'Color vs. black-and-white', correct: false },
        { text: 'Size vs. distance', correct: false },
        { text: 'Brightness vs. sharpness', correct: true },
        { text: 'Speed vs. quality', correct: false },
      ],
    },
    {
      question: 'Why does squinting help people with vision problems see more clearly?',
      options: [
        { text: 'It moistens the eye', correct: false },
        { text: 'It changes the shape of the lens', correct: false },
        { text: 'It acts like a smaller pinhole, reducing blur', correct: true },
        { text: 'It blocks harmful UV rays', correct: false },
      ],
    },
    {
      question: 'In a camera obscura, light from the top of an object:',
      options: [
        { text: 'Projects to the top of the image', correct: false },
        { text: 'Projects to the bottom of the image', correct: true },
        { text: 'Is blocked by the pinhole', correct: false },
        { text: 'Spreads evenly across the screen', correct: false },
      ],
    },
    {
      question: 'Why is a pinhole camera safe for viewing a solar eclipse?',
      options: [
        { text: 'It filters UV radiation', correct: false },
        { text: 'It greatly reduces the light intensity', correct: true },
        { text: 'It changes the sun\'s wavelength', correct: false },
        { text: 'It only shows infrared light', correct: false },
      ],
    },
    {
      question: 'A larger pinhole causes blur because:',
      options: [
        { text: 'Light waves interfere destructively', correct: false },
        { text: 'Rays from different points overlap on the screen', correct: true },
        { text: 'The light gets too bright to see clearly', correct: false },
        { text: 'The hole acts like a lens', correct: false },
      ],
    },
    {
      question: 'The term "camera obscura" means:',
      options: [
        { text: 'Light chamber', correct: false },
        { text: 'Dark room', correct: true },
        { text: 'Small lens', correct: false },
        { text: 'Inverted image', correct: false },
      ],
    },
    {
      question: 'If you double the distance from object to pinhole (keeping screen distance the same):',
      options: [
        { text: 'The image doubles in size', correct: false },
        { text: 'The image becomes half the size', correct: true },
        { text: 'The image stays the same size', correct: false },
        { text: 'The image disappears', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  // Real-world applications data
  const realWorldApps = [
    {
      icon: 'Camera',
      title: 'Pinhole Photography',
      short: 'Artistic photography using camera obscura principles',
      tagline: 'Where patience meets pure optics',
      description: 'Pinhole photography strips imaging down to its most fundamental form - a tiny aperture creating images without any lens. This minimalist approach produces uniquely ethereal photographs with infinite depth of field, soft focus, and extended exposures that capture the passage of time in a single frame.',
      connection: 'The camera obscura demonstrates exactly how pinhole cameras work: light from every point in a scene passes through the tiny aperture and projects an inverted image on the opposite surface. The smaller the hole, the sharper but dimmer the image - a tradeoff that pinhole photographers embrace artistically.',
      howItWorks: 'A pinhole camera is simply a light-tight box with a tiny hole (typically 0.2-0.5mm) on one side and photographic film or paper on the opposite side. Light travels in straight lines through the aperture, creating an inverted image. Because the hole is so small, exposure times range from seconds to hours, creating dreamy motion blur and unique temporal effects.',
      stats: [
        { value: '0.3mm', label: 'Optimal pinhole diameter for 35mm format' },
        { value: 'Infinite', label: 'Depth of field (everything in focus)' },
        { value: '1-60 min', label: 'Typical exposure times in daylight' },
      ],
      examples: [
        'Long-exposure cityscapes showing ghost-like people movement',
        'Solargraphs tracking the sun\'s path over 6 months',
        'Architectural photography with no perspective distortion',
        'Abstract light paintings using extended exposures',
      ],
      companies: [
        'Zero Image',
        'Ondu Pinhole',
        'Ilford',
        'Harman Technology',
      ],
      futureImpact: 'Pinhole photography is experiencing a renaissance as artists seek alternatives to digital perfection. New materials like laser-cut precision pinholes and specialized papers are making the technique more accessible while maintaining its analog charm.',
      color: '#a855f7',
    },
    {
      icon: 'Sun',
      title: 'Solar Eclipse Viewing',
      short: 'Safe observation of solar phenomena',
      tagline: 'Projecting the cosmos safely',
      description: 'Pinhole projection provides a completely safe method to observe solar eclipses and sunspots without risking eye damage. By projecting the sun\'s image through a small aperture onto a surface, observers can witness celestial events that would otherwise require expensive specialized equipment.',
      connection: 'The camera obscura principle enables safe solar viewing by dramatically reducing light intensity. A pinhole only allows a tiny fraction of sunlight through, and the projected image is dim enough to view safely while still showing the eclipse\'s progression with remarkable detail.',
      howItWorks: 'Sunlight passes through a small hole (a few millimeters) and projects onto a shaded white surface several feet away. The projected image shows the sun\'s disk, and during an eclipse, the moon\'s shadow crossing the sun becomes clearly visible. The larger the projection distance, the bigger and dimmer the image.',
      stats: [
        { value: '100%', label: 'Safe - no direct viewing required' },
        { value: '2-5mm', label: 'Ideal pinhole size for solar projection' },
        { value: '1m+', label: 'Projection distance for clear viewing' },
      ],
      examples: [
        'Eclipse viewing events at schools and public gatherings',
        'Colander shadow projections showing multiple eclipse images',
        'Tree leaf gaps creating natural pinhole projections',
        'DIY cardboard box eclipse viewers',
      ],
      companies: [
        'NASA Education',
        'Astronomical Society of the Pacific',
        'Sky & Telescope',
        'National Science Foundation',
        'Exploratorium',
      ],
      futureImpact: 'With major solar eclipses generating worldwide interest, pinhole projection remains the most accessible and foolproof method for safe viewing. Educational programs increasingly incorporate this ancient technique to teach optics while experiencing cosmic events.',
      color: '#f59e0b',
    },
    {
      icon: 'Eye',
      title: 'Eye and Vision Science',
      short: 'Understanding and correcting human vision',
      tagline: 'Your eye is nature\'s camera obscura',
      description: 'The human eye operates on camera obscura principles - the pupil acts as a variable aperture controlling both light intensity and depth of field. Understanding this connection has revolutionized ophthalmology, optometry, and our treatment of vision disorders from myopia to cataracts.',
      connection: 'Just like adjusting the pinhole size affects image brightness and sharpness, your pupil dilates and constricts to optimize vision. Squinting works exactly like using a smaller pinhole - it reduces blur from refractive errors by limiting rays to a narrower path, improving focus without corrective lenses.',
      howItWorks: 'The pupil contracts in bright light (2-4mm) and dilates in darkness (up to 8mm). Smaller pupils increase depth of field and reduce optical aberrations, which is why people with uncorrected vision often squint. Eye doctors use this principle in the "pinhole test" to distinguish refractive errors from other vision problems.',
      stats: [
        { value: '2-8mm', label: 'Human pupil diameter range' },
        { value: '20/20', label: 'Vision improvement possible through pinhole' },
        { value: '337M', label: 'People worldwide with uncorrected refractive errors' },
      ],
      examples: [
        'Pinhole occluders used in eye exams to test correctable vision',
        'Pinhole glasses marketed as vision training devices',
        'Pupil response testing for neurological assessment',
        'Accommodative research studying focus mechanisms',
      ],
      companies: [
        'Zeiss Vision Care',
        'Essilor',
        'Johnson & Johnson Vision',
        'Alcon',
        'Bausch + Lomb',
      ],
      futureImpact: 'Emerging technologies like small-aperture intraocular lenses use pinhole principles to extend depth of focus for presbyopia patients. Research continues into how aperture-based solutions can reduce dependence on traditional corrective lenses.',
      color: '#06b6d4',
    },
    {
      icon: 'Building',
      title: 'Architectural Light Studies',
      short: 'Designing spaces with natural illumination',
      tagline: 'Sculpting with light and shadow',
      description: 'Architects and lighting designers use camera obscura principles to understand how light enters and moves through spaces. From ancient temples aligned with solstices to modern museums with carefully controlled natural lighting, aperture-based design creates spaces that respond dynamically to the sun.',
      connection: 'The camera obscura teaches how light behaves when passing through openings - lessons directly applicable to windows, skylights, and oculi. Understanding the relationship between aperture size, light intensity, and image formation helps architects create spaces where natural light becomes a design element.',
      howItWorks: 'By studying how light projects through various apertures, architects can predict illumination patterns throughout the day and seasons. Small openings create dramatic shafts of light, while larger ones provide diffuse illumination. The angle, size, and shape of openings determine how spaces feel from dawn to dusk.',
      stats: [
        { value: '70%', label: 'Energy savings possible with optimized daylighting' },
        { value: '365 days', label: 'Light patterns architects must consider annually' },
        { value: '3000+ years', label: 'History of aperture-based architectural lighting' },
      ],
      examples: [
        'Pantheon\'s oculus projecting a moving sun disk',
        'Tadao Ando\'s Church of the Light with its cross aperture',
        'Museum skylights designed to eliminate direct sun on art',
        'Sustainable buildings maximizing daylight penetration',
      ],
      companies: [
        'Foster + Partners',
        'Renzo Piano Building Workshop',
        'ARUP Lighting',
        'Daylighting Innovations',
      ],
      futureImpact: 'As buildings strive for net-zero energy, intelligent use of natural light becomes crucial. Dynamic apertures, responsive facades, and AI-optimized light wells are emerging from the same principles demonstrated in the camera obscura.',
      color: '#10b981',
    },
  ];

  const renderVisualization = (interactive: boolean) => {
    const width = 450;
    const height = 300;

    // Box dimensions
    const boxLeft = 200;
    const boxWidth = 200;
    const boxTop = 50;
    const boxBottom = 250;
    const boxHeight = boxBottom - boxTop;

    // Pinhole position (left side of box)
    const pinholeX = boxLeft;
    const pinholeY = (boxTop + boxBottom) / 2;
    const pinholeRadius = holeSize / 2;

    // Screen position (right side of box, inside)
    const screenX = boxLeft + boxWidth - 20;

    // Object outside the box
    const objectX = boxLeft - objectDistance;
    const objectTop = 80;
    const objectBottom = 180;
    const objectMid = (objectTop + objectBottom) / 2;

    // Calculate image position (inverted)
    const imageScale = (screenX - pinholeX) / (pinholeX - objectX);
    const imageTop = pinholeY + (pinholeY - objectTop) * imageScale;
    const imageBottom = pinholeY + (pinholeY - objectBottom) * imageScale;

    // Blur amount based on hole size
    const blurAmount = Math.max(0, (holeSize - 5) * 0.8);

    // Generate light rays from multiple points on the object
    const generateRays = () => {
      const rays = [];
      const objectPoints = [objectTop, objectMid, objectBottom];
      const rayGradients = ['url(#camRayGradTop)', 'url(#camRayGradMid)', 'url(#camRayGradBottom)'];

      objectPoints.forEach((pointY, pIndex) => {
        // For larger holes, show multiple rays through different parts of the hole
        const numRays = Math.ceil(holeSize / 8);
        for (let i = 0; i < numRays; i++) {
          const offset = (i - (numRays - 1) / 2) * (holeSize / numRays) * 0.8;
          const throughY = pinholeY + offset;

          // Ray from object point to pinhole
          rays.push(
            <line
              key={`ray-in-${pIndex}-${i}`}
              x1={objectX}
              y1={pointY}
              x2={pinholeX}
              y2={throughY}
              stroke={rayGradients[pIndex]}
              strokeWidth={2}
              filter="url(#camRayGlow)"
              opacity={0.85}
            />
          );

          // Calculate where this ray hits the screen
          const dx = screenX - pinholeX;
          const dy = (throughY - pointY) * dx / (pinholeX - objectX);
          const screenHitY = throughY + dy;

          // Ray from pinhole to screen
          rays.push(
            <line
              key={`ray-out-${pIndex}-${i}`}
              x1={pinholeX}
              y1={throughY}
              x2={screenX}
              y2={screenHitY}
              stroke={rayGradients[pIndex]}
              strokeWidth={2}
              filter="url(#camRayGlow)"
              opacity={0.85}
            />
          );
        }
      });

      return rays;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="camLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Outside environment gradient (sky/ambient) */}
            <linearGradient id="camOutsideBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="30%" stopColor="#2d4a6f" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Wooden box gradient with texture effect */}
            <linearGradient id="camWoodGrain" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5c3d2e" />
              <stop offset="15%" stopColor="#8b5a3c" />
              <stop offset="30%" stopColor="#6b4423" />
              <stop offset="45%" stopColor="#8b5a3c" />
              <stop offset="60%" stopColor="#5c3d2e" />
              <stop offset="75%" stopColor="#7a4a30" />
              <stop offset="90%" stopColor="#6b4423" />
              <stop offset="100%" stopColor="#5c3d2e" />
            </linearGradient>

            {/* Wooden box top/bottom edge gradient */}
            <linearGradient id="camWoodEdge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5a3c" />
              <stop offset="20%" stopColor="#6b4423" />
              <stop offset="50%" stopColor="#5c3d2e" />
              <stop offset="80%" stopColor="#4a3222" />
              <stop offset="100%" stopColor="#3d2a1c" />
            </linearGradient>

            {/* Box interior darkness with depth */}
            <radialGradient id="camBoxInterior" cx="70%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="40%" stopColor="#050810" />
              <stop offset="70%" stopColor="#030508" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Screen/projection surface gradient */}
            <linearGradient id="camScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="25%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="75%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Candle body gradient */}
            <linearGradient id="camCandleBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Flame outer gradient */}
            <radialGradient id="camFlameOuter" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fcd34d" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </radialGradient>

            {/* Flame inner gradient */}
            <radialGradient id="camFlameInner" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef9c3" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.8" />
            </radialGradient>

            {/* Light ray gradients - top ray (yellow) */}
            <linearGradient id="camRayGradTop" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="70%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.9" />
            </linearGradient>

            {/* Light ray gradients - middle ray (orange) */}
            <linearGradient id="camRayGradMid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="70%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.9" />
            </linearGradient>

            {/* Light ray gradients - bottom ray (red-orange) */}
            <linearGradient id="camRayGradBottom" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fecaca" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="100%" stopColor="#fecaca" stopOpacity="0.9" />
            </linearGradient>

            {/* Pinhole aperture gradient */}
            <radialGradient id="camPinholeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Inverted image candle gradient */}
            <linearGradient id="camInvertedCandle" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.75" />
            </linearGradient>

            {/* Inverted flame gradient */}
            <radialGradient id="camInvertedFlame" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </radialGradient>

            {/* Glow filter for light rays */}
            <filter id="camRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for flame */}
            <filter id="camFlameGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for inverted image */}
            <filter id="camImageGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Image blur filter based on hole size */}
            <filter id="camImageBlur">
              <feGaussianBlur stdDeviation={blurAmount} />
            </filter>

            {/* Subtle inner shadow for box */}
            <filter id="camInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Wood texture pattern */}
            <pattern id="camWoodPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
              <rect width="20" height="10" fill="url(#camWoodGrain)" />
              <line x1="0" y1="2" x2="20" y2="2" stroke="#4a3222" strokeWidth="0.5" opacity="0.3" />
              <line x1="0" y1="5" x2="20" y2="5.5" stroke="#4a3222" strokeWidth="0.3" opacity="0.2" />
              <line x1="0" y1="8" x2="20" y2="7.5" stroke="#4a3222" strokeWidth="0.4" opacity="0.25" />
            </pattern>

            {/* Pinhole ring gradient */}
            <linearGradient id="camPinholeRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#camLabBg)" />

          {/* Background gradient for outside environment */}
          <rect x={0} y={0} width={boxLeft} height={height} fill="url(#camOutsideBg)" />

          {/* Object (candle/arrow shape) with premium gradients */}
          <g>
            {/* Candle body with gradient */}
            <rect
              x={objectX - 8}
              y={objectTop}
              width={16}
              height={objectBottom - objectTop}
              fill="url(#camCandleBody)"
              rx={3}
            />
            {/* Candle wick */}
            <rect
              x={objectX - 1}
              y={objectTop - 5}
              width={2}
              height={8}
              fill="#1e293b"
              rx={1}
            />
            {/* Flame outer with glow */}
            <ellipse
              cx={objectX}
              cy={objectTop - 12}
              rx={9}
              ry={14}
              fill="url(#camFlameOuter)"
              filter="url(#camFlameGlow)"
            />
            {/* Flame inner (brighter core) */}
            <ellipse
              cx={objectX}
              cy={objectTop - 10}
              rx={5}
              ry={9}
              fill="url(#camFlameInner)"
            />
            {/* Arrow indicating "up" */}
            <polygon
              points={`${objectX},${objectTop - 30} ${objectX - 6},${objectTop - 22} ${objectX + 6},${objectTop - 22}`}
              fill={colors.textPrimary}
              opacity={0.9}
            />
          </g>

          {/* Box (camera obscura) with wooden texture */}
          {/* Box outer frame with wood pattern */}
          <rect
            x={boxLeft}
            y={boxTop}
            width={boxWidth}
            height={boxHeight}
            fill="url(#camWoodPattern)"
            stroke="url(#camWoodEdge)"
            strokeWidth={4}
            rx={2}
          />

          {/* Box interior darkness with depth */}
          <rect
            x={boxLeft + 4}
            y={boxTop + 4}
            width={boxWidth - 8}
            height={boxHeight - 8}
            fill="url(#camBoxInterior)"
            rx={1}
          />

          {/* Pinhole aperture with metallic ring */}
          {/* Outer metallic ring */}
          <circle
            cx={pinholeX}
            cy={pinholeY}
            r={pinholeRadius + 4}
            fill="url(#camPinholeRing)"
          />
          {/* Inner aperture hole */}
          <ellipse
            cx={pinholeX}
            cy={pinholeY}
            rx={pinholeRadius + 1}
            ry={pinholeRadius}
            fill="url(#camPinholeGrad)"
          />
          {/* Aperture opening (actual hole) */}
          <ellipse
            cx={pinholeX}
            cy={pinholeY}
            rx={pinholeRadius * 0.7}
            ry={pinholeRadius * 0.6}
            fill="#1e3a5f"
            opacity={0.9}
          />

          {/* Screen inside box with gradient */}
          <rect
            x={screenX}
            y={boxTop + 20}
            width={12}
            height={boxHeight - 40}
            rx={2}
            fill="url(#camScreenGrad)"
            filter="url(#camImageGlow)"
          />

          {/* Projected image on screen (inverted) with premium effects */}
          <g filter={blurAmount > 0 ? "url(#camImageBlur)" : "url(#camImageGlow)"}>
            {/* Inverted candle body */}
            <rect
              x={screenX - 3}
              y={Math.min(imageTop, imageBottom)}
              width={9}
              height={Math.abs(imageBottom - imageTop)}
              fill="url(#camInvertedCandle)"
              opacity={Math.max(0.4, Math.min(1, holeSize / 12))}
              rx={1}
            />
            {/* Inverted flame (now at bottom) */}
            <ellipse
              cx={screenX + 1}
              cy={imageTop + 10}
              rx={5}
              ry={7}
              fill="url(#camInvertedFlame)"
              opacity={Math.max(0.4, Math.min(1, holeSize / 12))}
            />
          </g>

          {/* Light rays with glow effect */}
          {showRays && generateRays()}
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          padding: '0 16px',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Object</span>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Pinhole</span>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Screen</span>
          </div>
        </div>

        {/* Info panels outside SVG */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          gap: typo.elementGap,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: typo.cardPadding,
            borderRadius: '8px',
            flex: 1,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Hole size: {holeSize}px
            </div>
            <div style={{ color: colors.textMuted, fontSize: typo.label, marginTop: '4px' }}>
              Brightness: {Math.round(holeSize / 40 * 100)}%
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: typo.cardPadding,
            borderRadius: '8px',
            flex: 1,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
              Sharpness
            </div>
            <div style={{
              height: '6px',
              background: '#334155',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(10, 100 - blurAmount * 5)}%`,
                background: colors.success,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              {isAnimating ? 'Stop' : 'Animate Hole Size'}
            </button>
            <button
              onClick={() => setShowRays(!showRays)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: showRays ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              {showRays ? 'Hide Rays' : 'Show Rays'}
            </button>
            <button
              onClick={() => { setHoleSize(10); setObjectDistance(150); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: colors.textMuted,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Pinhole Size: {holeSize}px
        </label>
        <input
          type="range"
          min="3"
          max="40"
          step="1"
          value={holeSize}
          onChange={(e) => setHoleSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>Tiny (sharp, dim)</span>
          <span>Large (bright, blurry)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Distance: {objectDistance}px
        </label>
        <input
          type="range"
          min="80"
          max="180"
          step="5"
          value={objectDistance}
          onChange={(e) => setObjectDistance(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Image brightness increases with hole area (proportional to size squared)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Larger hole = more rays = more overlap = more blur
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Pinhole Puzzle
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Will the image get brighter or sharper if the hole gets bigger?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Imagine a dark box with a tiny hole in one side. Light from outside
                passes through the hole and projects an image onto the opposite wall.
                This is the camera obscura - the ancestor of all cameras!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                But here's the puzzle: if you make the hole bigger, what happens to the image?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the hole size and watch what happens to the projected image!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A candle (object) outside a dark box with a pinhole. Light passes through
              the hole and creates an inverted image on the screen inside. The colored
              rays show light traveling from different parts of the candle.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you make the pinhole larger, what happens to the image?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Camera Obscura</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the pinhole size and observe brightness vs. sharpness
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Very small hole (3-5px): Sharp but dim image</li>
              <li>Medium hole (10-20px): Brighter but starting to blur</li>
              <li>Large hole (30-40px): Bright but very blurry</li>
              <li>Watch how multiple rays overlap with larger holes</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'brighter_blurry';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              A bigger hole makes the image brighter but blurrier!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Each Point Sends Many Rays:</strong> Every
                point on the object sends light in all directions. A small pinhole lets only one
                narrow beam through from each point, creating a sharp image.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Larger Hole = Ray Overlap:</strong> When
                the hole gets bigger, rays from different points on the object can pass through
                and overlap on the screen. This overlap causes blur.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Tradeoff:</strong> More light
                means a brighter image, but more ray overlap means more blur. You can't have
                both maximum brightness AND maximum sharpness with just a pinhole!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Compare two different hole sizes side by side
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine you have two camera obscura boxes: one with a tiny 5px hole,
              and one with a larger 30px hole. You're trying to photograph the same scene.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the fundamental tradeoff between the two hole sizes?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Hole Sizes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quickly switch between small and large holes to see the difference
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setHoleSize(5)}
              style={{
                padding: '16px 24px',
                borderRadius: '8px',
                border: holeSize === 5 ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: holeSize === 5 ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Small Hole (5px)<br />
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>Sharp + Dim</span>
            </button>
            <button
              onClick={() => setHoleSize(30)}
              style={{
                padding: '16px 24px',
                borderRadius: '8px',
                border: holeSize === 30 ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: holeSize === 30 ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Large Hole (30px)<br />
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>Bright + Blurry</span>
            </button>
          </div>

          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Neither hole size is "better" - each has advantages. This brightness vs. sharpness
              tradeoff is fundamental to all optical systems, from cameras to your eyes!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              It's a fundamental tradeoff: small holes give sharp but dim images, large holes give bright but blurry images!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why This Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Lens Solution:</strong> Lenses
                were invented to overcome this tradeoff. A lens bends rays so that even a large
                aperture can focus light from each point to a single spot - giving you both
                brightness AND sharpness!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>But Not Perfectly:</strong> Even
                lenses have limitations. F-stops on cameras control aperture size, trading between
                light gathering (for low-light photos) and depth of field (sharpness range).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Your Eyes Do This Too:</strong> Your
                pupil dilates in darkness (more light, less sharp) and constricts in brightness
                (less light, sharper). Squinting artificially creates a smaller aperture!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              The camera obscura principle appears throughout optics and daily life
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered the camera obscura!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered the camera obscura and pinhole optics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Pinhole image formation and inversion</li>
              <li>Brightness vs. sharpness tradeoff</li>
              <li>Ray overlap causes blur in larger apertures</li>
              <li>Applications from cameras to human vision</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The camera obscura principle led to the invention of photography in the 1800s.
              Modern cameras use lenses to overcome the brightness-sharpness tradeoff, but
              even today, pinhole cameras are used for their unique aesthetic and for
              specialized applications like viewing solar eclipses safely. The same principles
              govern how your eyes work and why optometrists measure your pupil response!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default CameraObscuraRenderer;
