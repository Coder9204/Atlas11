'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// DISPERSION RENDERER - THE CD RAINBOW
// =============================================================================

const colors = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  accent: '#3b82f6',
  secondary: '#8B5CF6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#F59E0B',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1',

  border: '#334155',
  borderLight: '#475569',

  spectrum: {
    red: '#EF4444',
    orange: '#F97316',
    yellow: '#EAB308',
    green: '#22C55E',
    blue: '#3B82F6',
    indigo: '#6366F1',
    violet: '#8B5CF6',
  },
};

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================
const WAVELENGTHS = [
  { key: 'red', name: 'Red', wavelength: 700, n: 1.513, color: '#EF4444' },
  { key: 'orange', name: 'Orange', wavelength: 620, n: 1.517, color: '#F97316' },
  { key: 'yellow', name: 'Yellow', wavelength: 580, n: 1.519, color: '#EAB308' },
  { key: 'green', name: 'Green', wavelength: 550, n: 1.521, color: '#22C55E' },
  { key: 'blue', name: 'Blue', wavelength: 470, n: 1.526, color: '#3B82F6' },
  { key: 'indigo', name: 'Indigo', wavelength: 445, n: 1.529, color: '#6366F1' },
  { key: 'violet', name: 'Violet', wavelength: 400, n: 1.532, color: '#8B5CF6' },
];

