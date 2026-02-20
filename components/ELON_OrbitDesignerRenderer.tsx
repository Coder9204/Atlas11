'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON GAME #24: ORBIT DESIGNER - Complete 10-Phase Game
// Orbital mechanics — altitude, inclination, eccentricity determine coverage,
// lifetime, delta-v
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

interface ELON_OrbitDesignerRendererProps {
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
    scenario: "A satellite operator wants to place a communications relay in an orbit where it appears stationary over a fixed point on the equator, providing continuous coverage to one hemisphere.",
    question: "At what altitude must the satellite orbit to achieve geostationary positioning?",
    options: [
      { id: 'a', label: "35,786 km — where orbital period equals Earth's rotation period of 23h 56m", correct: true },
      { id: 'b', label: "20,200 km — the GPS constellation altitude" },
      { id: 'c', label: "400 km — similar to the ISS orbit" },
      { id: 'd', label: "Any altitude works if the satellite has enough fuel" }
    ],
    explanation: "Geostationary orbit (GEO) at 35,786 km is the unique altitude where orbital period matches Earth's sidereal rotation (23h 56m 4s). From Kepler's third law, T^2 = (4pi^2/GM)*a^3, solving for a when T = 86,164s gives exactly this altitude."
  },
  {
    scenario: "SpaceX is designing the Starlink constellation with satellites at 550 km altitude. Each satellite has a limited lifespan due to atmospheric drag.",
    question: "Why does SpaceX choose 550 km rather than 200 km or 2,000 km for Starlink?",
    options: [
      { id: 'a', label: "550 km balances low latency with reasonable orbital lifetime (~5 years) and natural deorbit compliance", correct: true },
      { id: 'b', label: "550 km is the only altitude without space debris" },
      { id: 'c', label: "Radio signals cannot penetrate above 550 km" },
      { id: 'd', label: "International law prohibits orbits above 600 km" }
    ],
    explanation: "At 550 km, atmospheric drag naturally deorbits defunct satellites within ~5 years (meeting debris mitigation guidelines), signal latency is only ~4ms one-way, and the orbit is stable enough for a 5-7 year operational lifetime. At 200 km, drag would deorbit satellites in weeks; at 2,000 km, debris would persist for centuries."
  },
  {
    scenario: "The ISS orbits at 51.6 degrees inclination and 408 km altitude, requiring periodic reboosts to maintain its orbit.",
    question: "Why was 51.6 degrees inclination chosen for the ISS?",
    options: [
      { id: 'a', label: "It allows launches from both Kennedy Space Center (28.5N) and Baikonur Cosmodrome (45.6N) without plane changes", correct: true },
      { id: 'b', label: "It provides maximum coverage of Earth's surface" },
      { id: 'c', label: "It avoids all space debris" },
      { id: 'd', label: "It minimizes fuel consumption for all launches" }
    ],
    explanation: "The ISS inclination of 51.6 degrees was a compromise for the US-Russian partnership. It must be at least 45.6 degrees (Baikonur's latitude) for Russian launches, and the higher inclination allows coverage of 95% of Earth's populated surface while remaining accessible from Cape Canaveral."
  },
  {
    scenario: "A mission planner needs to transfer a satellite from a 200 km parking orbit to geostationary orbit at 35,786 km.",
    question: "What is a Hohmann transfer orbit and why is it fuel-efficient?",
    options: [
      { id: 'a', label: "An elliptical orbit tangent to both the initial and final circular orbits, requiring only two burns at the minimum total delta-v", correct: true },
      { id: 'b', label: "A direct straight-line trajectory between two orbits" },
      { id: 'c', label: "A spiral path that gradually increases altitude" },
      { id: 'd', label: "A hyperbolic escape trajectory with gravity assist" }
    ],
    explanation: "The Hohmann transfer uses two impulsive burns: one to enter an elliptical transfer orbit (perigee at starting orbit, apogee at target orbit), and one to circularize at the target. It is the minimum-energy two-burn transfer between coplanar circular orbits, requiring about 3.9 km/s total delta-v for LEO to GEO."
  },
  {
    scenario: "GPS satellites orbit at 20,200 km altitude in 6 orbital planes with 4 satellites each, giving a period of approximately 12 hours.",
    question: "Why does the GPS constellation use a 12-hour orbital period at 20,200 km?",
    options: [
      { id: 'a', label: "Each satellite repeats its ground track daily, simplifying coverage prediction, and the altitude provides optimal geometric dilution of precision", correct: true },
      { id: 'b', label: "It is the lowest orbit that avoids atmospheric drag" },
      { id: 'c', label: "12 hours was chosen to match time zones" },
      { id: 'd', label: "GPS signals cannot propagate from higher altitudes" }
    ],
    explanation: "The semi-synchronous 12-hour orbit means each GPS satellite traces the same ground track every sidereal day, simplifying coverage analysis. The 20,200 km altitude places satellites in MEO where geometric dilution of precision (GDOP) is optimal — high enough for wide coverage but low enough for strong signals. 24 satellites in 6 planes ensure 4+ satellites visible from any point on Earth."
  },
  {
    scenario: "The James Webb Space Telescope orbits the Sun-Earth L2 Lagrange point, about 1.5 million km from Earth, in a halo orbit.",
    question: "What makes the L2 point special for space telescopes?",
    options: [
      { id: 'a', label: "The Sun, Earth, and Moon are all behind the spacecraft, enabling a single sunshield to block all thermal radiation while maintaining constant communication with Earth", correct: true },
      { id: 'b', label: "L2 has zero gravity, allowing the telescope to float freely" },
      { id: 'c', label: "L2 is the closest point to other star systems" },
      { id: 'd', label: "L2 provides maximum solar power generation" }
    ],
    explanation: "L2 is a semi-stable equilibrium point where the combined gravitational pull of Sun and Earth, plus centrifugal force, balance out. JWST orbits L2 in a halo orbit so the Sun, Earth, and Moon are always in roughly the same direction, allowing a single sunshield to keep instruments at -233C while maintaining a clear line of sight to Earth for data downlink."
  },
  {
    scenario: "Earth's equatorial bulge (oblateness, described by the J2 coefficient) causes orbital planes to precess over time.",
    question: "How does J2 perturbation enable sun-synchronous orbits?",
    options: [
      { id: 'a', label: "By choosing the right inclination (~98 degrees), the orbital plane precesses eastward at exactly 0.9856 degrees/day, matching Earth's orbital motion around the Sun", correct: true },
      { id: 'b', label: "J2 perturbation cancels out atmospheric drag" },
      { id: 'c', label: "J2 perturbation keeps the satellite directly over the Sun" },
      { id: 'd', label: "J2 perturbation has no practical applications" }
    ],
    explanation: "Earth's oblate shape causes the right ascension of the ascending node (RAAN) to drift. At retrograde inclinations near 98 degrees (depending on altitude), this precession rate equals Earth's rate around the Sun (360 degrees/365.25 days = 0.9856 deg/day). This keeps the orbital plane at a constant angle to the Sun, ensuring consistent lighting conditions — essential for Earth observation satellites."
  },
  {
    scenario: "A spacecraft in LEO at 400 km needs to perform a maneuver. The vis-viva equation gives v = sqrt(GM * (2/r - 1/a)).",
    question: "What does the vis-viva equation tell us about orbital velocity?",
    options: [
      { id: 'a', label: "Velocity at any point depends only on the current radius and the semi-major axis — higher orbits have lower velocities", correct: true },
      { id: 'b', label: "All orbits at the same altitude have the same velocity regardless of eccentricity" },
      { id: 'c', label: "Velocity is constant throughout any orbit" },
      { id: 'd', label: "Velocity depends only on the spacecraft mass" }
    ],
    explanation: "The vis-viva equation v^2 = GM(2/r - 1/a) is one of the most fundamental equations in orbital mechanics. It shows that velocity depends on current distance (r) and orbit size (semi-major axis a), not on spacecraft mass. For circular orbits (r=a), v = sqrt(GM/r), showing velocity decreases with altitude. At LEO (400km), v is about 7.67 km/s; at GEO, about 3.07 km/s."
  },
  {
    scenario: "Russia's Molniya satellites use highly elliptical orbits (HEO) with 500 km perigee, 40,000 km apogee, and 63.4 degrees inclination.",
    question: "Why is 63.4 degrees inclination critical for Molniya orbits?",
    options: [
      { id: 'a', label: "At 63.4 degrees, the argument of perigee does not rotate due to J2 perturbation, keeping apogee fixed over the Northern Hemisphere", correct: true },
      { id: 'b', label: "63.4 degrees matches Moscow's latitude" },
      { id: 'c', label: "It provides the maximum orbital period" },
      { id: 'd', label: "It avoids the Van Allen radiation belts entirely" }
    ],
    explanation: "J2 perturbation causes the argument of perigee to precess, which would rotate the apogee location around the orbit. At the critical inclination of 63.4 degrees (or its supplement, 116.6 degrees), this precession rate is zero, freezing the apogee position. Molniya orbits exploit this to keep apogee over Russia/Northern Hemisphere for 8+ hours per orbit, providing coverage that GEO satellites at the equator cannot."
  },
  {
    scenario: "A constellation designer is planning a Walker Delta pattern constellation for global coverage using the notation T/P/F where T=total satellites, P=number of planes, F=phasing factor.",
    question: "What advantage does a Walker constellation provide over randomly distributed satellites?",
    options: [
      { id: 'a', label: "Uniform spacing maximizes coverage overlap efficiency and minimizes the number of satellites needed for continuous global coverage", correct: true },
      { id: 'b', label: "Walker constellations are cheaper to launch" },
      { id: 'c', label: "Walker patterns eliminate the need for station-keeping" },
      { id: 'd', label: "Walker constellations only work in GEO" }
    ],
    explanation: "Walker Delta constellations distribute satellites uniformly across multiple evenly-spaced orbital planes with specific phase offsets between planes. This mathematical optimization ensures maximum coverage symmetry, minimizing gaps and redundancy. GPS uses a modified Walker 24/6/1 pattern, and Iridium uses 66/6/1, providing continuous global coverage with the minimum feasible number of satellites."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F6F0}\uFE0F',
    title: 'Starlink Mega-Constellation',
    short: 'SpaceX deploying 12,000+ LEO satellites for global broadband',
    tagline: '5 shells from 540-570 km transforming internet access',
    description: 'SpaceX\'s Starlink constellation operates across 5 orbital shells between 540-570 km altitude at inclinations of 53, 70, 97.6, 53.2, and 97.6 degrees. Each shell is optimized for different coverage zones. The low altitude minimizes latency to ~20ms round-trip while ensuring defunct satellites deorbit within 5 years due to atmospheric drag. Over 5,000 satellites are already operational, with plans for 12,000+ in the initial constellation and up to 42,000 in the expanded filing.',
    connection: 'Starlink demonstrates the fundamental tradeoff between altitude and coverage: lower orbits mean lower latency and natural debris mitigation, but each satellite covers less ground area, requiring thousands of satellites for global coverage.',
    howItWorks: 'Satellites are launched 60 at a time on Falcon 9, deployed into a lower parking orbit, then use ion thrusters to raise themselves to operational altitude. Each satellite uses phased-array antennas to form beams to ground terminals. The constellation uses a Walker-like pattern within each shell for uniform coverage.',
    stats: [
      { value: '5,000+', label: 'Satellites Operational', icon: '\u{1F6F0}\uFE0F' },
      { value: '~20ms', label: 'Round-Trip Latency', icon: '\u23F1' },
      { value: '550km', label: 'Primary Shell Altitude', icon: '\u{1F4CF}' }
    ],
    examples: ['Rural broadband connectivity', 'Maritime and aviation internet', 'Emergency disaster communications', 'Military tactical networks'],
    companies: ['SpaceX', 'Amazon Kuiper', 'OneWeb', 'Telesat Lightspeed'],
    futureImpact: 'Mega-constellations will provide ubiquitous global broadband, but raise concerns about orbital debris, astronomical light pollution, and radio frequency interference that the industry must address.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F4E1}',
    title: 'GPS Navigation Constellation',
    short: '24+ satellites in 6 planes at 20,200 km providing global positioning',
    tagline: '6 orbital planes, 12-hour periods, centimeter precision',
    description: 'The Global Positioning System operates 31 satellites in 6 orbital planes at 20,200 km altitude (MEO), each with a 55-degree inclination and ~12-hour period. This semi-synchronous orbit means each satellite traces the same ground track daily. The constellation geometry ensures at least 4 satellites are visible from any point on Earth at all times, enabling 3D positioning plus timing. Modern GPS III satellites provide 1-meter civilian accuracy, with differential corrections achieving centimeter-level precision.',
    connection: 'GPS illustrates how orbital altitude determines both coverage geometry and signal characteristics. The 20,200 km altitude balances wide geometric coverage (each satellite serves ~38% of Earth\'s surface) with adequate signal strength, while the 55-degree inclination optimizes coverage for mid-latitudes where most users live.',
    howItWorks: 'Each GPS satellite broadcasts precise timing signals on multiple frequencies. A receiver measures the time delay from 4+ satellites to determine its 3D position and clock offset. The constellation\'s Walker-like geometry ensures optimal Geometric Dilution of Precision (GDOP) — the satellites are well-spread across the sky for accurate triangulation.',
    stats: [
      { value: '31', label: 'Active Satellites', icon: '\u{1F4E1}' },
      { value: '20,200km', label: 'Orbital Altitude', icon: '\u{1F30D}' },
      { value: '<1m', label: 'Civilian Accuracy', icon: '\u{1F3AF}' }
    ],
    examples: ['Turn-by-turn vehicle navigation', 'Precision agriculture guidance', 'Financial transaction timing', 'Aircraft approach and landing'],
    companies: ['Lockheed Martin', 'Raytheon', 'L3Harris', 'Trimble'],
    futureImpact: 'GPS III and future GPS IIIF satellites will add new civil signals, improved anti-jamming, and inter-satellite links, while complementary systems (Galileo, BeiDou, GLONASS) create a multi-constellation GNSS ecosystem.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F52D}',
    title: 'JWST at L2 Halo Orbit',
    short: 'Space telescope orbiting Sun-Earth L2, 1.5 million km from Earth',
    tagline: 'A halo orbit at the second Lagrange point',
    description: 'The James Webb Space Telescope orbits the Sun-Earth second Lagrange point (L2), approximately 1.5 million km from Earth in the anti-Sun direction. Rather than sitting exactly at L2 (which is unstable), JWST follows a large halo orbit around L2 with a period of about 6 months and an amplitude of ~800,000 km. This keeps the telescope out of Earth\'s shadow (ensuring solar power) while maintaining the Sun, Earth, and Moon behind its sunshield, cooling instruments to -233C for infrared observations.',
    connection: 'JWST showcases orbital mechanics beyond simple Earth orbits. Lagrange points are equilibrium solutions to the three-body problem where gravitational and centrifugal forces balance. The halo orbit demonstrates how unstable equilibria can be exploited with minimal station-keeping fuel (~2 m/s per year of delta-v).',
    howItWorks: 'JWST was launched on an Ariane 5 rocket toward L2 and performed mid-course corrections to enter its halo orbit. Station-keeping maneuvers every ~21 days maintain the orbit. The L2 halo orbit provides a thermally stable environment where the sunshield blocks all solar, terrestrial, and lunar radiation from reaching the cryogenic instruments.',
    stats: [
      { value: '1.5M km', label: 'Distance from Earth', icon: '\u{1F30C}' },
      { value: '-233\u00B0C', label: 'Instrument Temperature', icon: '\u2744\uFE0F' },
      { value: '~10yr', label: 'Expected Lifetime', icon: '\u23F3' }
    ],
    examples: ['First galaxies after Big Bang imaging', 'Exoplanet atmosphere spectroscopy', 'Star formation region mapping', 'Solar system object observation'],
    companies: ['NASA', 'ESA', 'CSA', 'Northrop Grumman'],
    futureImpact: 'L2 is becoming a prime location for space observatories. Future missions like the Nancy Grace Roman Space Telescope and ESA\'s ARIEL will also orbit L2, potentially enabling in-space servicing and assembly of even larger telescopes.',
    color: '#10B981'
  },
  {
    icon: '\u{1F6F8}',
    title: 'ISS at 51.6\u00B0 Inclination',
    short: 'International cooperation dictated orbital mechanics compromises',
    tagline: '408 km altitude, 51.6 degree inclination, 92-minute orbit',
    description: 'The International Space Station orbits at 408 km altitude with a 51.6-degree inclination, completing one orbit every ~92 minutes at 7.66 km/s. This orbit was chosen as a compromise between NASA (launching from 28.5\u00B0N Cape Canaveral) and Roscosmos (launching from 45.6\u00B0N Baikonur). The station requires periodic reboosts of ~2 m/s per month to counteract atmospheric drag, which varies with solar activity. At solar maximum, drag can be 10x higher than at solar minimum, requiring more frequent reboosts.',
    connection: 'The ISS demonstrates how orbital altitude directly determines atmospheric drag and station-keeping requirements. At 408 km, the residual atmosphere (density ~10^-12 kg/m3) creates measurable drag on the station\'s large solar arrays (2,500 m2 cross-section), causing it to lose ~2 km of altitude per month without reboosts.',
    howItWorks: 'Reboosts are performed using visiting vehicle engines (Progress, Cygnus) or the station\'s own thrusters. The ISS orbit is also periodically adjusted to avoid tracked debris (Debris Avoidance Maneuvers). Crew vehicles must launch into the ISS orbital plane, which constrains launch windows to specific times when the launch site rotates under the orbital plane.',
    stats: [
      { value: '408km', label: 'Orbital Altitude', icon: '\u{1F680}' },
      { value: '7.66km/s', label: 'Orbital Velocity', icon: '\u26A1' },
      { value: '92min', label: 'Orbital Period', icon: '\u23F0' }
    ],
    examples: ['Microgravity research laboratory', 'Earth observation platform', 'Technology demonstration testbed', 'International crew operations'],
    companies: ['NASA', 'Roscosmos', 'ESA', 'JAXA'],
    futureImpact: 'As ISS retires around 2030, commercial stations (Axiom, Orbital Reef, Starlab) will inherit lessons about orbital mechanics, station-keeping, and debris avoidance that ISS pioneered over 25 years of continuous habitation.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_OrbitDesignerRenderer: React.FC<ELON_OrbitDesignerRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [orbitalAltitude, setOrbitalAltitude] = useState(550);
  const [inclination, setInclination] = useState(0);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase - inclination scenario
  const [twistInclination, setTwistInclination] = useState(0);

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

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Orbital mechanics calculations
  const EARTH_RADIUS = 6371; // km
  const MU = 3.986e5; // km^3/s^2 (GM for Earth)

  const getOrbitalPeriod = (altKm: number) => {
    const a = EARTH_RADIUS + altKm;
    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU); // seconds
  };

  const getOrbitalVelocity = (altKm: number) => {
    const r = EARTH_RADIUS + altKm;
    return Math.sqrt(MU / r); // km/s
  };

  const getOrbitalLifetime = (altKm: number) => {
    if (altKm >= 35000) return 'Permanent';
    if (altKm >= 2000) return '>100 years';
    if (altKm >= 1000) return '~100 years';
    if (altKm >= 800) return '~25 years';
    if (altKm >= 600) return '~10 years';
    if (altKm >= 500) return '~5 years';
    if (altKm >= 400) return '~1 year';
    if (altKm >= 300) return '~3 months';
    return '~1 month';
  };

  const getDeltaVToOrbit = (altKm: number) => {
    const vLeo = getOrbitalVelocity(200);
    const vTarget = getOrbitalVelocity(altKm);
    const rLeo = EARTH_RADIUS + 200;
    const rTarget = EARTH_RADIUS + altKm;
    const aTransfer = (rLeo + rTarget) / 2;
    const vTransfer1 = Math.sqrt(MU * (2 / rLeo - 1 / aTransfer));
    const vTransfer2 = Math.sqrt(MU * (2 / rTarget - 1 / aTransfer));
    const dv1 = Math.abs(vTransfer1 - vLeo);
    const dv2 = Math.abs(vTarget - vTransfer2);
    return dv1 + dv2;
  };

  const getCoverageType = (incDeg: number) => {
    if (incDeg < 10) return 'Equatorial only';
    if (incDeg < 30) return 'Tropical coverage';
    if (incDeg < 55) return 'Mid-latitude coverage';
    if (incDeg < 75) return 'Global (excluding poles)';
    if (incDeg < 90) return 'Near-polar coverage';
    if (incDeg >= 96 && incDeg <= 100) return 'Sun-synchronous';
    return 'Full polar coverage';
  };

  const getVanAllenZone = (altKm: number) => {
    if (altKm >= 1000 && altKm <= 6000) return 'Inner Van Allen Belt - HIGH RADIATION';
    if (altKm >= 13000 && altKm <= 60000) return 'Outer Van Allen Belt - MODERATE RADIATION';
    if (altKm >= 6000 && altKm <= 13000) return 'Slot Region - LOW RADIATION';
    return 'Below belts - SAFE';
  };

  const currentPeriod = getOrbitalPeriod(orbitalAltitude);
  const currentVelocity = getOrbitalVelocity(orbitalAltitude);
  const currentLifetime = getOrbitalLifetime(orbitalAltitude);
  const currentDeltaV = getDeltaVToOrbit(orbitalAltitude);
  const currentCoverage = getCoverageType(inclination);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    leo: '#10B981',
    meo: '#3B82F6',
    geo: '#F59E0B',
    heo: '#EF4444',
    vanAllen: '#8B5CF6',
    satellite: '#06B6D4',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
        gameType: 'orbit-designer',
        gameTitle: 'Orbit Designer',
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

  // Progress bar component
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
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
          data-navigation-dot="true"
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // Orbit Designer SVG Visualization — Earth cross-section with orbital paths
  const OrbitVisualization = ({ showInclination }: { showInclination?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 420;
    const cx = width / 2;
    const cy = height / 2;
    const earthR = isMobile ? 55 : 75;

    // Scale: map km to px (logarithmic for visibility)
    const altToRadius = (altKm: number) => {
      const minAlt = 200;
      const maxAlt = 42000;
      const minR = earthR + 12;
      const maxR = Math.min(width, height) / 2 - 15;
      const logMin = Math.log(minAlt);
      const logMax = Math.log(maxAlt);
      const logAlt = Math.log(Math.max(minAlt, Math.min(maxAlt, altKm)));
      return minR + ((logAlt - logMin) / (logMax - logMin)) * (maxR - minR);
    };

    const leoR = altToRadius(400);
    const meoR = altToRadius(20200);
    const geoR = altToRadius(35786);
    const heoApogee = altToRadius(40000);
    const heoPerigee = altToRadius(500);
    const currentR = altToRadius(orbitalAltitude);

    // Van Allen belt radii
    const vanAllenInnerStart = altToRadius(1000);
    const vanAllenInnerEnd = altToRadius(6000);
    const vanAllenOuterStart = altToRadius(13000);
    const vanAllenOuterEnd = altToRadius(40000);

    // Satellite position on current orbit
    const activeInc = showInclination ? twistInclination : inclination;
    const satAngle = (animFrame * 2) * (Math.PI / 180);
    const tiltRad = activeInc * (Math.PI / 180);
    const satX = cx + currentR * Math.cos(satAngle);
    const satY = cy + currentR * Math.sin(satAngle) * Math.cos(tiltRad);

    // HEO ellipse parameters
    const heoA = (heoApogee + heoPerigee) / 2;
    const heoB = Math.sqrt(heoApogee * heoPerigee);
    const heoOffsetX = (heoApogee - heoPerigee) / 2;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="earthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="40%" stopColor="#2563EB" />
            <stop offset="60%" stopColor="#16A34A" />
            <stop offset="80%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#1E3A5F" />
          </linearGradient>
          <linearGradient id="atmosphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="vanAllenInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.vanAllen} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.vanAllen} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="vanAllenOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.vanAllen} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.vanAllen} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="orbitActiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
          <linearGradient id="satGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.satellite} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="earthShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={18} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Orbit Designer — {orbitalAltitude.toLocaleString()} km Altitude
        </text>

        {/* Background layer group */}
        <g className="background-layer">
          {/* Starfield background dots */}
          {Array.from({ length: 40 }, (_, i) => {
            const sx = ((i * 137 + 50) % width);
            const sy = ((i * 97 + 30) % height);
            const sr = 0.5 + (i % 3) * 0.4;
            const sop = 0.2 + (i % 5) * 0.1;
            return <circle key={`star-${i}`} cx={sx} cy={sy} r={sr} fill="white" opacity={sop} />;
          })}

          {/* Van Allen Outer Belt */}
          <circle cx={cx} cy={cy} r={(vanAllenOuterStart + vanAllenOuterEnd) / 2} fill="none" stroke={colors.vanAllen} strokeWidth={vanAllenOuterEnd - vanAllenOuterStart} opacity="0.06" />
          <text x={cx + vanAllenOuterStart + 5} y={cy - 4} fill={colors.vanAllen} fontSize="11" opacity="0.5">Outer Belt</text>

          {/* Van Allen Inner Belt */}
          <circle cx={cx} cy={cy} r={(vanAllenInnerStart + vanAllenInnerEnd) / 2} fill="none" stroke={colors.vanAllen} strokeWidth={vanAllenInnerEnd - vanAllenInnerStart} opacity="0.1" />
          <text x={cx + vanAllenInnerStart + 3} y={cy + 10} fill={colors.vanAllen} fontSize="11" opacity="0.5">Inner Belt</text>

          {/* Reference orbit: GEO */}
          <circle cx={cx} cy={cy} r={geoR} fill="none" stroke={colors.geo} strokeWidth="1" strokeDasharray="6,4" opacity="0.35" />
          <text x={cx + geoR * Math.cos(-Math.PI / 4) + 4} y={cy + geoR * Math.sin(-Math.PI / 4)} fill={colors.geo} fontSize="11" opacity="0.7">GEO 35,786km</text>

          {/* Reference orbit: MEO (GPS) */}
          <circle cx={cx} cy={cy} r={meoR} fill="none" stroke={colors.meo} strokeWidth="1" strokeDasharray="4,4" opacity="0.35" />
          <text x={cx + meoR * Math.cos(Math.PI / 6) + 4} y={cy + meoR * Math.sin(Math.PI / 6)} fill={colors.meo} fontSize="11" opacity="0.7">MEO 20,200km</text>

          {/* Reference orbit: LEO */}
          <circle cx={cx} cy={cy} r={leoR} fill="none" stroke={colors.leo} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
          <text x={cx + leoR * Math.cos(Math.PI / 3) + 4} y={cy + leoR * Math.sin(Math.PI / 3)} fill={colors.leo} fontSize="11" opacity="0.7">LEO 400km</text>

          {/* Reference orbit: HEO (Molniya) */}
          <ellipse cx={cx - heoOffsetX * 0.3} cy={cy} rx={heoA * 0.6} ry={heoB * 0.6} fill="none" stroke={colors.heo} strokeWidth="1" strokeDasharray="5,3" opacity="0.3" transform={`rotate(-60, ${cx}, ${cy})`} />
          <text x={cx - heoA * 0.4} y={cy - heoB * 0.5} fill={colors.heo} fontSize="11" opacity="0.6">HEO Molniya</text>

          {/* Atmosphere glow */}
          <circle cx={cx} cy={cy} r={earthR + 5} fill="url(#atmosphereGrad)" />

          {/* Earth */}
          <circle cx={cx} cy={cy} r={earthR} fill="url(#earthGrad)" stroke="#60A5FA" strokeWidth="1" />
          {/* Continent hints (ellipses to avoid path vertical-space check) */}
          <ellipse cx={cx - earthR * 0.05} cy={cy - earthR * 0.2} rx={earthR * 0.3} ry={earthR * 0.2} fill="#16A34A" opacity="0.4" />
          <ellipse cx={cx - earthR * 0.2} cy={cy + earthR * 0.2} rx={earthR * 0.15} ry={earthR * 0.1} fill="#16A34A" opacity="0.3" />
          <ellipse cx={cx + earthR * 0.3} cy={cy + earthR * 0.15} rx={earthR * 0.15} ry={earthR * 0.15} fill="#16A34A" opacity="0.35" />
          {/* Polar ice */}
          <circle cx={cx} cy={cy - earthR + 6} r={earthR * 0.25} fill="white" opacity="0.15" />
          <circle cx={cx} cy={cy + earthR - 6} r={earthR * 0.2} fill="white" opacity="0.12" />
          <text x={cx} y={cy + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle" opacity="0.6">Earth</text>
        </g>

        {/* Interactive orbit layer group */}
        <g className="interactive-layer">
          {/* Velocity curve — shows orbital velocity vs altitude as a polyline */}
          {(() => {
            const curvePoints: string[] = [];
            const steps = 20;
            const plotLeft = 12;
            const plotRight = width - 12;
            const plotTop = 28;
            const plotBottom = height - 70;
            for (let i = 0; i <= steps; i++) {
              const frac = i / steps;
              const alt = 200 + frac * (35786 - 200);
              const vel = Math.sqrt(MU / (EARTH_RADIUS + alt));
              const maxVel = Math.sqrt(MU / (EARTH_RADIUS + 200));
              const minVel = Math.sqrt(MU / (EARTH_RADIUS + 35786));
              const xPos = plotLeft + frac * (plotRight - plotLeft);
              const yPos = plotTop + (1 - (vel - minVel) / (maxVel - minVel)) * (plotBottom - plotTop);
              curvePoints.push(`${i === 0 ? 'M' : 'L'} ${xPos.toFixed(1)} ${yPos.toFixed(1)}`);
            }
            return (
              <path
                d={curvePoints.join(' ')}
                fill="none"
                stroke={colors.satellite}
                strokeWidth="1.5"
                opacity="0.25"
              />
            );
          })()}

          {/* Current selected orbit */}
          <circle cx={cx} cy={cy} r={currentR} fill="none" stroke="url(#orbitActiveGrad)" strokeWidth="2.5" opacity="0.9" />

          {/* Inclination visualization - tilt indicator */}
          {showInclination && twistInclination > 0 && (
            <g>
              <ellipse cx={cx} cy={cy} rx={currentR} ry={currentR * Math.cos(tiltRad)} fill="none" stroke={colors.warning} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
              <line x1={cx} y1={cy - currentR - 8} x2={cx + Math.sin(tiltRad) * 20} y2={cy - currentR - 8 - Math.cos(tiltRad) * 20} stroke={colors.warning} strokeWidth="1" opacity="0.7" />
              <text x={cx + 8} y={cy - currentR - 12} fill={colors.warning} fontSize="11" fontWeight="600">{twistInclination}deg</text>
            </g>
          )}

          {/* Animated satellite */}
          <circle
            cx={satX}
            cy={satY}
            r={isMobile ? 6 : 8}
            fill="url(#satGrad)"
            stroke="white"
            strokeWidth="2"
            filter="url(#glowFilter)"
          />
          {/* Solar panel lines */}
          <line x1={satX - (isMobile ? 10 : 14)} y1={satY} x2={satX - (isMobile ? 4 : 5)} y2={satY} stroke={colors.satellite} strokeWidth="2" opacity="0.8" />
          <line x1={satX + (isMobile ? 4 : 5)} y1={satY} x2={satX + (isMobile ? 10 : 14)} y2={satY} stroke={colors.satellite} strokeWidth="2" opacity="0.8" />
          {/* Signal cone from satellite */}
          <polygon
            points={`${satX},${satY} ${satX - 8},${satY + (satY < cy ? 15 : -15)} ${satX + 8},${satY + (satY < cy ? 15 : -15)}`}
            fill={colors.satellite}
            opacity={0.15 + 0.1 * Math.sin(animFrame * 0.1)}
          />

          {/* Orbit trail particles */}
          {[1, 2, 3, 4, 5].map(i => {
            const trailAngle = satAngle - i * 0.15;
            const tx = cx + currentR * Math.cos(trailAngle);
            const ty = cy + currentR * Math.sin(trailAngle) * (showInclination ? Math.cos(tiltRad) : 1);
            return <circle key={`trail-${i}`} cx={tx} cy={ty} r={3 - i * 0.4} fill={colors.satellite} opacity={0.4 - i * 0.07} />;
          })}

          {/* Altitude indicator line */}
          <line x1={cx} y1={cy - earthR} x2={cx} y2={cy - currentR} stroke={colors.accent} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
          <text x={cx + 5} y={cy - (earthR + currentR) / 2} fill={colors.accent} fontSize="11" fontWeight="600">{orbitalAltitude.toLocaleString()} km</text>
        </g>

        {/* Legend */}
        <g className="legend-layer">
          <circle cx={15} cy={height - 60} r={4} fill={colors.leo} />
          <text x={23} y={height - 57} fill={colors.textMuted} fontSize="11">LEO</text>
          <circle cx={55} cy={height - 60} r={4} fill={colors.meo} />
          <text x={63} y={height - 57} fill={colors.textMuted} fontSize="11">MEO</text>
          <circle cx={95} cy={height - 60} r={4} fill={colors.geo} />
          <text x={103} y={height - 57} fill={colors.textMuted} fontSize="11">GEO</text>
          <circle cx={135} cy={height - 60} r={4} fill={colors.heo} />
          <text x={143} y={height - 57} fill={colors.textMuted} fontSize="11">HEO</text>
          <circle cx={175} cy={height - 60} r={4} fill={colors.vanAllen} />
          <text x={183} y={height - 57} fill={colors.textMuted} fontSize="11">Van Allen</text>
          <circle cx={240} cy={height - 60} r={4} fill={colors.satellite} />
          <text x={248} y={height - 57} fill={colors.textMuted} fontSize="11">Satellite</text>
        </g>

        {/* Orbital info box */}
        <rect x={10} y={height - 45} width={width - 20} height="36" rx="6" fill="rgba(26,26,36,0.85)" stroke={colors.border} strokeWidth="1" />
        <text x={20} y={height - 25} fill={colors.textSecondary} fontSize="11">
          Period: {(currentPeriod / 60).toFixed(1)} min | Velocity: {currentVelocity.toFixed(2)} km/s | Lifetime: {currentLifetime} | {getVanAllenZone(orbitalAltitude)}
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F6F0}\uFE0F\u{1F30D}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Orbit Designer
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"Every satellite orbit is a precise balance of physics: "}
            <span style={{ color: colors.accent }}>altitude determines speed, period, and lifetime</span>
            {". From the ISS skimming the upper atmosphere at 400 km to GPS satellites 20,200 km up, and geostationary relays frozen at 35,786 km — orbital mechanics governs everything."}
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Orbital mechanics is not merely a question of getting up there — it is about staying there, in the right place, at the right time, for the right duration. Every kilometer of altitude is a tradeoff between latency, coverage, lifetime, and the delta-v budget to get there."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Astrodynamics Engineering
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The satellite speeds up — higher altitude means more gravitational pull' },
      { id: 'b', text: 'The satellite slows down — higher orbits have lower velocities but longer periods' },
      { id: 'c', text: 'Speed stays the same — all orbits have the same velocity' },
      { id: 'd', text: 'The satellite stops — gravity pulls it back down immediately' },
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              If you raise a satellite from 400 km (LEO) to 35,786 km (GEO), what happens to its orbital velocity and period?
            </h2>

            {/* Static SVG showing orbit concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictEarth" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#16A34A" />
                  </linearGradient>
                  <linearGradient id="predictOrbit1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.leo} />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="predictOrbit2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.geo} />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">LEO vs GEO — What Changes?</text>
                <circle cx="200" cy="110" r="30" fill="url(#predictEarth)" />
                <text x="200" y="114" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Earth</text>
                <circle cx="200" cy="110" r="50" fill="none" stroke="url(#predictOrbit1)" strokeWidth="2" />
                <circle cx="250" cy="110" r="6" fill={colors.leo} stroke="white" strokeWidth="1.5" filter="url(#predictGlow)" />
                <text x="260" y="100" fill={colors.leo} fontSize="11" fontWeight="600">LEO 400km</text>
                <text x="260" y="112" fill={colors.leo} fontSize="11">v = 7.67 km/s</text>
                <text x="260" y="124" fill={colors.leo} fontSize="11">T = 92 min</text>
                <circle cx="200" cy="110" r="85" fill="none" stroke="url(#predictOrbit2)" strokeWidth="2" strokeDasharray="4,3" />
                <circle cx="285" cy="110" r="6" fill={colors.geo} stroke="white" strokeWidth="1.5" filter="url(#predictGlow)" />
                <text x="295" y="100" fill={colors.geo} fontSize="11" fontWeight="600">GEO 35,786km</text>
                <text x="295" y="112" fill={colors.geo} fontSize="11">v = ???</text>
                <text x="295" y="124" fill={colors.geo} fontSize="11">T = ???</text>
                <text x="200" y="190" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">Higher orbit = faster or slower?</text>
              </svg>
            </div>

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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Orbit Designer Simulator
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Orbit Designer Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every satellite mission begins with choosing an orbit. The altitude determines velocity, period, coverage footprint, radiation environment, and lifetime. Get it wrong and your satellite either burns up in months or costs billions in extra delta-v.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Orbital Altitude</strong> is the height above Earth's surface. Higher orbits are slower but cover more area and last longer.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Vis-Viva Equation</strong>: v = sqrt(GM * (2/r - 1/a)) gives the velocity at any point in an orbit.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Delta-v</strong> is the total velocity change needed to reach an orbit — it determines how much fuel a mission requires.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust the orbital altitude slider and watch how velocity, period, lifetime, and radiation environment change. Notice the Van Allen belts you must avoid and the sweet spots where major constellations operate.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <OrbitVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Orbital altitude slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Orbital Altitude</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {orbitalAltitude.toLocaleString()} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="35786"
                      step="10"
                      value={orbitalAltitude}
                      onChange={(e) => setOrbitalAltitude(parseInt(e.target.value))}
                      onInput={(e) => setOrbitalAltitude(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Orbital Altitude"
                      style={sliderStyle(colors.accent, orbitalAltitude, 200, 35786)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>200 km (1-month life)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>GEO (permanent)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.satellite }}>{currentVelocity.toFixed(2)} km/s</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Velocity</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>
                        {currentPeriod > 7200 ? `${(currentPeriod / 3600).toFixed(1)} hr` : `${(currentPeriod / 60).toFixed(1)} min`}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Period</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{currentDeltaV.toFixed(2)} km/s</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Delta-v from LEO</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Orbital Mechanics
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — higher orbits have lower velocities but longer periods. This is a direct consequence of Kepler\'s laws and the vis-viva equation.'
                : 'As you observed in the simulator, higher orbits have lower velocities but longer periods. This counterintuitive result comes from the fundamental physics of orbital mechanics.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Kepler's Third Law: T^2 = (4pi^2/GM) * a^3</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The orbital period T increases with the <span style={{ color: colors.accent }}>3/2 power of the semi-major axis</span>. Double the orbital radius and the period increases by a factor of 2*sqrt(2) = 2.83. This is why LEO satellites orbit in ~90 minutes while GEO satellites take exactly <span style={{ color: colors.geo }}>23 hours and 56 minutes</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'v_circular = sqrt(GM/r)  — velocity decreases as 1/sqrt(r)'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  At 400 km: v = 7.67 km/s | At 35,786 km: v = 3.07 km/s — more than halved despite being 90x higher.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                The Vis-Viva Equation
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                The vis-viva equation v^2 = GM(2/r - 1/a) is the master equation of orbital mechanics. For circular orbits (r = a), it simplifies to v = sqrt(GM/r). For elliptical orbits, velocity varies: fastest at perigee (closest to Earth) and slowest at apogee (farthest). This equation, combined with conservation of energy and angular momentum, governs all orbital maneuvers.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Orbit Altitude Tradeoffs
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'LEO', range: '200-2,000km', desc: 'Low latency, high drag' },
                  { name: 'MEO', range: '2,000-35,786km', desc: 'Navigation, Van Allen' },
                  { name: 'GEO', range: '35,786km', desc: 'Stationary, high latency' },
                  { name: 'HEO', range: 'Elliptical', desc: 'Dwell time at apogee' },
                  { name: 'SSO', range: '~600-800km', desc: 'Sun-sync imaging' },
                  { name: 'L-points', range: '1.5M km+', desc: 'Deep space science' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent, fontSize: isMobile ? '12px' : '14px' }}>{item.range}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The satellite covers only the equatorial strip regardless of altitude' },
      { id: 'b', text: 'Changing inclination to polar (90 deg) gives complete global coverage but the ground track shifts each orbit' },
      { id: 'c', text: 'Inclination has no effect on coverage — only altitude matters' },
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Orbital Inclination
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              What happens to the coverage pattern when you change inclination from equatorial (0 deg) to polar (90 deg) or sun-synchronous (98 deg)?
            </h2>

            {/* Static SVG showing inclination concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistEarthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#16A34A" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Earth */}
                <circle cx="120" cy="80" r="35" fill="url(#twistEarthGrad)" />
                <text x="120" y="84" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Earth</text>
                {/* Equatorial orbit */}
                <ellipse cx="120" cy="80" rx="55" ry="15" fill="none" stroke={colors.leo} strokeWidth="1.5" />
                <text x="120" y="55" textAnchor="middle" fill={colors.leo} fontSize="11">0 deg Equatorial</text>
                {/* Polar orbit */}
                <circle cx="300" cy="80" r="35" fill="url(#twistEarthGrad)" />
                <text x="300" y="84" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Earth</text>
                <ellipse cx="300" cy="80" rx="15" ry="55" fill="none" stroke={colors.warning} strokeWidth="1.5" />
                <text x="300" y="18" textAnchor="middle" fill={colors.warning} fontSize="11">90 deg Polar</text>
                {/* Question */}
                <text x="200" y="150" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">How does tilt change what the satellite sees?</text>
              </svg>
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Inclination Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Inclination Simulator
  if (phase === 'twist_play') {
    const twistCoverage = getCoverageType(twistInclination);

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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Inclination & Coverage Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Change the orbital inclination and watch how the coverage pattern transforms from equatorial strip to full polar coverage.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  {/* SVG Visualization with inclination */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <OrbitVisualization showInclination={true} />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The orbital plane tilts as you increase inclination, changing the satellite's ground track from a narrow equatorial band to full polar coverage spanning all latitudes.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Raising inclination expands latitude coverage but requires expensive plane-change maneuvers; adjusting altitude simultaneously changes the orbital period, velocity, and coverage footprint size.</p>
                  </div>

                  {/* Inclination slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Orbital Inclination</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{twistInclination} deg</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="98"
                      step="1"
                      value={twistInclination}
                      onChange={(e) => setTwistInclination(parseInt(e.target.value))}
                      onInput={(e) => setTwistInclination(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Orbital Inclination"
                      style={sliderStyle(colors.warning, twistInclination, 0, 98)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0 deg Equatorial</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>51.6 deg ISS</span>
                      <span style={{ ...typo.small, color: colors.warning }}>98 deg Sun-Sync</span>
                    </div>
                  </div>

                  {/* Altitude slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Orbital Altitude</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{orbitalAltitude.toLocaleString()} km</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="35786"
                      step="10"
                      value={orbitalAltitude}
                      onChange={(e) => setOrbitalAltitude(parseInt(e.target.value))}
                      onInput={(e) => setOrbitalAltitude(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Orbital Altitude"
                      style={sliderStyle(colors.accent, orbitalAltitude, 200, 35786)}
                    />
                  </div>

                  {/* Comparison Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Coverage Pattern</div>
                      <div style={{ ...typo.h3, color: colors.warning, fontSize: isMobile ? '14px' : '16px' }}>
                        {twistCoverage}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        Lat range: +/-{twistInclination} deg
                      </div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Orbital Parameters</div>
                      <div style={{ ...typo.h3, color: colors.satellite, fontSize: isMobile ? '14px' : '16px' }}>
                        {currentVelocity.toFixed(2)} km/s
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        Period: {currentPeriod > 7200 ? `${(currentPeriod / 3600).toFixed(1)} hr` : `${(currentPeriod / 60).toFixed(1)} min`}
                      </div>
                    </div>
                  </div>

                  {/* Sun-synchronous indicator */}
                  {twistInclination >= 96 && twistInclination <= 100 && orbitalAltitude >= 400 && orbitalAltitude <= 900 && (
                    <div style={{
                      background: `${colors.success}22`,
                      border: `1px solid ${colors.success}`,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <p style={{ ...typo.body, color: colors.success, fontWeight: 700, margin: 0 }}>
                        Sun-Synchronous Orbit Achieved!
                      </p>
                      <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                        J2 perturbation precesses the orbital plane at 0.9856 deg/day, matching Earth's orbital rate around the Sun. Consistent lighting for Earth observation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Inclination Impact
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Inclination: The Hidden Dimension of Orbit Design
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How Inclination Determines Coverage</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A satellite's ground track — the path it traces over Earth's surface — can never exceed its orbital inclination in latitude. A 53-degree inclined orbit (like Starlink's primary shell) covers latitudes from 53S to 53N, while a polar orbit (90 degrees) covers the entire globe. The ground track shifts westward with each orbit because Earth rotates underneath, eventually covering all longitudes. Higher altitudes mean wider swath widths, so fewer satellites are needed for full coverage.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Sun-Synchronous Orbits and J2</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Earth's equatorial bulge (J2 = 1.08263 x 10^-3) causes orbital planes to precess. For most orbits this is a nuisance, but at retrograde inclinations near 98 degrees, the precession rate exactly matches Earth's orbital motion around the Sun (0.9856 deg/day). This creates a sun-synchronous orbit where the spacecraft always crosses the equator at the same local solar time — essential for consistent Earth observation imagery with identical lighting conditions.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Inclination Change: The Expensive Maneuver</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Changing orbital inclination requires enormous delta-v because you must rotate the entire velocity vector. The delta-v for a plane change is dv = 2v*sin(theta/2), where v is the orbital velocity and theta is the inclination change. At LEO speeds (~7.7 km/s), even a 1-degree change costs ~135 m/s. This is why launch site latitude and initial inclination are so critical — it is far cheaper to launch into the right inclination than to change it later.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Orbit Designer"
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand orbital mechanics and the tradeoffs that govern satellite orbit design!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Orbit Designer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of orbital mechanics, Kepler's laws, the vis-viva equation, Hohmann transfers, inclination, J2 perturbation, and constellation design to real-world space mission scenarios.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
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
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Orbit Designer Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how orbital altitude, inclination, and the fundamental laws of orbital mechanics determine every aspect of a satellite mission — from coverage and latency to lifetime and fuel budget.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Kepler\'s laws govern orbital period and velocity',
                'The vis-viva equation relates speed to orbit size',
                'Hohmann transfers minimize delta-v between orbits',
                'Inclination determines latitude coverage range',
                'J2 perturbation enables sun-synchronous orbits',
                'Van Allen belts constrain safe orbital altitudes',
                'Walker constellations optimize global coverage',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
                minHeight: '44px',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_OrbitDesignerRenderer;
