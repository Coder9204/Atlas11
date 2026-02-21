'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// FRESNEL ZONES RENDERER - RADIO WAVE PROPAGATION
// Complete 10-Phase Game teaching Fresnel zone physics in wireless communications
// =============================================================================

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

interface FresnelZonesRendererProps {
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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "A wireless engineer is planning a 5 km microwave backhaul link between two cell towers. The direct line-of-sight is clear, but a building rises 15 meters above the direct path at the midpoint.",
    question: "Why might this link still fail even with clear line-of-sight?",
    options: [
      { id: 'a', label: "The building blocks the antenna's radiation pattern" },
      { id: 'b', label: "The building intrudes into the first Fresnel zone, causing diffraction losses", correct: true },
      { id: 'c', label: "Microwave links cannot span 5 km distances" },
      { id: 'd', label: "The building reflects too much signal back to the transmitter" }
    ],
    explanation: "Radio waves don't travel in pencil-thin lines - they spread out in an ellipsoidal pattern. The first Fresnel zone can be tens of meters wide at midpoint. Even if the building doesn't touch the direct path, intruding into this zone causes diffraction losses that degrade signal quality."
  },
  {
    scenario: "Two identical WiFi bridges are installed: one at 2.4 GHz over 100 meters, another at 5 GHz over the same 100 meters. Both have clear line-of-sight and identical antenna heights.",
    question: "Which link has the larger first Fresnel zone radius at midpoint?",
    options: [
      { id: 'a', label: "The 5 GHz link has a larger Fresnel zone" },
      { id: 'b', label: "The 2.4 GHz link has a larger Fresnel zone", correct: true },
      { id: 'c', label: "Both have identical Fresnel zone sizes" },
      { id: 'd', label: "Fresnel zones don't apply to WiFi frequencies" }
    ],
    explanation: "Fresnel zone radius is proportional to the square root of wavelength. Since wavelength = c/frequency, lower frequencies have longer wavelengths and thus larger Fresnel zones. At 2.4 GHz (12.5 cm wavelength) vs 5 GHz (6 cm), the 2.4 GHz link has a Fresnel zone about 1.4x larger."
  },
  {
    scenario: "A rural internet service provider's 900 MHz link works perfectly in winter but experiences intermittent outages during summer months. No changes were made to the equipment.",
    question: "What is the most likely cause of the summer signal degradation?",
    options: [
      { id: 'a', label: "Summer heat causes equipment to overheat" },
      { id: 'b', label: "Deciduous trees in the Fresnel zone grow leaves that obstruct the signal", correct: true },
      { id: 'c', label: "Higher atmospheric humidity blocks 900 MHz signals" },
      { id: 'd', label: "Solar interference increases during summer months" }
    ],
    explanation: "At 900 MHz, the first Fresnel zone can be several meters wide. Trees that are bare in winter may grow leaves that intrude into this zone during summer. Even partial obstruction causes diffraction losses. This seasonal variation is a common issue in rural wireless deployments."
  },
  {
    scenario: "An engineer calculates the first Fresnel zone radius at midpoint for a 10 km link using the formula r = sqrt(n × lambda × d1 × d2 / (d1 + d2)). At 6 GHz, she gets 12.5 meters.",
    question: "What happens to the Fresnel zone radius at a point 2 km from the transmitter (8 km from receiver)?",
    options: [
      { id: 'a', label: "It remains 12.5 meters throughout the path" },
      { id: 'b', label: "It becomes smaller because the zone is narrower near the endpoints", correct: true },
      { id: 'c', label: "It becomes larger because more path length remains" },
      { id: 'd', label: "The formula doesn't apply at non-midpoint locations" }
    ],
    explanation: "The Fresnel zone is an ellipsoid, widest at midpoint and tapering toward both ends. At any point, radius depends on d1×d2/(d1+d2). At midpoint (d1=d2=5km), this equals 2.5km. At 2km/8km, it equals 1.6km - giving a smaller radius. This is why Fresnel clearance is most critical at midpoint."
  },
  {
    scenario: "A telecommunications company is upgrading from 6 GHz microwave links to 80 GHz millimeter-wave for higher bandwidth. They plan to use the same tower heights.",
    question: "How will the Fresnel zone requirements change?",
    options: [
      { id: 'a', label: "The 80 GHz links need taller towers due to larger Fresnel zones" },
      { id: 'b', label: "The 80 GHz links can use shorter towers due to smaller Fresnel zones", correct: true },
      { id: 'c', label: "Tower height requirements remain the same" },
      { id: 'd', label: "Millimeter-wave links don't have Fresnel zones" }
    ],
    explanation: "At 80 GHz, the wavelength is only 3.75mm compared to 50mm at 6 GHz. The Fresnel zone radius is proportional to sqrt(wavelength), so the 80 GHz zone is about 3.6x smaller. This means less clearance is needed, allowing lower tower heights - but 80 GHz has other challenges like rain fade."
  },
  {
    scenario: "A network engineer notices that a point-to-point wireless link shows different signal quality readings throughout the day, with best performance in early morning and worst at midday.",
    question: "What phenomenon related to Fresnel zones might cause this pattern?",
    options: [
      { id: 'a', label: "Solar radiation directly interferes with radio frequencies" },
      { id: 'b', label: "Thermal gradients cause atmospheric refraction, changing the effective path and Fresnel clearance", correct: true },
      { id: 'c', label: "The sun physically blocks the Fresnel zone at midday" },
      { id: 'd', label: "Equipment efficiency decreases as temperature rises" }
    ],
    explanation: "Atmospheric refraction varies with temperature gradients. The K-factor (effective Earth radius factor) changes throughout the day. At midday, thermal conditions can cause the radio path to bend, reducing effective Fresnel clearance over terrain. Links are typically designed for worst-case K-factor conditions."
  },
  {
    scenario: "A satellite earth station designer must ensure reliable links to satellites. They consider both the uplink at 14 GHz and downlink at 12 GHz.",
    question: "Why are Fresnel zone obstructions less of a concern for satellite links compared to terrestrial microwave links?",
    options: [
      { id: 'a', label: "Satellites use different physics than ground-based radio" },
      { id: 'b', label: "The extreme distance makes Fresnel zones astronomically large, but the near-vertical path clears terrestrial obstacles easily", correct: true },
      { id: 'c', label: "Fresnel zones don't exist in space" },
      { id: 'd', label: "Satellite frequencies are immune to diffraction" }
    ],
    explanation: "While Fresnel zones grow with path length, satellite paths point mostly upward. Buildings and terrain near the earth station are far from the midpoint where zones are widest. The key concern becomes the antenna's elevation angle - low-angle links have larger terrestrial Fresnel clearance requirements."
  },
  {
    scenario: "Two antennas are being synchronized before connecting a new generator to the power grid. Engineers watch oscilloscopes showing the generator's waveform compared to the grid waveform.",
    question: "How does the Fresnel zone concept from optics relate to this power engineering scenario?",
    options: [
      { id: 'a', label: "Power grids use Fresnel lenses for voltage transformation" },
      { id: 'b', label: "Both involve wave interference - radio waves in Fresnel zones and AC waveforms in synchronization", correct: true },
      { id: 'c', label: "There is no relationship between these concepts" },
      { id: 'd', label: "Fresnel zones determine optimal cable routing" }
    ],
    explanation: "Fresnel zones describe regions where waves arrive within specific phase relationships. Similarly, generator synchronization requires matching phase angles. Both concepts stem from wave physics - whether electromagnetic waves interfering in space or AC waveforms that must align before electrical connection."
  },
  {
    scenario: "A lighthouse uses a Fresnel lens designed in the 1820s that remains in service today. The lens concentrates light from a small lamp into a powerful beam visible 20+ nautical miles away.",
    question: "How do Fresnel lenses achieve the same optical effect as much heavier conventional lenses?",
    options: [
      { id: 'a', label: "They use special materials that bend light more efficiently" },
      { id: 'b', label: "Concentric rings preserve the refracting surface angle while eliminating unnecessary glass thickness", correct: true },
      { id: 'c', label: "They amplify light through chemical reactions" },
      { id: 'd', label: "Multiple reflections inside the lens multiply the light intensity" }
    ],
    explanation: "Augustin-Jean Fresnel realized that only the surface angle matters for refraction, not the thickness behind it. By dividing a lens into concentric rings and collapsing each to minimum thickness, he created lightweight lenses with the same optical power. Light from each ring arrives in phase at the focus - the same wave interference principle behind Fresnel zones."
  },
  {
    scenario: "A drone operator flying a survey mission notices video feed quality degrades when the drone flies behind a ridge, even though the ridge doesn't completely block line-of-sight to the controller.",
    question: "What radio propagation principle explains this degradation?",
    options: [
      { id: 'a', label: "The ridge creates electromagnetic interference" },
      { id: 'b', label: "The ridge causes knife-edge diffraction by partially obstructing the Fresnel zone", correct: true },
      { id: 'c', label: "The ridge reflects signals away from the controller" },
      { id: 'd', label: "Rock composition in the ridge absorbs radio frequencies" }
    ],
    explanation: "When an obstacle intrudes into the Fresnel zone without completely blocking line-of-sight, it causes knife-edge diffraction. The signal bends around the obstacle but loses energy. The closer the obstruction to the direct path centerline, the greater the diffraction loss. This is why Fresnel clearance - not just line-of-sight - determines link quality."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// =============================================================================
const realWorldApps = [
  {
    icon: '📡',
    title: 'Microwave Link Planning',
    short: 'Ensuring clear paths for wireless backhaul',
    tagline: 'The invisible highways connecting cell towers',
    description: 'Microwave links form the backbone of cellular networks, connecting cell towers to the core network. Engineers must carefully plan these point-to-point links to ensure the first Fresnel zone remains at least 60% clear of obstructions. A single tree or building in the wrong place can degrade a multi-gigabit link.',
    connection: 'The ellipsoidal Fresnel zone you explored shows exactly why engineers calculate clearance at every point along a path, not just the endpoints. The zone is widest at midpoint - that\'s where obstructions cause the most damage.',
    howItWorks: 'Engineers use path profile analysis software to map terrain and obstacles between two points. They calculate the first Fresnel zone radius at every point using r = sqrt(n×lambda×d1×d2/(d1+d2)). Antenna heights are chosen to maintain 60-100% first zone clearance, accounting for Earth curvature (K-factor) and worst-case atmospheric refraction.',
    stats: [
      { value: '60%', label: 'Minimum clearance', icon: '📊' },
      { value: '80 GHz', label: 'E-band frequency', icon: '📶' },
      { value: '50 km', label: 'Max link distance', icon: '📏' }
    ],
    examples: ['Cellular backhaul connecting thousands of towers', 'Enterprise campus links between buildings', 'Broadcasting studio-to-transmitter links', 'Emergency services networks'],
    companies: ['Ericsson', 'Nokia', 'Huawei', 'Cambium Networks'],
    futureImpact: 'As 5G networks densify with small cells, microwave and millimeter-wave backhaul become even more critical. AI-powered planning tools will automatically optimize link placement.',
    color: '#22D3EE'
  },
  {
    icon: '💡',
    title: 'Fresnel Lens Design',
    short: 'Bending light with elegant simplicity',
    tagline: 'From lighthouses to VR headsets',
    description: 'Fresnel lenses collapse the curved surface of a conventional lens into concentric rings, dramatically reducing thickness and weight while maintaining optical power. Invented for lighthouses in 1822, they now appear in everything from overhead projectors to solar concentrators and VR headsets.',
    connection: 'The same wave interference principles that create Fresnel zones in radio propagation make Fresnel lenses work. Each ring is spaced so light arrives in phase at the focal point - constructive interference maximizes intensity.',
    howItWorks: 'A Fresnel lens divides a conventional lens surface into concentric annular sections. Each ring has the same focal length but reduced thickness. Light passing through adjacent rings travels different path lengths but arrives at the focus with the same phase, creating constructive interference. Modern manufacturing creates rings as fine as 0.1mm.',
    stats: [
      { value: '90%', label: 'Weight reduction', icon: '⚖️' },
      { value: '1000x', label: 'Solar concentration', icon: '☀️' },
      { value: '0.1mm', label: 'Finest groove pitch', icon: '🔬' }
    ],
    examples: ['Lighthouse beacons visible 20+ nautical miles', 'Theatrical stage lighting', 'Solar concentrators for energy', 'VR headset lenses'],
    companies: ['Fresnel Technologies', 'Edmund Optics', 'Carclo Optics', 'Orafol'],
    futureImpact: 'Metalenses using nanostructured surfaces will eventually replace Fresnel lenses for many applications, offering even thinner profiles and wavelength-scale control.',
    color: '#FBBF24'
  },
  {
    icon: '🔭',
    title: 'Radio Telescope Arrays',
    short: 'Seeing the universe in radio waves',
    tagline: 'Combining signals across kilometers for cosmic resolution',
    description: 'Radio telescope arrays like ALMA and the VLA combine signals from multiple antennas spread across kilometers to achieve angular resolution impossible with single dishes. The spacing between antennas must account for Fresnel zones to properly combine wavefronts.',
    connection: 'When radio waves from a cosmic source reach an array, each antenna samples a different part of the incoming wavefront. Signals must be combined with precise time delays accounting for path differences - the same physics that defines Fresnel zones.',
    howItWorks: 'Each antenna pair forms a "baseline" that samples one spatial frequency of the sky brightness. Signals are timestamped with atomic clocks and combined in a correlator. The array\'s resolution equals that of a dish with diameter equal to the maximum baseline. Fresnel distance D²/lambda determines near-field vs far-field imaging.',
    stats: [
      { value: '16 km', label: 'VLA max baseline', icon: '📡' },
      { value: '66', label: 'ALMA antennas', icon: '🔭' },
      { value: '10,000 km', label: 'VLBI baselines', icon: '🌍' }
    ],
    examples: ['First black hole image by Event Horizon Telescope', 'Cosmic microwave background mapping', 'Pulsar detection', 'SETI searches'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'MIT Haystack Observatory'],
    futureImpact: 'The Square Kilometre Array will have thousands of antennas across continents. Space-based arrays could achieve baselines larger than Earth.',
    color: '#A78BFA'
  },
  {
    icon: '📶',
    title: 'Wireless Network Planning',
    short: 'Designing reliable WiFi coverage',
    tagline: 'Why line-of-sight isn\'t enough for WiFi',
    description: 'Enterprise wireless networks require careful RF planning. Fresnel zone analysis helps engineers understand why WiFi signals degrade around obstacles, across open spaces, and through materials. A "clear" path isn\'t enough for reliable wireless.',
    connection: 'At 2.4 GHz over 50 meters, the first Fresnel zone radius is about 1.8 meters - significant compared to room dimensions. A conference table or partial wall can obstruct the zone and cause degradation even with line-of-sight.',
    howItWorks: 'Network planners use predictive modeling software that calculates Fresnel zones between each access point and client locations. The software accounts for furniture, walls with material-specific attenuation, and even people as obstructions. Optimal AP placement maintains adequate Fresnel clearance while minimizing interference.',
    stats: [
      { value: '1.8m', label: 'Zone radius at 50m', icon: '📐' },
      { value: '-67 dBm', label: 'Min voice/video', icon: '📊' },
      { value: '25%', label: 'Capacity loss risk', icon: '📉' }
    ],
    examples: ['Stadium WiFi for 80,000 users', 'Hospital coverage requirements', 'Warehouse IoT tracking', 'Smart factory sensors'],
    companies: ['Cisco Meraki', 'Aruba Networks', 'Ekahau', 'iBwave'],
    futureImpact: 'WiFi 7 uses higher frequencies where Fresnel zones are smaller but attenuation is higher. AI-driven networks will continuously optimize based on real-time conditions.',
    color: '#10B981'
  }
];

// Slider style constant
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
  cursor: 'pointer',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const FresnelZonesRenderer: React.FC<FresnelZonesRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [frequency, setFrequency] = useState(2.4); // GHz
  const [distance, setDistance] = useState(1000); // meters
  const [obstacleHeight, setObstacleHeight] = useState(0); // percentage of first Fresnel zone
  const [showZones, setShowZones] = useState(3);
  const [animationFrame, setAnimationFrame] = useState(0);

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
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#22D3EE',
    accentGlow: 'rgba(34, 211, 238, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    zone1: '#22D3EE',
    zone2: '#A78BFA',
    zone3: '#F472B6',
    signal: '#FBBF24',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Calculate Fresnel zone radii
  const wavelength = 0.3 / frequency;
  const fresnelRadius1 = Math.sqrt(wavelength * distance / 4);
  const fresnelRadius2 = Math.sqrt(2 * wavelength * distance / 4);
  const fresnelRadius3 = Math.sqrt(3 * wavelength * distance / 4);

  // Signal loss calculation
  const signalLoss = obstacleHeight > 60 ?
    6 + (obstacleHeight - 60) * 0.5 :
    obstacleHeight > 0 ? obstacleHeight * 0.1 : 0;

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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'fresnel-zones',
        gameTitle: 'Fresnel Zones',
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
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Get signal status
  const getSignalStatus = () => {
    if (signalLoss < 1) return { status: 'Excellent', color: colors.success };
    if (signalLoss < 3) return { status: 'Good', color: colors.zone1 };
    if (signalLoss < 6) return { status: 'Degraded', color: colors.warning };
    return { status: 'Critical', color: colors.error };
  };

  const signalStatus = getSignalStatus();

  // Fresnel Zone Visualization as render function (not component)
  const renderFresnelVisualization = (interactive: boolean = false, isStatic: boolean = false) => {
    const width = isMobile ? 360 : 520;
    const height = 350;
    const margin = 40;
    const pathY = height / 2;

    const txX = margin + 30;
    const rxX = width - margin - 30;
    const pathLength = rxX - txX;
    const midX = (txX + rxX) / 2;

    // Scale Fresnel radii for visualization
    const visualScale = 80 / fresnelRadius1;
    const r1Visual = fresnelRadius1 * visualScale;
    const r2Visual = fresnelRadius2 * visualScale;
    const r3Visual = fresnelRadius3 * visualScale;

    // Obstacle
    const obstacleX = midX;
    const obstacleHeight_px = (obstacleHeight / 100) * r1Visual;

    // Wave animation
    const waveOffset = (animationFrame * 3) % 60;

    // Interactive point position (moves with obstacle)
    const pointY = pathY - obstacleHeight_px;
    const pointX = obstacleX;

    // Build a path for the signal strength curve (at least 25% of SVG height)
    const curvePoints: string[] = [];
    const numPts = 20;
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts;
      const px = txX + t * pathLength;
      // Parabolic curve representing signal strength
      const baseY = height - 30;
      const curveHeight = height * 0.3; // 30% of height minimum
      const py = baseY - curveHeight * 4 * t * (1 - t) * (1 - obstacleHeight / 200);
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Fresnel Zones visualization">
        <defs>
          <linearGradient id="zone1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.zone1} stopOpacity="0.3" />
            <stop offset="50%" stopColor={colors.zone1} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.zone1} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="zone2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.zone2} stopOpacity="0.2" />
            <stop offset="50%" stopColor={colors.zone2} stopOpacity="0.05" />
            <stop offset="100%" stopColor={colors.zone2} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="zone3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.zone3} stopOpacity="0.15" />
            <stop offset="50%" stopColor={colors.zone3} stopOpacity="0.03" />
            <stop offset="100%" stopColor={colors.zone3} stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.signal} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.signal} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="#0f172a" />

        {/* Grid lines for visual reference */}
        <g>
          <line x1={txX} y1={margin} x2={txX} y2={height - 25} stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <line x1={midX} y1={margin} x2={midX} y2={height - 25} stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <line x1={rxX} y1={margin} x2={rxX} y2={height - 25} stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <line x1={txX} y1={pathY - 60} x2={rxX} y2={pathY - 60} stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <line x1={txX} y1={pathY + 60} x2={rxX} y2={pathY + 60} stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        </g>

        {/* Ground */}
        <g>
          <rect x="0" y={height - 25} width={width} height="25" fill="#374151" />
          <line x1="0" y1={height - 25} x2={width} y2={height - 25} stroke="#4b5563" strokeWidth="2" />
        </g>

        {/* Fresnel zones */}
        <g>
          {showZones >= 3 && (
            <ellipse cx={midX} cy={pathY} rx={pathLength / 2} ry={r3Visual}
              fill="url(#zone3Grad)" stroke={colors.zone3} strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
          )}
          {showZones >= 2 && (
            <ellipse cx={midX} cy={pathY} rx={pathLength / 2} ry={r2Visual}
              fill="url(#zone2Grad)" stroke={colors.zone2} strokeWidth="1" strokeDasharray="4,4" opacity="0.7" />
          )}
          {showZones >= 1 && (
            <ellipse cx={midX} cy={pathY} rx={pathLength / 2} ry={r1Visual}
              fill="url(#zone1Grad)" stroke={colors.zone1} strokeWidth="2" opacity="0.9" />
          )}
        </g>

        {/* Animated wave propagation */}
        <g>
          {[0, 1, 2, 3].map(i => {
            const offset = (waveOffset + i * 15) % 60;
            const progress = offset / 60;
            const x = txX + progress * pathLength;
            return (
              <circle key={i} cx={x} cy={pathY} r={4 + progress * 6}
                fill="none" stroke={colors.signal} strokeWidth="2" opacity={1 - progress} />
            );
          })}
        </g>

        {/* Direct path line */}
        <g>
          <line x1={txX} y1={pathY} x2={rxX} y2={pathY}
            stroke={colors.signal} strokeWidth="2" strokeDasharray="8,4" />
        </g>

        {/* Signal strength curve (path with L commands) */}
        <g>
          <path d={curvePath} fill="none" stroke={colors.success} strokeWidth="2" opacity="0.6" />
        </g>

        {/* Obstacle */}
        {obstacleHeight > 0 && (
          <g>
            <rect x={obstacleX - 15} y={pathY - obstacleHeight_px}
              width="30" height={obstacleHeight_px + (height - 25 - pathY)}
              fill="#64748b" stroke={obstacleHeight > 60 ? colors.error : colors.warning} strokeWidth="2" rx="3" />
            <text x={obstacleX} y={pathY - obstacleHeight_px - 8} textAnchor="middle"
              fill={obstacleHeight > 60 ? colors.error : colors.warning} fontSize="11" fontWeight="600">
              {obstacleHeight}% blocked
            </text>
          </g>
        )}

        {/* Transmitter */}
        <g>
          <circle cx={txX} cy={pathY} r="20" fill="url(#antennaGlow)" />
          <rect x={txX - 5} y={pathY} width="10" height="50" fill="#475569" rx="2" />
          <polygon points={`${txX - 12},${pathY} ${txX},${pathY - 20} ${txX + 12},${pathY}`} fill={colors.zone1} />
          <text x={txX} y={pathY + 70} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">TX</text>
        </g>

        {/* Receiver */}
        <g>
          <circle cx={rxX} cy={pathY} r="20" fill="url(#antennaGlow)" />
          <rect x={rxX - 5} y={pathY} width="10" height="50" fill="#475569" rx="2" />
          <polygon points={`${rxX - 12},${pathY} ${rxX},${pathY - 20} ${rxX + 12},${pathY}`} fill={colors.zone1} />
          <text x={rxX} y={pathY + 70} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">RX</text>
        </g>

        {/* Zone labels */}
        <g>
          <text x={midX + pathLength / 4} y={pathY - r1Visual - 8} textAnchor="middle" fill={colors.zone1} fontSize="11" fontWeight="bold">1st Fresnel</text>
          {showZones >= 2 && (
            <text x={midX + pathLength / 4} y={pathY - r2Visual - 5} textAnchor="middle" fill={colors.zone2} fontSize="11">2nd Zone</text>
          )}
          {showZones >= 3 && (
            <text x={midX + pathLength / 4} y={pathY - r3Visual - 5} textAnchor="middle" fill={colors.zone3} fontSize="11">3rd Zone</text>
          )}
        </g>

        {/* Axis labels */}
        <g>
          <text x={midX} y={height - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">Distance (m)</text>
          <text x={15} y={pathY} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600" transform={`rotate(-90, 15, ${pathY})`}>Frequency</text>
        </g>

        {/* Info panel */}
        <g>
          <rect x="10" y="10" width="130" height="75" fill={colors.bgSecondary} rx="8" opacity="0.95" />
          <text x="20" y="28" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Fresnel Analysis</text>
          <text x="20" y="44" fill={colors.textSecondary} fontSize="11">Freq: {frequency.toFixed(1)} GHz</text>
          <text x="20" y="58" fill={colors.textSecondary} fontSize="11">Dist: {distance} m</text>
          <text x="20" y="72" fill={colors.zone1} fontSize="11" fontWeight="600">R1: {fresnelRadius1.toFixed(1)} m</text>
        </g>

        {/* Signal quality indicator */}
        <g>
          <rect x={width - 120} y="10" width="110" height="55" fill={colors.bgSecondary} rx="8" opacity="0.95" />
          <text x={width - 115} y="28" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Signal Quality</text>
          <rect x={width - 115} y="36" width="95" height="10" fill="#1e293b" rx="4" />
          <rect x={width - 115} y="36" width={95 * Math.max(0, 1 - signalLoss / 15)} height="10" fill={signalStatus.color} rx="4" />
          <text x={width - 115} y="58" fill={signalStatus.color} fontSize="11" fontWeight="600">{signalStatus.status}</text>
        </g>

        {/* Interactive point marker - moves with obstacle */}
        {interactive && (
          <circle cx={pointX} cy={pointY} r={8} fill={colors.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
        )}
      </svg>
    );
  };

  // Progress bar render function
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Bottom navigation bar with Back/Next and nav dots
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestPhase = phase === 'test';
    const isLast = currentIndex === phaseOrder.length - 1;
    const nextDisabled = isLast || isTestPhase;
    return (
      <>
        {/* Nav dots - separate fixed bar above the bottom nav */}
        <div style={{
          position: 'fixed',
          bottom: 68,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 0',
          zIndex: 1001,
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
                padding: 0,
              }}
              aria-label={phaseLabels[p]}
            />
          ))}
        </div>
        {/* Back / Next buttons - the fixed footer */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: '12px',
          background: colors.bgPrimary,
          borderTop: `1px solid ${colors.border}`,
          zIndex: 1000,
          padding: '10px 16px 12px',
        }}>
          <button
            onClick={prevPhase}
            disabled={currentIndex === 0}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: currentIndex === 0 ? colors.border : colors.textSecondary,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '15px',
              minHeight: '48px',
            }}
          >
            ← Back
          </button>
          <button
            onClick={nextDisabled ? undefined : nextPhase}
            disabled={nextDisabled}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
              color: 'white',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '15px',
              minHeight: '48px',
            }}
          >
            Next →
          </button>
        </div>
      </>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '48px',
  };

  // =============================================================================
  // PHASE RENDERS
  // =============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          📡🌊📶
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Fresnel Zones
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Two antennas with perfect line-of-sight. Nothing between them but air. Yet engineers obsess over an <span style={{ color: colors.accent }}>invisible ellipse of empty space</span>. What could possibly matter in thin air?
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
            Radio waves do not travel in pencil-thin lines. Understanding the space they actually occupy is the difference between a reliable link and mysterious failures.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — RF Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Hidden Physics →
        </button>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Only the direct line-of-sight path matters for signal quality' },
      { id: 'b', text: 'Radio waves need clearance in a wider zone around the direct path', correct: true },
      { id: 'c', text: 'Any obstacle touching the path completely blocks the signal' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            A cell tower microwave link has a building nearby that doesn't touch the direct path. Will this affect signal quality?
          </h2>

          {/* Static SVG diagram for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderFresnelVisualization(false, true)}
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
              Test My Prediction →
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Fresnel Zone Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Add an obstacle and watch how it affects signal quality - even without blocking line-of-sight. This is important for real-world engineering design and helps us understand practical wireless technology.
          </p>

          {/* Physics definition and formula */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}40`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0, fontWeight: 500 }}>
              The Fresnel zone is defined as the ellipsoidal region where radio waves arrive within half a wavelength of the direct path. The radius is calculated by: r = √(n × λ × d₁ × d₂ / (d₁ + d₂))
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderFresnelVisualization(true)}
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
              }}>
                {/* Obstacle slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Obstacle Height</span>
                    <span style={{ ...typo.small, color: obstacleHeight > 60 ? colors.error : obstacleHeight > 0 ? colors.warning : colors.success, fontWeight: 600 }}>
                      {obstacleHeight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={obstacleHeight}
                    onChange={(e) => setObstacleHeight(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Clear</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Full</span>
                  </div>
                </div>

                {/* Distance slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Link Distance</span>
                    <span style={{ ...typo.small, color: colors.zone1, fontWeight: 600 }}>{distance} m</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={distance}
                    onChange={(e) => setDistance(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                {/* Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.zone1, fontSize: '16px' }}>{fresnelRadius1.toFixed(1)} m</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>1st Zone</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: signalStatus.color, fontSize: '16px' }}>{signalLoss.toFixed(1)} dB</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Loss</div>
                  </div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: signalStatus.color, fontSize: '16px' }}>{signalStatus.status}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Link Quality</div>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {obstacleHeight > 0 && obstacleHeight <= 40 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice: The obstacle doesn't touch the line-of-sight, but signal is already degrading!
              </p>
            </div>
          )}

          {obstacleHeight > 60 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Critical: More than 60% of the first Fresnel zone is blocked - link unreliable!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics →
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Fresnel Zones Matter
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.zone1, marginBottom: '16px' }}>
              The Physics of Radio Wave Propagation
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              As you observed in the experiment, radio waves don't travel in pencil-thin lines - they spread out like ripples. The <strong style={{ color: colors.textPrimary }}>first Fresnel zone</strong> is an ellipsoidal region where waves arrive within half a wavelength of the direct path.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Waves within this zone <strong style={{ color: colors.success }}>add constructively</strong> to strengthen the signal. When obstacles intrude, they cause <strong style={{ color: colors.error }}>diffraction losses</strong> even without blocking line-of-sight. Your prediction about obstruction was tested in the experiment.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.signal, marginBottom: '16px' }}>
              The Fresnel Radius Formula
            </h3>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <code style={{ fontSize: '18px', color: colors.textPrimary }}>r = √(n × λ × d₁ × d₂ / (d₁ + d₂))</code>
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Where <strong>n</strong> = zone number, <strong>λ</strong> = wavelength, <strong>d₁</strong> and <strong>d₂</strong> = distances to endpoints. At midpoint, this simplifies to r = √(n × λ × D / 4).
            </p>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: The 60% Rule
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Engineers require at least <strong style={{ color: colors.success }}>60% of the first Fresnel zone</strong> to be clear of obstructions. This provides adequate margin for reliable links with minimal diffraction loss.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Frequency Effect →
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Higher frequencies need the same Fresnel zone clearance' },
      { id: 'b', text: 'Higher frequencies need larger Fresnel zone clearance' },
      { id: 'c', text: 'Higher frequencies need smaller Fresnel zone clearance', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Frequency
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            5G networks use millimeter-wave frequencies (28-80 GHz) while 4G uses lower frequencies (700 MHz - 2.5 GHz). How does this affect Fresnel zone clearance requirements?
          </h2>

          {/* Static SVG for twist_predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderFresnelVisualization(false, true)}
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
              See the Frequency Effect →
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Frequency vs Fresnel Zones
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare how different frequencies affect zone size over the same distance
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderFresnelVisualization(true)}
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
              }}>
                {/* Frequency slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Frequency</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{frequency.toFixed(1)} GHz</span>
                  </div>
                  <input
                    type="range"
                    min="0.9"
                    max="80"
                    step="0.1"
                    value={frequency}
                    onChange={(e) => setFrequency(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>4G</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>WiFi</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>mmWave</span>
                  </div>
                </div>

                {/* Zones toggle */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Visible Zones</span>
                    <span style={{ ...typo.small, color: colors.zone2, fontWeight: 600 }}>{showZones}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={showZones}
                    onChange={(e) => setShowZones(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                {/* Comparison cards */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  borderLeft: `3px solid ${colors.zone1}`,
                  marginBottom: '8px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.zone1, fontWeight: 600, marginBottom: '4px' }}>
                    Low Freq (900 MHz)
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    R1 = {Math.sqrt(0.333 * 1000 / 4).toFixed(1)} m at 1 km
                  </p>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  borderLeft: `3px solid ${colors.zone2}`,
                }}>
                  <h4 style={{ ...typo.small, color: colors.zone2, fontWeight: 600, marginBottom: '4px' }}>
                    High Freq (60 GHz)
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    R1 = {Math.sqrt(0.005 * 1000 / 4).toFixed(1)} m at 1 km
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Tradeoffs →
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Frequency-Zone Tradeoff
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Zone Size vs Wavelength</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Fresnel zone radius is proportional to <strong style={{ color: colors.accent }}>√(wavelength)</strong>. Since wavelength = c/frequency, higher frequencies have smaller wavelengths and thus <strong style={{ color: colors.success }}>smaller Fresnel zones</strong>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📱</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Why 5G mmWave Works in Cities</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At 60 GHz, Fresnel zones are measured in <strong style={{ color: colors.zone1 }}>centimeters</strong> rather than meters. This allows mmWave links to squeeze through urban canyons where lower frequencies would suffer massive diffraction losses.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>The Other Side of the Tradeoff</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Higher frequencies face other challenges: <strong style={{ color: colors.error }}>rain fade</strong>, higher atmospheric absorption, and less material penetration. The small Fresnel zone advantage comes with its own costs.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Fresnel Zones"
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            App {selectedApp + 1} of {realWorldApps.length}
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
                    ✓
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
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Connection to Fresnel Zones:
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Real Examples:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Industry Leaders:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.companies.join(', ')}
              </p>
            </div>

            <div>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {/* Got It button for current app */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              if (selectedApp < realWorldApps.length - 1) {
                setSelectedApp(selectedApp + 1);
                const nc = [...newCompleted];
                nc[selectedApp + 1] = true;
                setCompletedApps(nc);
              }
            }}
            style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
          >
            Got It →
          </button>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
            >
              Take the Test →
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingTop: '60px',
            paddingBottom: '16px',
            textAlign: 'center',
          }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand Fresnel zone physics!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                Review & Try Again
              </button>
            )}
          </div>
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
                  minHeight: '48px',
                }}
              >
                ← Previous
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
                  minHeight: '48px',
                }}
              >
                Next Question →
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
                  minHeight: '48px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '60px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Fresnel Zone Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the invisible physics that determine whether wireless links succeed or fail.
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
              'Radio waves spread in ellipsoidal Fresnel zones',
              'The 60% clearance rule for reliable links',
              'How frequency affects zone size',
              'Why line-of-sight alone isn\'t enough',
              'Real-world applications in microwave and WiFi',
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
              minHeight: '48px',
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default FresnelZonesRenderer;