const PRISM_MATERIALS: Record<string, { name: string; dispersion: number }> = {
  crown: { name: 'Crown Glass', dispersion: 1.0 },
  flint: { name: 'Flint Glass', dispersion: 1.5 },
  diamond: { name: 'Diamond', dispersion: 2.2 },
  water: { name: 'Water Droplet', dispersion: 0.6 },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
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

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Twist Lab',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// =============================================================================
// TEST QUESTIONS
// =============================================================================
const testQuestions = [
  {
    scenario: "You're watching sunlight pass through a glass prism in your physics lab. The white light entering the prism emerges as a beautiful rainbow of colors spread across the wall.",
    question: "Why does a glass prism separate white light into a rainbow spectrum?",
    options: [
      { id: 'a', label: 'The prism contains colored chemicals that filter the light' },
      { id: 'b', label: 'Different wavelengths of light refract at different angles due to wavelength-dependent refractive index', correct: true },
      { id: 'c', label: 'The prism absorbs white light and re-emits it as colored light' },
      { id: 'd', label: 'Internal reflections inside the prism create interference patterns' },
    ],
    explanation: "Dispersion occurs because glass has a slightly different refractive index for each wavelength. Violet light (short wavelength) bends more than red light (long wavelength), causing the colors to fan out into a spectrum. This wavelength-dependent refraction is the fundamental mechanism behind prismatic dispersion.",
  },
  {
    scenario: "During a summer rainstorm, the sun breaks through the clouds behind you. Looking toward the rain in front of you, you see a brilliant rainbow arching across the sky.",
    question: "How do raindrops create a rainbow using the same physics as a prism?",
    options: [
      { id: 'a', label: 'Raindrops act as tiny spherical lenses that magnify sunlight' },
      { id: 'b', label: 'Water vapor in the air scatters blue light more than red' },
      { id: 'c', label: 'Each raindrop refracts, internally reflects, and disperses sunlight, sending different colors to different angles', correct: true },
      { id: 'd', label: 'Lightning ionizes the raindrops, making them emit colored light' },
    ],
    explanation: "Each raindrop acts like a tiny prism. Sunlight enters, refracts at the air-water interface (dispersing into colors), reflects off the back of the drop, then refracts again upon exit. Different colors exit at slightly different angles (red at ~42 degrees, violet at ~40 degrees).",
  },
  {
    scenario: "A jeweler is explaining why diamonds sparkle with rainbow colors (called 'fire') much more brilliantly than glass jewelry. The customer wonders what makes diamonds special.",
    question: "Why do diamonds display much more 'fire' (rainbow flashes) than ordinary glass?",
    options: [
      { id: 'a', label: 'Diamonds are cut with more facets than glass jewelry' },
      { id: 'b', label: 'Diamond has a much higher dispersion value, spreading colors over wider angles', correct: true },
      { id: 'c', label: 'Diamonds contain trace elements that emit colored light' },
      { id: 'd', label: 'The carbon atoms in diamond absorb and re-emit light as colors' },
    ],
    explanation: "Diamond has a dispersion of 0.044, about 2.5× higher than crown glass (0.017). This means the difference in refractive index between red and violet light is much greater, causing colors to spread over much wider angles.",
  },
  {
    scenario: "A telecommunications engineer is troubleshooting a fiber optic network. She notices that sharp digital pulses sent over a long fiber arrive spread out and overlapping, causing data errors.",
    question: "What causes optical pulses to spread out as they travel through fiber optic cables?",
    options: [
      { id: 'a', label: 'The fiber gradually absorbs the pulse energy over distance' },
      { id: 'b', label: 'Different wavelength components of the pulse travel at different speeds due to chromatic dispersion', correct: true },
      { id: 'c', label: 'Electrical interference from nearby cables distorts the signal' },
      { id: 'd', label: 'The light bounces too many times off the fiber walls' },
    ],
    explanation: "Due to chromatic dispersion in the glass fiber, each wavelength travels at a slightly different velocity. Over long distances (tens of kilometers), this velocity difference causes the pulse to spread in time.",
  },
  {
    scenario: "An astronomer at a mountaintop observatory notices that stars near the horizon appear slightly elongated vertically with a blue fringe on top and red fringe on bottom.",
    question: "What causes stars near the horizon to display this colored vertical stretching?",
    options: [
      { id: 'a', label: 'The telescope lens has chromatic aberration' },
      { id: 'b', label: 'Stars emit different colors from different parts of their surface' },
      { id: 'c', label: 'Atmospheric refraction acts like a vertical prism, dispersing starlight by wavelength', correct: true },
      { id: 'd', label: 'Moisture in the air creates a rainbow effect around the star' },
    ],
    explanation: "Earth's atmosphere acts as a weak prism. Light from stars near the horizon passes through more atmosphere and is refracted upward. Blue light refracts more than red, creating a vertically stretched, color-fringed image.",
  },
  {
    scenario: "A network engineer is designing a 400 Gbps data link using optical fiber spanning 80 km between two cities.",
    question: "What is the most effective way to compensate for chromatic dispersion in long-haul fiber links?",
    options: [
      { id: 'a', label: 'Use thicker optical fibers to reduce light bouncing' },
      { id: 'b', label: 'Insert dispersion-compensating fiber (DCF) with opposite dispersion characteristics', correct: true },
      { id: 'c', label: 'Increase the laser power to overcome pulse spreading' },
      { id: 'd', label: 'Use copper cables for the last kilometer to regenerate the signal' },
    ],
    explanation: "Dispersion-compensating fiber (DCF) is engineered with negative dispersion that exactly cancels the positive dispersion of standard transmission fiber. By periodically inserting DCF segments, engineers can reset accumulated dispersion to near zero.",
  },
  {
    scenario: "A materials scientist is using white light interferometry to measure surface profiles of precision machined parts with nanometer accuracy.",
    question: "Why is white light advantageous for interferometric surface measurements compared to monochromatic laser light?",
    options: [
      { id: 'a', label: 'White light is brighter and provides better signal strength' },
      { id: 'b', label: 'The short coherence length of white light provides unambiguous height measurement without fringe-order ambiguity', correct: true },
      { id: 'c', label: 'White light can penetrate deeper into the material surface' },
      { id: 'd', label: 'Different colors average out measurement noise' },
    ],
    explanation: "White light's broad spectrum gives it a very short coherence length (~1 micrometer), so interference fringes only appear when path lengths match to within this distance. This eliminates the 2-pi phase ambiguity problem.",
  },
  {
    scenario: "An analytical chemist is designing a spectrometer to identify trace elements in water samples.",
    question: "How do prism-based spectrometers achieve high wavelength resolution for chemical analysis?",
    options: [
      { id: 'a', label: 'By using multiple colored filters in sequence' },
      { id: 'b', label: 'By using high-dispersion materials and long optical paths to maximize angular separation between wavelengths', correct: true },
      { id: 'c', label: 'By rapidly spinning the prism to scan through wavelengths' },
      { id: 'd', label: 'By cooling the prism to absolute zero to reduce thermal noise' },
    ],
    explanation: "Spectral resolution depends on angular dispersion and optical path length. High-dispersion materials like flint glass spread wavelengths over wider angles. Longer paths translate small angular differences into larger spatial separations.",
  },
  {
    scenario: "A physicist studying exotic optical materials discovers that near certain absorption resonances, blue light actually refracts LESS than red light.",
    question: "What is this unusual phenomenon called, and when does it occur?",
    options: [
      { id: 'a', label: 'Negative refraction, occurring in metamaterials with negative refractive index' },
      { id: 'b', label: 'Anomalous dispersion, occurring near absorption bands where refractive index decreases with frequency', correct: true },
      { id: 'c', label: 'Total internal reflection, occurring when light cannot exit a material' },
      { id: 'd', label: 'Birefringence, occurring in crystalline materials with two refractive indices' },
    ],
    explanation: "Anomalous dispersion occurs near absorption resonances where the refractive index changes rapidly with wavelength. In these spectral regions, dn/d-lambda becomes positive instead of negative.",
  },
  {
    scenario: "An optical engineer is designing a camera lens system that must focus all visible colors to the same point.",
    question: "How do achromatic lens designs correct for chromatic aberration caused by dispersion?",
    options: [
      { id: 'a', label: 'By using only reflective mirrors instead of refractive lenses' },
      { id: 'b', label: 'By combining positive and negative lenses made from glasses with different dispersion ratios to cancel chromatic errors', correct: true },
      { id: 'c', label: 'By using a single lens made from zero-dispersion material' },
      { id: 'd', label: 'By digitally correcting the color fringing in post-processing' },
    ],
    explanation: "Achromatic doublets combine a converging lens of crown glass (low dispersion) with a diverging lens of flint glass (high dispersion). The glasses are chosen so their dispersions cancel while their focusing powers add constructively.",
  },
];

// =============================================================================
// REAL WORLD APPLICATIONS DATA
// =============================================================================
const realWorldApps = [
  {
    icon: '📡',
    title: 'Fiber Optic Communications',
    short: 'Telecom',
    tagline: 'Transmitting data at the speed of light',
    description: "Modern telecommunications rely on fiber optic cables that carry internet traffic, phone calls, and streaming video as pulses of light. Dispersion is a critical challenge in fiber optics because different wavelengths of light travel at slightly different speeds through the glass fiber, causing pulses to spread out and blur together over long distances. Engineers must carefully manage chromatic dispersion to maintain signal clarity across thousands of kilometers.",
    connection: "Just like our prism separates white light because different wavelengths refract differently, fiber optic signals spread out because different wavelength components travel at different speeds. A sharp light pulse containing multiple wavelengths gradually smears as it travels.",
    howItWorks: "Optical transmitters use precisely tuned laser diodes that emit light at specific wavelengths (typically 1550nm). The fiber's silica glass has wavelength-dependent refractive index, causing chromatic dispersion. Engineers counteract this using dispersion-compensating fiber segments with opposite dispersion characteristics.",
    stats: [
      { icon: '📊', value: '99%', label: 'Internet traffic via fiber' },
      { icon: '📏', value: '400 GB', label: 'Data per second per fiber' },
      { icon: '🌊', value: '10000 km', label: 'Transoceanic cable lengths' },
    ],
    companies: ['Corning', 'Ciena', 'Infinera', 'Nokia', 'Huawei'],
    futureImpact: 'Next-generation hollow-core fibers will guide light through air instead of glass, dramatically reducing dispersion and enabling even higher data rates.',
    color: '#3b82f6',
  },
  {
    icon: '💎',
    title: 'Gemstone Cutting & Diamond Fire',
    short: 'Jewelry',
    tagline: 'Engineering brilliance through light physics',
    description: "The 'fire' that makes diamonds and other gemstones sparkle with rainbow colors is a direct result of dispersion. Gem cutters carefully calculate facet angles to maximize the separation of white light into its spectral colors, creating the dazzling play of color that makes precious gems so valuable. High-dispersion stones spread light into more vivid rainbows.",
    connection: "When light enters a diamond, it disperses just like in our prism experiment — violet bends more than red. But unlike a simple prism, a gem's many facets bounce this dispersed light around internally, amplifying the color separation.",
    howItWorks: "Diamond has exceptionally high dispersion (0.044) compared to glass (0.017). The classic round brilliant cut uses 57 facets at mathematically optimized angles to maximize total internal reflection and dispersion.",
    stats: [
      { icon: '💎', value: '0.044', label: 'Diamond dispersion value' },
      { icon: '🔷', value: '57', label: 'Facets in round brilliant' },
      { icon: '📐', value: '2.42', label: 'Diamond refractive index' },
    ],
    companies: ['De Beers', 'Tiffany & Co.', 'Cartier', 'GIA'],
    futureImpact: 'AI-powered cutting optimization will analyze rough stones and calculate custom facet patterns that maximize both brilliance and fire for each unique gem.',
    color: '#8b5cf6',
  },
  {
    icon: '🔬',
    title: 'Prism Spectrometers',
    short: 'Analytical Chemistry',
    tagline: 'Reading the fingerprints of matter',
    description: "Prism spectrometers exploit dispersion to separate light into its component wavelengths, allowing scientists to identify elements and molecules by their unique spectral signatures. Every substance absorbs or emits light at characteristic wavelengths — dispersion spreads these wavelengths apart so they can be individually measured.",
    connection: "Our prism demonstration shows how white light fans out into ROYGBIV. Spectrometers do exactly this but with extreme precision, spreading the spectrum across a detector array measuring intensity at thousands of individual wavelengths.",
    howItWorks: "Light from a sample enters through a narrow slit. A collimating lens makes rays parallel before hitting the prism. The prism's dispersion bends each wavelength to a different angle. A focusing lens projects this spread spectrum onto a CCD detector array.",
    stats: [
      { icon: '🎯', value: '0.1 nm', label: 'Wavelength resolution' },
      { icon: '📊', value: 'ppm', label: 'Detection sensitivity' },
      { icon: '🌈', value: '190-1100 nm', label: 'Typical spectral range' },
    ],
    companies: ['Thermo Fisher', 'Agilent', 'PerkinElmer', 'Shimadzu', 'Ocean Insight'],
    futureImpact: 'Miniaturized spectrometers will be embedded in smartphones, enabling consumers to verify food freshness, detect allergens, or authenticate products.',
    color: '#10b981',
  },
  {
    icon: '🌅',
    title: 'Atmospheric Optics',
    short: 'Meteorology',
    tagline: "Nature's light show in the sky",
    description: "The atmosphere acts as a giant optical system where dispersion creates spectacular phenomena. Rainbows, sundogs, halos, and the green flash at sunset all result from sunlight dispersing through water droplets or ice crystals. Meteorologists study these optical effects to understand atmospheric conditions.",
    connection: "Every raindrop acts like a tiny prism, dispersing sunlight into colors. But unlike our tabletop prism, millions of droplets at different positions each contribute one specific color to your eye. The geometry means red appears at 42° and violet at 40° from the antisolar point.",
    howItWorks: "Sunlight enters a water droplet, refracting at the air-water interface. Inside, light reflects off the back surface and exits, refracting again. Each refraction disperses colors slightly. The spherical geometry concentrates exiting light near a specific angle (~42° for primary rainbows).",
    stats: [
      { icon: '🌈', value: '42°', label: 'Primary rainbow angle' },
      { icon: '🌈', value: '51°', label: 'Secondary rainbow angle' },
      { icon: '❄️', value: '22°', label: 'Common ice halo radius' },
    ],
    companies: ['NOAA', 'NASA', 'Met Office', 'Weather Underground'],
    futureImpact: 'Advanced atmospheric modeling will predict optical phenomena hours in advance, alerting photographers and sky watchers. Climate research will use systematic rainbow observations to track changes in atmospheric conditions.',
    color: '#f59e0b',
  },
];

// =============================================================================
// AUDIO
// =============================================================================
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const cfg: Record<string, { freq: number; dur: number }> = {
      click: { freq: 600, dur: 0.1 },
      success: { freq: 800, dur: 0.2 },
      failure: { freq: 300, dur: 0.3 },
      transition: { freq: 500, dur: 0.15 },
      complete: { freq: 900, dur: 0.4 },
    };
    const s = cfg[type];
    osc.frequency.value = s.freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + s.dur);
    osc.start();
    osc.stop(ctx.currentTime + s.dur);
  } catch { /* Audio not supported */ }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
interface DispersionRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const DispersionRenderer: React.FC<DispersionRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase,
}) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
  };

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [prismAngle, setPrismAngle] = useState(60);
  const [prismMaterial, setPrismMaterial] = useState<string>('crown');
  const [gratingSpacing, setGratingSpacing] = useState(1.6); // micrometers

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  const animationRef = useRef<number>();
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    const animate = () => {
      setAnimTime(t => (t + 0.5) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);
    playSound('transition');
    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
    }
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  // =============================================================================
  // PHYSICS CALCULATIONS
  // =============================================================================
  const dispersionFactor = PRISM_MATERIALS[prismMaterial]?.dispersion || 1.0;
  const baseSpread = (prismAngle / 60) * 15 * dispersionFactor;
  const dispersedColors = useMemo(() => {
    return WAVELENGTHS.map((data) => {
      const normalizedWavelength = (data.wavelength - 400) / 300;
      const angle = 45 + baseSpread * (1 - normalizedWavelength);
      return { ...data, exitAngle: angle };
    });
  }, [prismAngle, prismMaterial, baseSpread]);

  const totalSpread = dispersedColors[0].exitAngle - dispersedColors[dispersedColors.length - 1].exitAngle;

  const calculateTestScore = () => testAnswers.reduce((score, ans, i) => {
    const correct = testQuestions[i].options.find(o => (o as any).correct)?.id;
    return score + (ans === correct ? 1 : 0);
  }, 0);

  const allCompleted = completedApps.every(Boolean);

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: colors.bgCard, zIndex: 1001 }}>
      <div style={{ height: '100%', width: `${((validPhases.indexOf(phase) + 1) / validPhases.length) * 100}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, transition: 'width 0.3s ease' }} />
    </div>
  );

  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.primary : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  const renderBottomBar = (showBack: boolean, canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const handleNext = () => {
      if (!canProceed) return;
      playSound('click');
      if (onNext) onNext();
      else {
        const ci = validPhases.indexOf(phase);
        if (ci < validPhases.length - 1) goToPhase(validPhases[ci + 1]);
      }
    };

    const handleBack = () => {
      playSound('click');
      const ci = validPhases.indexOf(phase);
      if (ci > 0) goToPhase(validPhases[ci - 1]);
    };

    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, minHeight: '72px',
        background: colors.bgCard, borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      }}>
        {showBack ? (
          <button onClick={handleBack} style={{
            padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCardLight, color: colors.textPrimary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
            transition: 'all 0.2s ease',
          }}>← Back</button>
        ) : <div />}

        {canProceed ? (
          <button onClick={handleNext} style={{
            padding: '14px 28px', borderRadius: '12px', border: 'none',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '160px',
            boxShadow: `0 4px 15px ${colors.primary}40`,
            transition: 'all 0.2s ease',
          }}>{nextLabel}</button>
        ) : (
          <div style={{
            padding: '14px 28px', borderRadius: '12px', backgroundColor: colors.bgCardLight,
            color: colors.textSecondary, fontSize: '14px', minHeight: '52px', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s ease',
          }}>Select an option above</div>
        )}
      </div>
    );
  };

  // =============================================================================
  // SVG VISUALIZATION - Dispersion Curve (n vs wavelength)
  // =============================================================================
  const renderDispersionSVG = (interactive: boolean = false) => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 280 : 350;
    const padL = 60, padR = 30, padT = 30, padB = 50;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Axes: X = wavelength (400-700nm), Y = refractive index (1.510-1.535)
    const xMin = 400, xMax = 700;
    const yMin = 1.510, yMax = 1.535;

    const toX = (wl: number) => padL + ((wl - xMin) / (xMax - xMin)) * plotW;
    const toY = (n: number) => padT + plotH - ((n - yMin) / (yMax - yMin)) * plotH;

    // Cauchy approximation constants: n = A + B/lambda^2
    const A = 1.505;
    const B = 4200;

    // Generate dispersion curve points using Cauchy approximation
    const curvePoints: { x: number; y: number; wl: number; n: number }[] = [];
    for (let wl = xMin; wl <= xMax; wl += 5) {
      const n = A + (B / (wl * wl)) * dispersionFactor;
      curvePoints.push({ x: toX(wl), y: toY(n), wl, n });
    }

    // Build path
    const pathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Current slider value - find point on curve
    const currentAngle = prismAngle;
    const currentWl = 400 + ((currentAngle - 30) / 60) * 300;
    const clampedWl = Math.max(xMin, Math.min(xMax, currentWl));
    const currentN = A + (B / (clampedWl * clampedWl)) * dispersionFactor;
    const clampedN = Math.max(yMin, Math.min(yMax, currentN));
    const interactiveX = toX(clampedWl);
    const interactiveY = toY(clampedN);

    // Grid lines
    const gridLinesY = [1.515, 1.520, 1.525, 1.530];
    const gridLinesX = [450, 500, 550, 600, 650];

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dispCurvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.spectrum.violet} />
            <stop offset="50%" stopColor={colors.spectrum.green} />
            <stop offset="100%" stopColor={colors.spectrum.red} />
          </linearGradient>
          <linearGradient id="dispBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="dispPointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dispShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#dispBgGrad)" rx="12" />

        {/* Grid lines - horizontal */}
        {gridLinesY.map(n => (
          <g key={n}>
            <line x1={padL} y1={toY(n)} x2={width - padR} y2={toY(n)} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
            <text x={padL - 8} y={toY(n) + 4} fill={colors.textMuted} fontSize="11" textAnchor="end" fontFamily="sans-serif">{n.toFixed(3)}</text>
          </g>
        ))}

        {/* Grid lines - vertical */}
        {gridLinesX.map(wl => (
          <g key={wl}>
            <line x1={toX(wl)} y1={padT} x2={toX(wl)} y2={height - padB} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
            <text x={toX(wl)} y={height - padB + 18} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontFamily="sans-serif">{wl.toFixed(0)}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={colors.textMuted} strokeWidth="1.5" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={colors.textMuted} strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={width / 2} y={height - 5} fill={colors.textSecondary} fontSize="13" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">Wavelength (nm)</text>
        <text x={15} y={height / 2} fill={colors.textSecondary} fontSize="13" textAnchor="middle" fontFamily="sans-serif" fontWeight="600" transform={`rotate(-90, 15, ${height / 2})`}>Refractive Index n</text>

        {/* Color spectrum bar along X axis */}
        {WAVELENGTHS.map((c, i) => (
          <rect key={c.key} x={toX(c.wavelength) - 6} y={height - padB + 24} width={12} height={8} rx={2} fill={c.color} opacity={0.8} />
        ))}

        {/* Dispersion curve - main */}
        <path d={pathD} fill="none" stroke="url(#dispCurvGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#dispShadow)" />

        {/* Data points for each wavelength */}
        {WAVELENGTHS.map((c) => {
          const px = toX(c.wavelength);
          const py = toY(c.n);
          return (
            <g key={c.key}>
              <circle cx={px.toFixed(1)} cy={py.toFixed(1)} r={5} fill={c.color} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
              <text x={px.toFixed(1)} y={(py - 10).toFixed(1)} fill={c.color} fontSize="11" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">{c.name}</text>
            </g>
          );
        })}

        {/* Interactive highlight point */}
        {interactive && (
          <g>
            <circle cx={interactiveX.toFixed(1)} cy={interactiveY.toFixed(1)} r={16} fill="url(#dispPointGlow)" />
            <circle cx={interactiveX.toFixed(1)} cy={interactiveY.toFixed(1)} r={8} fill={colors.primary} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          </g>
        )}

        {/* Title */}
        <text x={width / 2} y={padT - 10} fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontFamily="sans-serif" fontWeight="700">
          {PRISM_MATERIALS[prismMaterial]?.name || 'Crown Glass'} Dispersion Curve
        </text>

        {/* Legend */}
        <g transform={`translate(${width - padR - 120}, ${padT + 10})`}>
          <rect x={0} y={0} width={110} height={36} rx={6} fill="rgba(30,41,59,0.9)" stroke="rgba(255,255,255,0.1)" />
          <text x={10} y={16} fill={colors.textSecondary} fontSize="11" fontFamily="sans-serif">Dispersion: {dispersionFactor.toFixed(1)}×</text>
          <text x={10} y={30} fill={colors.warning} fontSize="11" fontFamily="sans-serif" fontWeight="600">Spread: {totalSpread.toFixed(1)}°</text>
        </g>
      </svg>
    );
  };

  // =============================================================================
  // CD DIFFRACTION SVG
  // =============================================================================
  const renderCDSVG = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 280 : 350;
    const padL = 60, padR = 30, padT = 30, padB = 50;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // X = order (0-3), Y = diffraction angle
    // d*sin(theta) = m*lambda => theta = arcsin(m*lambda/d)
    const curvePoints: { x: number; y: number }[] = [];
    for (let m = 0; m <= 30; m++) {
      const mVal = m / 10;
      const theta = Math.asin(Math.min(0.99, mVal * 0.55 / gratingSpacing)) * (180 / Math.PI);
      const x = padL + (mVal / 3) * plotW;
      const y = padT + plotH - (theta / 90) * plotH;
      curvePoints.push({ x, y });
    }

    const pathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Current interactive point
    const currentM = gratingSpacing;
    const currentTheta = Math.asin(Math.min(0.99, 1 * 0.55 / gratingSpacing)) * (180 / Math.PI);
    const ix = padL + (1 / 3) * plotW;
    const iy = padT + plotH - (currentTheta / 90) * plotH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="cdBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cdCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.spectrum.red} />
          </linearGradient>
          <radialGradient id="cdGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.warning} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0" />
          </radialGradient>
          <filter id="cdGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#cdBg)" rx="12" />

        {/* Grid */}
        {[0.5, 1.0, 1.5, 2.0, 2.5].map(m => (
          <g key={m}>
            <line x1={padL + (m / 3) * plotW} y1={padT} x2={padL + (m / 3) * plotW} y2={height - padB} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
            <text x={padL + (m / 3) * plotW} y={height - padB + 18} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontFamily="sans-serif">{m.toFixed(1)}</text>
          </g>
        ))}
        {[15, 30, 45, 60].map(angle => {
          const yy = padT + plotH - (angle / 90) * plotH;
          return (
            <g key={angle}>
              <line x1={padL} y1={yy} x2={width - padR} y2={yy} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
              <text x={padL - 8} y={yy + 4} fill={colors.textMuted} fontSize="11" textAnchor="end" fontFamily="sans-serif">{angle}°</text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={colors.textMuted} strokeWidth="1.5" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={colors.textMuted} strokeWidth="1.5" />

        {/* Labels */}
        <text x={width / 2} y={height - 5} fill={colors.textSecondary} fontSize="13" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">Diffraction Order m</text>
        <text x={15} y={height / 2} fill={colors.textSecondary} fontSize="13" textAnchor="middle" fontFamily="sans-serif" fontWeight="600" transform={`rotate(-90, 15, ${height / 2})`}>Angle (degrees)</text>

        {/* Curve */}
        <path d={pathD} fill="none" stroke="url(#cdCurveGrad)" strokeWidth="3" strokeLinecap="round" />

        {/* Color reference arcs */}
        {WAVELENGTHS.map((c, i) => {
          const theta = Math.asin(Math.min(0.99, 1 * (c.wavelength / 1000) / gratingSpacing)) * (180 / Math.PI);
          const yy = padT + plotH - (theta / 90) * plotH;
          const xx = padL + (1 / 3) * plotW;
          return (
            <g key={c.key}>
              <circle cx={xx.toFixed(1)} cy={yy.toFixed(1)} r={4} fill={c.color} />
              <text x={(xx + 8).toFixed(1)} y={(yy + 4).toFixed(1)} fill={c.color} fontSize="11" fontFamily="sans-serif">{c.name}</text>
            </g>
          );
        })}

        {/* Interactive point */}
        <circle cx={ix.toFixed(1)} cy={iy.toFixed(1)} r={16} fill="url(#cdGlow)" />
        <circle cx={ix.toFixed(1)} cy={iy.toFixed(1)} r={8} fill={colors.warning} filter="url(#cdGlowFilter)" stroke="#fff" strokeWidth={2} />

        <text x={width / 2} y={padT - 10} fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontFamily="sans-serif" fontWeight="700">
          CD Diffraction: d = {gratingSpacing.toFixed(1)}μm
        </text>

        <g transform={`translate(${width - padR - 130}, ${padT + 10})`}>
          <rect x={0} y={0} width={120} height={36} rx={6} fill="rgba(30,41,59,0.9)" stroke="rgba(255,255,255,0.1)" />
          <text x={10} y={16} fill={colors.textSecondary} fontSize="11" fontFamily="sans-serif">d·sin(θ) = mλ</text>
          <text x={10} y={30} fill={colors.warning} fontSize="11" fontFamily="sans-serif" fontWeight="600">Spacing: {gratingSpacing.toFixed(1)}μm</text>
        </g>
      </svg>
    );
  };

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>🌈</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
              Light Dispersion
            </h1>
            <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6, fontWeight: 400 }}>
              Tilt a CD in sunlight and watch <strong style={{ color: colors.primaryLight }}>rainbow colors dance</strong>. White light contains a hidden spectrum — how does it separate into colors?
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}`, boxShadow: `0 4px 20px ${colors.primary}20` }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔺</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Prisms split light</p>
                  <p style={{ color: colors.primary, fontSize: '16px', fontWeight: 600 }}>Into 7 colors!</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>💎</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Diamond fire</p>
                  <p style={{ color: colors.secondary, fontSize: '16px', fontWeight: 600 }}>2.5× more spread!</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>💿</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>CD rainbows</p>
                  <p style={{ color: colors.warning, fontSize: '16px', fontWeight: 600 }}>Diffraction!</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic' }}>
              Explore the science of <strong style={{ color: colors.primaryLight }}>prisms and rainbows</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Exploring →')}
      </div>
    );
  }

  if (phase === 'predict') {
    const predictions = [
      { id: 'refract', label: 'Different wavelengths have different refractive indices', icon: '🔺' },
      { id: 'absorb', label: 'The prism absorbs some colors and lets others through', icon: '🚫' },
      { id: 'speed', label: 'Some colors move faster and get ahead', icon: '⚡' },
      { id: 'reflect', label: 'Different colors reflect off different internal surfaces', icon: '🪞' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '8px' }}>Step 1 • Make a Prediction</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Why Do Prisms Create Rainbows?</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderDispersionSVG(false)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 What You See:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                White light enters a glass prism. <strong style={{ color: colors.primaryLight }}>Different colors exit at different angles</strong>, creating a rainbow spectrum on the wall. The refractive index <span style={{ color: colors.warning }}>n</span> varies with wavelength — violet bends more than red.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 Why do different colors exit at different angles?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.2s ease',
                  }}>
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {prediction === p.id && <span style={{ color: colors.primary, fontSize: '20px', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Experiment</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Explore Dispersion</h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {renderDispersionSVG(true)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* What you see */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                The chart above is showing the dispersion curve — observe how the refractive index changes with wavelength. Notice that violet light has a higher refractive index than red, which is why it bends more through a prism. This concept is important in real-world technology like fiber optics, spectroscopy, and camera lens design.
              </p>
            </div>

            {/* Formula display */}
            <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.primary}30`, textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>DISPERSION FORMULA</p>
              <p style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: 'serif' }}>
                <span style={{ color: '#F59E0B', fontWeight: 700 }}>S</span> = <span style={{ color: '#6366F1', fontWeight: 700 }}>n</span> × <span style={{ color: '#8B5CF6', fontWeight: 700 }}>A</span> × <span style={{ color: '#22c55e', fontWeight: 700 }}>D</span>
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                Angular spread = refractive index × prism angle × dispersion factor
              </p>
            </div>

            {/* Controls */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎮 Controls</h3>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '13px' }}>30°</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>Prism Angle: {prismAngle.toFixed(0)}°</span>
                  <span style={{ color: colors.primary, fontSize: '13px' }}>90°</span>
                </div>
                <input type="range" min="30" max="90" value={prismAngle} onChange={(e) => setPrismAngle(Number(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
                <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                  Increasing prism angle causes <strong style={{ color: colors.primaryLight }}>more color separation</strong> because light refracts more
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Prism Material</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.entries(PRISM_MATERIALS).map(([key, mat]) => (
                    <button key={key} onClick={() => setPrismMaterial(key)} style={{
                      padding: '12px', borderRadius: '12px',
                      border: prismMaterial === key ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: prismMaterial === key ? `${colors.primary}20` : colors.bgCard,
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                    }}>
                      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>{mat.name}</div>
                      <div style={{ color: colors.warning, fontSize: '12px' }}>{mat.dispersion.toFixed(1)}×</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cause-effect explanation */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📖 Key Physics Terms</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: colors.primaryLight }}>Dispersion</strong> is the variation of refractive index with wavelength. A material with higher dispersion separates colors more.
                <strong style={{ color: colors.warning }}> Refractive index (n)</strong> describes how much a material slows and bends light. Violet (n≈1.532) bends more than red (n≈1.513).
                The <strong style={{ color: colors.success }}>color spread</strong> is currently <span style={{ color: colors.warning, fontWeight: 700 }}>{totalSpread.toFixed(1)}°</span> — try changing the material to see the difference!
              </p>
            </div>

            {/* Data readout */}
            <div style={{ background: `${colors.primary}10`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}20` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div>
                  <div style={{ color: colors.primary, fontSize: '20px', fontWeight: 700 }}>{prismAngle.toFixed(0)}°</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px' }}>Prism Angle</div>
                </div>
                <div>
                  <div style={{ color: colors.warning, fontSize: '20px', fontWeight: 700 }}>{dispersionFactor.toFixed(1)}×</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px' }}>Dispersion</div>
                </div>
                <div>
                  <div style={{ color: colors.success, fontSize: '20px', fontWeight: 700 }}>{totalSpread.toFixed(1)}°</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px' }}>Color Spread</div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation →')}
      </div>
    );
  }

  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '8px' }}>Step 3 • Understanding</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>The Science of Color Separation</h2>
            </div>

            {/* Prediction result */}
            <div style={{
              background: prediction === 'refract' ? `${colors.success}15` : `${colors.error}15`,
              borderRadius: '12px', padding: '16px', marginBottom: '20px',
              border: `1px solid ${prediction === 'refract' ? colors.success : colors.error}40`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{prediction === 'refract' ? '✓' : '💡'}</span>
                <span style={{ color: prediction === 'refract' ? colors.success : colors.primaryLight, fontSize: '16px', fontWeight: 700 }}>
                  {prediction === 'refract' ? 'Your prediction was correct!' : 'Not quite — here is why:'}
                </span>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                You predicted that {prediction === 'refract' ? 'different wavelengths have different refractive indices' : 'another mechanism was responsible'}. The correct answer is that each color (wavelength) has a slightly different refractive index in glass. Because shorter wavelengths bend more, violet light exits at a steeper angle than red light, therefore creating the rainbow spectrum we observe. This demonstrates the principle of dispersion.
              </p>
            </div>

            {/* Formula */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SNELL'S LAW WITH DISPERSION</p>
              <p style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0, fontFamily: 'serif' }}>
                n₁ × sin(θ₁) = <span style={{ color: colors.primary }}>n(λ)</span> × sin(θ₂)
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', margin: '8px 0 0 0' }}>
                The refractive index n depends on wavelength λ — this is dispersion
              </p>
            </div>

            {/* Visual diagram */}
            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '16px' }}>
              {renderDispersionSVG(false)}
            </div>

            {/* Explanation cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Wavelength-Dependent n</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Violet (n≈1.532) bends more than red (n≈1.513) in crown glass. This ~1.3% difference shows how dispersion creates visible color separation.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔺</div>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Prism Geometry</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  The prism's angled faces refract light twice, amplifying the angular separation between colors. Larger apex angles = more spread.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🌈</div>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>ROYGBIV</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Red, Orange, Yellow, Green, Blue, Indigo, Violet — ordered by increasing refraction (decreasing wavelength).
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💎</div>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Material Matters</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Different materials have different dispersion. Diamond spreads colors 2.5× more than crown glass, creating brilliant "fire."
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Explore CD Rainbows →')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'diffraction', label: 'Microscopic grooves act as a diffraction grating', icon: '💿' },
      { id: 'coating', label: 'Special rainbow-colored coating on the surface', icon: '🎨' },
      { id: 'layers', label: 'Multiple thin layers create color interference', icon: '📚' },
      { id: 'prism', label: 'The plastic edge acts like a tiny prism', icon: '🔺' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-block', background: `${colors.warning}20`, borderRadius: '20px', padding: '6px 16px', border: `1px solid ${colors.warning}40`, marginBottom: '12px' }}>
                <span style={{ color: colors.warning, fontSize: '14px', fontWeight: 700 }}>🔄 TWIST CHALLENGE</span>
              </div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>The CD Rainbow Mystery</h2>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                A CD shows rainbow colors, but it's <strong style={{ color: colors.warning }}>flat — not prism-shaped</strong>. How does a flat disc create rainbows? This is a completely different mechanism from refraction!
              </p>
            </div>

            {/* CD illustration SVG */}
            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <svg width={isMobile ? 300 : 400} height={isMobile ? 220 : 260} viewBox={`0 0 ${isMobile ? 300 : 400} ${isMobile ? 220 : 260}`}>
                <defs>
                  <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <radialGradient id="twistCD" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#2a2a4a" />
                    <stop offset="100%" stopColor="#0f0f1e" />
                  </radialGradient>
                  <radialGradient id="twistRainbow" cx="35%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                    <stop offset="33%" stopColor="rgba(59, 130, 246, 0.35)" />
                    <stop offset="66%" stopColor="rgba(34, 197, 94, 0.35)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0.3)" />
                  </radialGradient>
                  <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#twistBg)" rx="12" />
                <g>
                  <circle cx="50%" cy="50%" r="80" fill="url(#twistCD)" />
                  <circle cx="50%" cy="50%" r="80" fill="url(#twistRainbow)" />
                  {[0.3, 0.45, 0.6, 0.75].map((r, i) => (
                    <circle key={i} cx="50%" cy="50%" r={80 * r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  ))}
                  <circle cx="50%" cy="50%" r="12" fill="#0a0f1a" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx="50%" cy="50%" r="80" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                </g>
                <text x="50%" y="20" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontFamily="sans-serif" fontWeight="700">CD Rainbow Pattern</text>
                <text x="50%" y={isMobile ? 210 : 250} fill={colors.textMuted} fontSize="12" textAnchor="middle" fontFamily="sans-serif">Flat surface creates diffraction colors</text>
              </svg>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 How does a flat CD create rainbow colors?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {twistPredictions.map(p => (
                  <button key={p.id} onClick={() => { setTwistPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                    backgroundColor: twistPrediction === p.id ? `${colors.warning}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.2s ease',
                  }}>
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {twistPrediction === p.id && <span style={{ color: colors.warning, fontSize: '20px', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Discover CD Physics →')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-block', background: `${colors.warning}20`, borderRadius: '20px', padding: '6px 16px', border: `1px solid ${colors.warning}40`, marginBottom: '12px' }}>
                <span style={{ color: colors.warning, fontSize: '14px', fontWeight: 700 }}>💿 DIFFRACTION GRATINGS</span>
              </div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>CD as a Diffraction Grating</h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ width: '100%', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {renderCDSVG()}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Controls */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎮 Controls</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: colors.textMuted, fontSize: '13px' }}>0.5μm</span>
                      <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>Track Spacing: {gratingSpacing.toFixed(1)}μm</span>
                      <span style={{ color: colors.warning, fontSize: '13px' }}>3.0μm</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value={gratingSpacing} onChange={(e) => setGratingSpacing(Number(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
                  </div>
                </div>

                {/* Comparison */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Diffraction vs. Refraction Dispersion</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.primary, fontWeight: 700, marginBottom: '4px', fontSize: '14px' }}>Prism (Refraction)</div>
                      <ul style={{ color: colors.textSecondary, fontSize: '13px', paddingLeft: '16px', margin: 0 }}>
                        <li>Blue bends MORE</li>
                        <li>Single spectrum</li>
                        <li>Based on n(λ)</li>
                      </ul>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.warning, fontWeight: 700, marginBottom: '4px', fontSize: '14px' }}>CD (Diffraction)</div>
                      <ul style={{ color: colors.textSecondary, fontSize: '13px', paddingLeft: '16px', margin: 0 }}>
                        <li>Red bends MORE</li>
                        <li>Multiple spectra</li>
                        <li>Based on d·sinθ = mλ</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div style={{ background: `${colors.warning}10`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.warning}30`, textAlign: 'center' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: 'serif' }}>
                    d × sin(θ) = m × λ
                  </p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
                    track spacing × sine of angle = order × wavelength
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Complete Picture →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Two Ways to Split Light!</h2>
            </div>

            {/* Twist prediction result */}
            <div style={{
              background: twistPrediction === 'diffraction' ? `${colors.success}15` : `${colors.error}15`,
              borderRadius: '12px', padding: '16px', marginBottom: '20px',
              border: `1px solid ${twistPrediction === 'diffraction' ? colors.success : colors.error}40`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{twistPrediction === 'diffraction' ? '✓' : '💡'}</span>
                <span style={{ color: twistPrediction === 'diffraction' ? colors.success : colors.primaryLight, fontSize: '16px', fontWeight: 700 }}>
                  {twistPrediction === 'diffraction' ? 'Exactly right!' : 'Interesting guess! Here is the explanation:'}
                </span>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                CD grooves act as a diffraction grating because light waves from adjacent grooves interfere. Different wavelengths constructively interfere at different angles. This demonstrates that dispersion and diffraction are two distinct physical mechanisms for separating colors.
              </p>
            </div>

            {/* Visual diagram */}
            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '16px' }}>
              {renderCDSVG()}
            </div>

            {/* Comparison cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: `${colors.primary}10`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}30` }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔺</div>
                <h3 style={{ color: colors.primary, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Dispersion (Prism)</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Wavelength-dependent refractive index. Violet bends most. Creates one spectrum.
                </p>
              </div>
              <div style={{ background: `${colors.warning}10`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.warning}30` }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💿</div>
                <h3 style={{ color: colors.warning, fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Diffraction (Grating)</h3>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Wavelength-dependent interference. Red bends most. Creates multiple spectra.
                </p>
              </div>
            </div>

            {/* Key equations */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Key Equations</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'serif', fontSize: '18px', color: colors.primary, fontWeight: 700 }}>n = n(λ)</div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>Dispersion</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'serif', fontSize: '18px', color: colors.warning, fontWeight: 700 }}>d·sin(θ) = mλ</div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>Diffraction Grating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real-World Applications →')}
      </div>
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '8px' }}>Real-World Applications</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Dispersion in the Real World</h2>
            </div>

            {/* App tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button key={i} onClick={() => { setSelectedApp(i); playSound('click'); }} style={{
                  padding: '10px 16px', borderRadius: '12px',
                  border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                  background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' as const, flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>}
                </button>
              ))}
            </div>

            {/* App content */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{app.icon}</div>
                <div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0 }}>{app.title}</h3>
                  <p style={{ color: app.color, fontSize: '14px', fontWeight: 600, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px', fontWeight: 400 }}>{app.description}</p>

              <div style={{ background: `${app.color}15`, borderRadius: '12px', padding: '16px', marginBottom: '20px', borderLeft: `4px solid ${app.color}` }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔗 Connection to Dispersion Physics:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>{app.connection}</p>
              </div>

              <div style={{ background: colors.bgDark, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>📊 Key Statistics:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ color: app.color, fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                      <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔧 How It Works:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6, fontWeight: 400 }}>{app.howItWorks}</p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🏢 Industry Leaders:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, fontWeight: 400 }}>
                  Companies using this technology: {app.companies.join(', ')}
                </p>
                <p style={{ color: colors.primary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic', fontWeight: 400 }}>
                  Future Impact: {app.futureImpact}
                </p>
              </div>
            </div>

            {/* Got It button */}
            <button onClick={() => {
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              playSound('success');
              const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
              if (nextIncomplete !== -1) setSelectedApp(nextIncomplete);
              else { const first = newCompleted.findIndex(c => !c); if (first !== -1) setSelectedApp(first); }
            }} disabled={completedApps[selectedApp]} style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: completedApps[selectedApp] ? colors.bgCardLight : `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
              color: completedApps[selectedApp] ? colors.textSecondary : 'white', fontSize: '16px', fontWeight: 700,
              cursor: completedApps[selectedApp] ? 'default' : 'pointer', minHeight: '52px',
              transition: 'all 0.2s ease',
            }}>
              {completedApps[selectedApp] ? '✓ Completed' : 'Got It! Continue →'}
            </button>
            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginTop: '12px' }}>
              {completedApps.filter(c => c).length} of 4 completed {allCompleted && '— Ready for test!'}
            </p>
          </div>
        </div>
        {renderBottomBar(true, allCompleted, 'Take the Test →')}
      </div>
    );
  }

  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => (o as any).correct)?.id;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>Question {testQuestion + 1} of 10</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i === testQuestion ? colors.primary : testAnswers[i] !== null ? colors.success : colors.bgCardLight }} />
                ))}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SCENARIO</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400, lineHeight: 1.6 }}>{currentQ.scenario}</p>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.primary}30` }}>
              <p style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>QUESTION</p>
              <h3 style={{ color: colors.textPrimary, fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: 0 }}>{currentQ.question}</h3>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', fontWeight: 400 }}>
              Read the scenario carefully and select the best answer below. Apply your understanding of dispersion, refraction, and wavelength-dependent phenomena to reason through each question.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedAnswer === opt.id;
                const showCorrect = showExplanation && (opt as any).correct;
                const showWrong = showExplanation && isSelected && !(opt as any).correct;
                return (
                  <button key={opt.id} onClick={() => { if (!showExplanation) { const a = [...testAnswers]; a[testQuestion] = opt.id; setTestAnswers(a); playSound('click'); } }} disabled={showExplanation} style={{
                    padding: '16px', borderRadius: '12px',
                    border: showCorrect ? `2px solid ${colors.success}` : showWrong ? `2px solid ${colors.error}` : isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: showCorrect ? `${colors.success}15` : showWrong ? `${colors.error}15` : isSelected ? `${colors.primary}20` : colors.bgCard,
                    cursor: showExplanation ? 'default' : 'pointer', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.2s ease',
                  }}>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{opt.label}</span>
                    {showCorrect && <span style={{ color: colors.success, fontSize: '20px' }}>✓</span>}
                    {showWrong && <span style={{ color: colors.error, fontSize: '20px' }}>✗</span>}
                    {!showExplanation && isSelected && <span style={{ color: colors.primary, fontSize: '20px' }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && !showExplanation && (
              <button onClick={() => { setShowExplanation(true); playSound(isCorrect ? 'success' : 'failure'); }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Check Answer</button>
            )}

            {showExplanation && (
              <div style={{ background: isCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${isCorrect ? colors.success : colors.primary}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '💡'}</span>
                  <span style={{ color: isCorrect ? colors.success : colors.primaryLight, fontSize: '16px', fontWeight: 700 }}>{isCorrect ? 'Correct!' : 'Explanation'}</span>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{currentQ.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {showExplanation ? (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, minHeight: '72px', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '12px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => { if (testQuestion < 9) { setTestQuestion(testQuestion + 1); setShowExplanation(false); playSound('click'); } else { goToPhase('mastery'); } }} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '200px', transition: 'all 0.2s ease' }}>
              {testQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        ) : renderBottomBar(true, false, 'Select an answer')}
      </div>
    );
  }

  if (phase === 'mastery') {
    const score = calculateTestScore();
    const percentage = score * 10;
    const passed = percentage >= 70;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🌈' : '📚'}</div>
            <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
              {passed ? 'Dispersion Mastery!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>
              {passed ? 'Congratulations! You understand how white light separates into colors!' : 'Review dispersion concepts and try again.'}
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '32px', marginBottom: '24px', border: `1px solid ${passed ? colors.success : colors.border}40` }}>
              <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>{percentage}%</div>
              <p style={{ color: colors.textSecondary, fontSize: '16px', margin: 0 }}>{score} of 10 correct</p>
              <div style={{ height: '8px', background: colors.bgDark, borderRadius: '4px', marginTop: '20px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: passed ? `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)` : `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`, borderRadius: '4px' }} />
              </div>
            </div>

            {/* Answer review section */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', textAlign: 'left' as const, marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📊 Answer Review:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {testQuestions.map((q, i) => {
                  const userAnswer = testAnswers[i];
                  const correctAnswer = q.options.find(o => (o as any).correct)?.id;
                  const isCorrect = userAnswer === correctAnswer;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', background: isCorrect ? `${colors.success}10` : `${colors.error}10` }}>
                      <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '✗'}</span>
                      <span style={{ color: colors.textSecondary, fontSize: '14px', flex: 1 }}>Question {i + 1}</span>
                      <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px', fontWeight: 600 }}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', textAlign: 'left' as const, marginBottom: '24px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🎓 What You Learned:</h3>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 2, margin: 0, paddingLeft: '20px' }}>
                <li>Dispersion is the variation of refractive index with wavelength</li>
                <li>Violet bends most, red bends least (in glass)</li>
                <li>Diamond has 2.5× the dispersion of crown glass</li>
                <li>CD rainbows use diffraction, not refraction</li>
                <li>Dispersion formula: Δθ = n(λ) × α × D</li>
              </ul>
            </div>

            {/* Rainbow spectrum bar */}
            <div style={{ display: 'flex', gap: '4px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
              {WAVELENGTHS.map((c) => (
                <div key={c.key} style={{ flex: 1, height: '30px', background: c.color, borderRadius: '4px' }} />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!passed && <button onClick={() => goToPhase('predict')} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>🔄 Try Again</button>}
              <button onClick={() => { onComplete?.(); playSound('complete'); }} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textPrimary, fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>← Return to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DispersionRenderer;
