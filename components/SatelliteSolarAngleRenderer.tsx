'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Satellite Solar Angle - Complete 10-Phase Game
// How solar angle affects satellite power generation
// ─────────────────────────────────────────────────────────────────────────────

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

interface SatelliteSolarAngleRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A communications satellite in GEO orbit notices its power output drops to 87% of maximum during certain times of day, even though the solar panels appear fully illuminated.",
    question: "What is the most likely cause of this power reduction?",
    options: [
      { id: 'a', label: "The solar cells are degrading due to radiation damage" },
      { id: 'b', label: "The sun angle creates an incidence angle, reducing effective area by cos(theta)", correct: true },
      { id: 'c', label: "The satellite is passing through Earth's shadow" },
      { id: 'd', label: "Space dust is blocking some of the sunlight" }
    ],
    explanation: "Solar panel power output follows the cosine law: Power = P_max × cos(incidence angle). When sunlight hits at an angle rather than perpendicular, the effective collection area decreases. At 30° incidence, power drops to cos(30°) = 87% of maximum."
  },
  {
    scenario: "An ISS astronaut notices that the station's massive solar arrays continuously rotate to track the sun as the station orbits Earth every 90 minutes.",
    question: "Why do the ISS solar arrays need active sun-tracking instead of fixed mounting?",
    options: [
      { id: 'a', label: "To prevent the arrays from overheating on one side" },
      { id: 'b', label: "Fixed arrays would have severe power fluctuations due to rapidly changing sun angles in LEO", correct: true },
      { id: 'c', label: "It's required by NASA safety regulations" },
      { id: 'd', label: "To help stabilize the station's attitude" }
    ],
    explanation: "In LEO, the satellite orbits Earth in ~90 minutes, causing the sun direction to change rapidly relative to the spacecraft. Without sun-tracking arrays, power would vary from 0% to 100% as the angle changes. Active tracking maintains near-optimal power throughout the sunlit portion of orbit."
  },
  {
    scenario: "A satellite engineer is sizing batteries for a new LEO Earth observation satellite. The orbital period is 90 minutes, with up to 35 minutes in eclipse during certain seasons.",
    question: "What percentage of each orbit might require battery power during worst-case eclipse seasons?",
    options: [
      { id: 'a', label: "About 10% of orbit time" },
      { id: 'b', label: "About 25% of orbit time" },
      { id: 'c', label: "About 39% of orbit time - nearly 40% of each orbit in darkness", correct: true },
      { id: 'd', label: "About 50% of orbit time" }
    ],
    explanation: "35 minutes out of 90-minute orbit = 38.9%, nearly 40%. This means batteries must supply almost 40% of the satellite's energy needs during worst-case eclipse seasons. Battery sizing must account for this significant energy storage requirement plus degradation over mission life."
  },
  {
    scenario: "A GEO communications satellite experiences 'eclipse seasons' twice per year around the equinoxes, when Earth's shadow crosses the orbit. During these periods, eclipses last up to 72 minutes per day.",
    question: "Why don't GEO satellites experience eclipses year-round like LEO satellites do?",
    options: [
      { id: 'a', label: "GEO satellites are too far from Earth to be shadowed" },
      { id: 'b', label: "Earth's shadow cone at GEO altitude only intersects the orbit near equinoxes due to orbital geometry", correct: true },
      { id: 'c', label: "GEO satellites use special eclipse-avoidance maneuvers" },
      { id: 'd', label: "The Moon blocks Earth's shadow at GEO altitude" }
    ],
    explanation: "At GEO altitude (35,786 km), Earth's shadow cone is relatively narrow. Due to the 23.5° tilt of Earth's axis, the shadow only crosses the GEO orbital plane near the equinoxes (March and September). Outside these seasons, GEO satellites enjoy nearly continuous sunlight."
  },
  {
    scenario: "A solar array designer is choosing between body-fixed panels and deployable sun-tracking arrays for a small CubeSat. The body-fixed option is simpler and cheaper.",
    question: "Under what mission conditions would body-fixed panels be acceptable despite lower average power?",
    options: [
      { id: 'a', label: "When the satellite spins about the sun-pointing axis, averaging the cosine loss", correct: true },
      { id: 'b', label: "Only for missions lasting less than one year" },
      { id: 'c', label: "When the satellite never enters eclipse" },
      { id: 'd', label: "Body-fixed panels are never acceptable for power generation" }
    ],
    explanation: "Body-fixed panels on a spin-stabilized satellite average the cosine loss over rotation. A satellite spinning about the sun-pointing axis will get ~64% average power from body-fixed panels (integral of cos over 0-90°). This trades power efficiency for mechanical simplicity and reliability."
  },
  {
    scenario: "The beta angle of a satellite's orbit is measured at 75°. Mission planners are excited because this means minimal eclipse periods.",
    question: "What does a high beta angle indicate about the orbital geometry?",
    options: [
      { id: 'a', label: "The orbit is highly elliptical with a low perigee" },
      { id: 'b', label: "The orbital plane is nearly parallel to the sun direction, minimizing Earth's shadow crossing", correct: true },
      { id: 'c', label: "The satellite is in a polar orbit" },
      { id: 'd', label: "The satellite is experiencing maximum eclipse duration" }
    ],
    explanation: "Beta angle is the angle between the orbital plane and the sun direction. At high beta angles (approaching 90°), the orbital plane is nearly parallel to sunlight, meaning Earth's shadow cone doesn't intersect the orbit. This results in continuous sunlight and no eclipses - ideal for power generation."
  },
  {
    scenario: "A deep space probe heading to Jupiter will be 5.2 AU from the Sun (compared to Earth at 1 AU). The mission requires 500W of power at Jupiter.",
    question: "How much larger must the solar arrays be compared to an Earth-orbiting satellite needing 500W?",
    options: [
      { id: 'a', label: "5.2 times larger (proportional to distance)" },
      { id: 'b', label: "About 27 times larger due to inverse square law", correct: true },
      { id: 'c', label: "10 times larger (rough engineering estimate)" },
      { id: 'd', label: "2.3 times larger (square root of distance)" }
    ],
    explanation: "Solar intensity follows the inverse square law: at 5.2 AU, intensity is 1/(5.2)² = 1/27 of Earth orbit levels. To generate the same 500W, arrays must be 27 times larger. This is why missions beyond Mars often use RTGs (nuclear) instead of solar power."
  },
  {
    scenario: "A satellite operator notices power output decreasing 2% per year over the mission lifetime, even though sun angles and eclipse patterns haven't changed significantly.",
    question: "What is causing this gradual power degradation?",
    options: [
      { id: 'a', label: "The solar cells are being damaged by space radiation and micrometeorite impacts", correct: true },
      { id: 'b', label: "The Sun's output is decreasing over time" },
      { id: 'c', label: "The batteries are affecting solar panel performance" },
      { id: 'd', label: "The satellite is slowly drifting away from Earth" }
    ],
    explanation: "Space radiation (protons, electrons, cosmic rays) damages solar cell crystal structure over time, reducing efficiency. Combined with micrometeorite damage and thermal cycling, solar arrays typically degrade 1-3% per year. Designers must size arrays to meet end-of-life power requirements."
  },
  {
    scenario: "During eclipse exit, a satellite's power system must handle the transition from battery power back to solar. The solar arrays are initially very cold (-150°C) and then rapidly heat up.",
    question: "How does this temperature swing affect solar array performance?",
    options: [
      { id: 'a', label: "Cold panels produce more voltage but less current" },
      { id: 'b', label: "Cold panels produce more power; voltage is higher when cold and drops as panels warm up", correct: true },
      { id: 'c', label: "Temperature has no significant effect on solar panel output" },
      { id: 'd', label: "Cold panels don't work until they warm up" }
    ],
    explanation: "Solar cells are more efficient when cold. Voltage increases at low temperatures (about 2mV/°C per cell). After eclipse exit, cold arrays may produce 20-30% more voltage than at operating temperature. Power systems must handle this 'cold array' peak voltage during eclipse exit transients."
  },
  {
    scenario: "A constellation of LEO satellites at different orbital inclinations shows significant variation in average power generation. Some orbits provide 20% more average power than others.",
    question: "Which orbital characteristic most affects average solar power in LEO?",
    options: [
      { id: 'a', label: "Orbital altitude - higher orbits get more power" },
      { id: 'b', label: "Beta angle variation - determines eclipse fraction and sun angle over the orbit", correct: true },
      { id: 'c', label: "Orbital eccentricity - elliptical orbits are better" },
      { id: 'd', label: "Ascending node timing - dawn/dusk orbits are best" }
    ],
    explanation: "Beta angle (determined by inclination, RAAN, and time of year) controls both eclipse duration and average sun angle over each orbit. Sun-synchronous 'dawn-dusk' orbits can have beta angles near 90°, providing continuous sunlight. Other orbits may spend 35% of time in eclipse with varying sun angles."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Communications Satellites (GEO)',
    short: 'Powering global connectivity from 36,000 km',
    tagline: '24/7 uptime demands reliable power',
    description: 'Geostationary communications satellites provide TV, internet, and phone services to billions. These spacecraft must generate 10-25 kW continuously for 15+ years, handling eclipse seasons and maintaining precise power budgets for thousands of transponders.',
    connection: 'GEO satellites experience predictable sun angles and twice-yearly eclipse seasons. Solar array sizing must account for cosine losses as the sun angle varies daily, plus degradation over the 15-year mission life. During eclipses, batteries must power all critical systems.',
    howItWorks: 'Large deployable solar arrays track the sun using single-axis gimbals. Power control units manage the transition between solar and battery power during eclipses. Arrays are oversized at beginning of life to ensure adequate power at end of life after radiation degradation.',
    stats: [
      { value: '25000W', label: 'Typical power generation', icon: '⚡' },
      { value: '36000 km', label: 'GEO orbit altitude', icon: '🌑' },
      { value: '60%', label: 'Panel efficiency at 60° angle', icon: '📅' }
    ],
    examples: ['Intelsat fleet', 'SES satellites', 'Viasat-3', 'Hughes Jupiter series'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Higher-power all-electric satellites using solar-electric propulsion require 30+ kW arrays, pushing solar technology to new limits.',
    color: '#3B82F6'
  },
  {
    icon: '🌍',
    title: 'Earth Observation (LEO)',
    short: 'Imaging every corner of Earth',
    tagline: 'Power through 16 orbits per day',
    description: 'Earth observation satellites in LEO orbit every 90 minutes, experiencing up to 16 sunrises and sunsets daily. High-resolution imaging requires precise power management, with peak demands during downlink and camera operation.',
    connection: 'LEO satellites face constantly changing sun angles and frequent eclipses. Sun-tracking arrays are essential for maintaining consistent power. Beta angle variations through the year dramatically change eclipse patterns and power availability.',
    howItWorks: 'Deployable solar wings with two-axis tracking maintain optimal sun pointing. High-capacity batteries handle 35-minute eclipses up to 16 times per day. Power management prioritizes imaging and data downlink during optimal geometry.',
    stats: [
      { value: '1-5kW', label: 'Typical power range', icon: '⚡' },
      { value: '35 min', label: 'Maximum eclipse (40% of orbit)', icon: '🌑' },
      { value: '5-7 years', label: 'Typical mission life', icon: '📅' }
    ],
    examples: ['Landsat series', 'Sentinel constellation', 'Planet Dove fleet', 'Maxar WorldView'],
    companies: ['Planet Labs', 'Maxar', 'Airbus DS', 'Capella Space'],
    futureImpact: 'Mega-constellations for daily global imaging require mass-produced, cost-effective power systems with rapid deployment capability.',
    color: '#10B981'
  },
  {
    icon: '🚀',
    title: 'Deep Space Missions',
    short: 'Power at the edge of the solar system',
    tagline: 'When the Sun is just another star',
    description: 'Missions beyond Earth orbit face unique power challenges. Solar intensity drops with the inverse square of distance - at Jupiter it\'s only 4% of Earth levels. Mission designers must choose between massive solar arrays or nuclear power sources.',
    connection: 'The cosine law still applies, but distance dominates. At Mars (1.5 AU), arrays need to be 2.25× larger. At Jupiter (5.2 AU), 27× larger. Beyond Jupiter, solar power becomes impractical, driving the use of RTGs (Radioisotope Thermoelectric Generators).',
    howItWorks: 'Deep space solar arrays use high-efficiency multi-junction cells (30%+) and concentrate sunlight where possible. Juno at Jupiter has the largest solar arrays ever flown (60 m² total). Missions to Saturn and beyond use nuclear RTGs instead.',
    stats: [
      { value: '1/27th', label: 'Solar intensity at Jupiter', icon: '☀️' },
      { value: '60 m²', label: 'Juno array area', icon: '📐' },
      { value: '500W', label: 'Juno power at Jupiter', icon: '⚡' }
    ],
    examples: ['Juno (Jupiter)', 'Mars rovers (Spirit/Opportunity)', 'Parker Solar Probe', 'Europa Clipper'],
    companies: ['NASA JPL', 'Lockheed Martin', 'Johns Hopkins APL', 'ESA'],
    futureImpact: 'Advanced solar cells and concentrators may extend solar power viability to Saturn. Space nuclear power development could enable outer planet surface missions.',
    color: '#8B5CF6'
  },
  {
    icon: '🛸',
    title: 'Space Stations & Habitats',
    short: 'Powering humanity in orbit',
    tagline: 'Life support demands uninterrupted power',
    description: 'Space stations require massive, reliable power for life support, experiments, and operations. The ISS generates over 100 kW from eight solar array wings spanning a football field, supporting 6+ astronauts continuously.',
    connection: 'Space stations in LEO experience extreme thermal cycling and sun angle variations. Arrays must track the sun while avoiding shadowing from station structure. Battery systems must be sized for crew safety during the ~35-minute eclipses every 90-minute orbit.',
    howItWorks: 'ISS uses four pairs of Solar Array Wings (SAWs) that rotate on two axes to track the sun. Nickel-hydrogen batteries (being replaced with lithium-ion) store energy for eclipse periods. Power is distributed at 160V DC and converted for different loads.',
    stats: [
      { value: '120kW', label: 'ISS peak power generation', icon: '⚡' },
      { value: '2,500 m²', label: 'Total solar array area', icon: '📐' },
      { value: '16 orbits', label: 'Eclipses per day', icon: '🌑' }
    ],
    examples: ['International Space Station', 'Tiangong station', 'Lunar Gateway (planned)', 'Axiom Station'],
    companies: ['Boeing', 'SpaceX', 'Axiom Space', 'NASA'],
    futureImpact: 'Lunar orbital stations will face 2-week eclipses during lunar shadow. Mars orbital stations must handle 1.5 AU distance solar intensity.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SatelliteSolarAngleRenderer: React.FC<SatelliteSolarAngleRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [orbitPosition, setOrbitPosition] = useState(0); // 0-360 degrees around orbit
  const [panelAngle, setPanelAngle] = useState(0); // -90 to 90 degrees panel tilt
  const [sunDirection, setSunDirection] = useState(0); // 0-360 degrees
  const [betaAngle, setBetaAngle] = useState(75); // 0-90 degrees
  const [sunTrackingEnabled, setSunTrackingEnabled] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isInEclipse, setIsInEclipse] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentAppRevealed, setCurrentAppRevealed] = useState(false);

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
    accent: '#60A5FA', // Space blue
    accentGlow: 'rgba(96, 165, 250, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for accessibility (brightness >= 180)
    textMuted: '#94a3b8', // Medium contrast
    border: '#2a2a3a',
    sun: '#FCD34D',
    earth: '#3B82F6',
    panel: '#60A5FA',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Slider styles
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: `linear-gradient(to right, ${colors.accent}44, ${colors.accent})`,
    borderRadius: '10px',
    outline: 'none',
    touchAction: 'none',
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Play',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate power based on sun angle (cosine law)
  const calculatePower = useCallback((incidenceAngle: number, inEclipse: boolean = false) => {
    if (inEclipse) return 0;
    // Power proportional to cos of incidence angle
    const angleRad = (Math.abs(incidenceAngle) * Math.PI) / 180;
    return Math.max(0, Math.cos(angleRad)) * 100; // Returns percentage
  }, []);

  // Calculate incidence angle between sun direction and panel normal
  const calculateIncidenceAngle = useCallback(() => {
    // Simplified: incidence angle is difference between sun direction and panel normal
    // Panel normal is perpendicular to panel surface
    const panelNormal = panelAngle; // Panel pointing direction relative to satellite body
    const relativeSunAngle = (sunDirection - orbitPosition + 360) % 360;

    // Convert to -180 to 180 range
    let angle = relativeSunAngle - 90 - panelNormal;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;

    return Math.min(90, Math.abs(angle));
  }, [orbitPosition, panelAngle, sunDirection]);

  // Check if satellite is in eclipse based on beta angle and orbit position
  const checkEclipse = useCallback(() => {
    // Simplified eclipse model
    // Eclipse occurs when satellite is behind Earth relative to Sun
    // Higher beta angle = less eclipse (orbit plane more parallel to sunlight)
    const eclipseDuration = Math.max(0, (90 - betaAngle) / 90) * 60; // degrees of orbit in eclipse
    const relativePos = (orbitPosition - sunDirection + 540) % 360;

    // Eclipse centered at 180 degrees from sun
    const inEclipse = relativePos > 180 - eclipseDuration / 2 && relativePos < 180 + eclipseDuration / 2;
    return inEclipse;
  }, [orbitPosition, sunDirection, betaAngle]);

  // Update eclipse state
  useEffect(() => {
    setIsInEclipse(checkEclipse());
  }, [checkEclipse]);

  // Sun tracking auto-adjustment
  useEffect(() => {
    if (sunTrackingEnabled && (phase === 'play' || phase === 'twist_play')) {
      const interval = setInterval(() => {
        setPanelAngle(current => {
          const relativeSunAngle = (sunDirection - orbitPosition + 360) % 360;
          let targetAngle = relativeSunAngle - 90;
          while (targetAngle > 90) targetAngle -= 180;
          while (targetAngle < -90) targetAngle += 180;

          const diff = targetAngle - current;
          return current + diff * 0.1; // Smooth tracking
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [sunTrackingEnabled, sunDirection, orbitPosition, phase]);

  const incidenceAngle = calculateIncidenceAngle();
  const currentPower = calculatePower(incidenceAngle, isInEclipse);

  // Satellite Visualization SVG Component
  const SatelliteVisualization = ({ showEclipse = true }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 280 : 350;
    const centerX = width / 2;
    const centerY = height / 2;
    const earthRadius = isMobile ? 40 : 50;
    const orbitRadius = isMobile ? 90 : 120;

    // Sun position (far left)
    const sunX = 30;
    const sunY = centerY;

    // Satellite position on orbit
    const satAngleRad = (orbitPosition * Math.PI) / 180;
    const satX = centerX + orbitRadius * Math.cos(satAngleRad);
    const satY = centerY + orbitRadius * Math.sin(satAngleRad);

    // Eclipse zone (shadow cone)
    const eclipseDuration = Math.max(0, (90 - betaAngle) / 90) * 60;
    const shadowAngle = ((sunDirection + 180) * Math.PI) / 180;

    // Panel orientation
    const panelLength = isMobile ? 25 : 35;
    const panelAngleRad = ((orbitPosition + panelAngle) * Math.PI) / 180;

    // Sun rays animation
    const rayOffset = (animationFrame * 2) % 20;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Satellite Solar Angle visualization">
        {/* Space background with stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={Math.random() * width}
            cy={Math.random() * height}
            r={Math.random() * 1.5 + 0.5}
            fill="white"
            opacity={0.3 + Math.random() * 0.4}
          />
        ))}

        {/* Sun with glow */}
        <defs>
          <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="60%" stopColor={colors.sun} />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
          <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={`ray-${i}`}
            x1={sunX + 20 * Math.cos((angle * Math.PI) / 180)}
            y1={sunY + 20 * Math.sin((angle * Math.PI) / 180)}
            x2={sunX + (35 + rayOffset % 10) * Math.cos((angle * Math.PI) / 180)}
            y2={sunY + (35 + rayOffset % 10) * Math.sin((angle * Math.PI) / 180)}
            stroke={colors.sun}
            strokeWidth="2"
            opacity="0.6"
          />
        ))}

        <circle cx={sunX} cy={sunY} r="18" fill="url(#sunGradient)" opacity="0.95" />

        {/* Earth shadow cone (simplified) */}
        {showEclipse && eclipseDuration > 0 && (
          <path
            d={`M ${centerX} ${centerY - earthRadius}
                L ${centerX + orbitRadius * 1.5} ${centerY - earthRadius * 0.5}
                L ${centerX + orbitRadius * 1.5} ${centerY + earthRadius * 0.5}
                L ${centerX} ${centerY + earthRadius}
                Z`}
            fill="rgba(0,0,0,0.4)"
            transform={`rotate(${sunDirection + 180}, ${centerX}, ${centerY})`}
          />
        )}

        {/* Orbit path */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke={colors.border}
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Earth */}
        <defs>
          <radialGradient id="earthGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>
        </defs>
        <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#earthGradient)" />

        {/* Continent hints */}
        <ellipse cx={centerX - 10} cy={centerY - 10} rx="15" ry="10" fill="#10B981" opacity="0.6" />
        <ellipse cx={centerX + 15} cy={centerY + 5} rx="10" ry="12" fill="#10B981" opacity="0.5" />

        {/* Satellite position marker - interactive point that moves with orbit position */}
        <circle cx={satX} cy={satY} r="8" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#sunGlow)" opacity="0.8" />

        {/* Satellite body */}
        <g transform={`translate(${satX}, ${satY}) rotate(${orbitPosition})`}>
          {/* Main body */}
          <rect x="-8" y="-6" width="16" height="12" fill="#374151" stroke="#6B7280" strokeWidth="1" rx="2" />

          {/* Solar panels */}
          <g transform={`rotate(${panelAngle})`}>
            {/* Left panel */}
            <rect
              x={-panelLength - 8}
              y="-4"
              width={panelLength}
              height="8"
              fill={isInEclipse ? '#1F2937' : colors.panel}
              stroke={colors.accent}
              strokeWidth="1"
              opacity={isInEclipse ? 0.5 : 0.9}
            />
            {/* Panel grid lines */}
            {[0.25, 0.5, 0.75].map((f, i) => (
              <line
                key={`left-grid-${i}`}
                x1={-8 - panelLength * f}
                y1="-4"
                x2={-8 - panelLength * f}
                y2="4"
                stroke={colors.border}
                strokeWidth="0.5"
              />
            ))}

            {/* Right panel */}
            <rect
              x="8"
              y="-4"
              width={panelLength}
              height="8"
              fill={isInEclipse ? '#1F2937' : colors.panel}
              stroke={colors.accent}
              strokeWidth="1"
              opacity={isInEclipse ? 0.5 : 0.9}
            />
            {/* Panel grid lines */}
            {[0.25, 0.5, 0.75].map((f, i) => (
              <line
                key={`right-grid-${i}`}
                x1={8 + panelLength * f}
                y1="-4"
                x2={8 + panelLength * f}
                y2="4"
                stroke={colors.border}
                strokeWidth="0.5"
              />
            ))}
          </g>

          {/* Antenna */}
          <line x1="0" y1="-6" x2="0" y2="-12" stroke="#9CA3AF" strokeWidth="1" />
          <circle cx="0" cy="-13" r="2" fill="#9CA3AF" />
        </g>

        {/* Sun direction indicator */}
        <line
          x1={satX}
          y1={satY}
          x2={satX + 40 * Math.cos(((sunDirection - orbitPosition) * Math.PI) / 180)}
          y2={satY + 40 * Math.sin(((sunDirection - orbitPosition) * Math.PI) / 180)}
          stroke={colors.sun}
          strokeWidth="2"
          strokeDasharray="3,3"
          opacity="0.5"
        />

        {/* Labels */}
        <text x={centerX} y={centerY + earthRadius + 15} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Earth</text>
        <text x={sunX} y={sunY + 30} fill={colors.sun} fontSize="11" textAnchor="middle">Sun</text>

        {/* Angle indicator label */}
        <text x={width / 2} y={height - 5} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Panel Angle: {panelAngle.toFixed(0)}° | Power: {isInEclipse ? 0 : currentPower.toFixed(0)}%
        </text>

        {/* Status indicator */}
        <rect x={width - 100} y={10} width="90" height="24" rx="4" fill={isInEclipse ? colors.error : colors.success} opacity="0.2" />
        <text x={width - 55} y={26} fill={isInEclipse ? colors.error : colors.success} fontSize="11" textAnchor="middle" fontWeight="600">
          {isInEclipse ? 'IN ECLIPSE' : 'SUNLIT'}
        </text>
      </svg>
    );
  };

  // Power curve visualization
  const PowerCurveVisualization = ({ showTitle = false }: { showTitle?: boolean } = {}) => {
    const width = isMobile ? 320 : 400;
    const height = isMobile ? 150 : 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate cosine curve points
    const curvePoints: { x: number; y: number; angle: number; power: number }[] = [];
    for (let angle = -90; angle <= 90; angle += 5) {
      const power = Math.cos((angle * Math.PI) / 180) * 100;
      const x = padding.left + ((angle + 90) / 180) * plotWidth;
      const y = padding.top + plotHeight - (power / 100) * plotHeight;
      curvePoints.push({ x, y, angle, power });
    }

    const curvePath = curvePoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
    ).join(' ');

    // Current operating point
    const currentAngle = Math.min(90, Math.max(-90, incidenceAngle));
    const opX = padding.left + ((currentAngle + 90) / 180) * plotWidth;
    const opY = padding.top + plotHeight - (currentPower / 100) * plotHeight;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgSecondary, borderRadius: '8px' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={`grid-h-${frac}`}
            x1={padding.left}
            y1={padding.top + frac * plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + frac * plotHeight}
            stroke={colors.border}
            strokeDasharray="2,2"
            opacity="0.5"
          />
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 5} fill={colors.textSecondary} fontSize="11" textAnchor="middle">X: Incidence Angle (deg)</text>
        <text x={12} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${padding.top + plotHeight / 2})`}>Y: Power (%)</text>

        {/* Angle markers */}
        {[-90, -45, 0, 45, 90].map(angle => (
          <text
            key={`angle-${angle}`}
            x={padding.left + ((angle + 90) / 180) * plotWidth}
            y={padding.top + plotHeight + 12}
            fill={colors.textMuted}
            fontSize="11"
            textAnchor="middle"
          >
            {angle}°
          </text>
        ))}

        {/* Cosine curve */}
        <path d={curvePath} fill="none" stroke={colors.accent} strokeWidth="2" />

        {/* Fill under curve */}
        <path
          d={`${curvePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`}
          fill={colors.accent}
          opacity="0.1"
        />

        {/* Operating point */}
        {!isInEclipse && (
          <g>
            <line x1={opX} y1={opY} x2={opX} y2={padding.top + plotHeight} stroke={colors.warning} strokeDasharray="3,3" />
            <circle cx={opX} cy={opY} r="6" fill={colors.warning} stroke="white" strokeWidth="2" />
          </g>
        )}

        {/* cos(theta) formula */}
        <text x={padding.left + plotWidth - 60} y={padding.top + 15} fill={colors.textSecondary} fontSize="11">
          P = P₀ × cos(θ)
        </text>

        {/* Title if needed */}
        {showTitle && (
          <text x={padding.left + plotWidth / 2} y={12} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
            Solar Power vs Incidence Angle
          </text>
        )}
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

  // Bottom Navigation Bar
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            minHeight: '44px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            opacity: canGoBack ? 1 : 0.5,
          }}
        >
          ← Back
        </button>

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
        }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                minHeight: '44px',
                padding: '18px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                display: 'block',
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>

        <button
          onClick={() => (canGoNext && phase !== 'test') && nextPhase()}
          disabled={!canGoNext || phase === 'test'}
          style={{
            minHeight: '44px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: (canGoNext && phase !== 'test') ? colors.accent : colors.border,
            color: 'white',
            cursor: (canGoNext && phase !== 'test') ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            opacity: (canGoNext && phase !== 'test') ? 1 : 0.5,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #3B82F6)`,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingTop: '60px',
        paddingBottom: '16px',
        textAlign: 'center',
        flex: 1,
      }}>
        {renderProgressBar()}
        <style>{`
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${colors.accent};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${colors.accent};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
        `}</style>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          🛰️☀️
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Welcome to Satellite Solar Angles
        </h1>
        <p className="text-muted" style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Discover how solar angle determines power in space - begin your exploration!</p>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do satellites tip their solar panels toward the sun? Because <span style={{ color: colors.accent }}>every degree matters</span> when you're 400 km above Earth with no power outlets."
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
            "The cosine law governs all solar power—on Earth and in space. Master this angle, and you control the energy."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Spacecraft Power Systems Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Enter Orbit →
        </button>
      </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Power stays constant as long as any sunlight hits the panel' },
      { id: 'b', text: 'Power drops linearly as the angle increases—45° gives 55% power' },
      { id: 'c', text: 'Power follows cosine: at 60° incidence, power is 50% (cos 60° = 0.5)' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            A satellite's solar panel is angled at 60 degrees from the sun. How does this affect power generation?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="280" height="120" style={{ margin: '0 auto' }}>
              {/* Sun */}
              <circle cx="40" cy="60" r="20" fill={colors.sun} />
              {/* Rays */}
              <line x1="65" y1="60" x2="160" y2="60" stroke={colors.sun} strokeWidth="2" strokeDasharray="4,4" />
              {/* Panel */}
              <rect x="170" y="30" width="8" height="60" fill={colors.panel} transform="rotate(30, 174, 60)" />
              {/* Angle arc */}
              <path d="M 174 60 L 194 60 A 20 20 0 0 0 188 46" fill="none" stroke={colors.textSecondary} strokeWidth="1" />
              <text x="200" y="55" fill={colors.textSecondary} fontSize="12">60°</text>
              {/* Labels */}
              <text x="40" y="95" fill={colors.textMuted} fontSize="11" textAnchor="middle">Sun</text>
              <text x="174" y="105" fill={colors.textMuted} fontSize="11" textAnchor="middle">Panel</text>
            </svg>
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

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Satellite Visualization
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Control the Solar Arrays
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust panel angle and orbit position to maximize power generation
            </p>

            {/* Observation Guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
                💡 The diagram above represents a satellite orbiting Earth. The visualization displays how the solar panel angle affects power output. When the panel angle increases, it causes the incidence angle to grow, which decreases power output. As the angle increases from 0° to 90°, power drops following the cosine curve. Maximum power occurs when panels face directly toward the sun! This matters for real-world satellite design: every degree of misalignment is important for mission power budgets.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '12px' : '0' }}>
                  <SatelliteVisualization showEclipse={false} />
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Orbit position slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Orbit Position</span>
                    <span style={{ ...typo.small, color: colors.earth, fontWeight: 600 }}>{orbitPosition.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="10"
                    value={orbitPosition}
                    onChange={(e) => setOrbitPosition(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                {/* Panel angle slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Panel Angle</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{panelAngle.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={panelAngle}
                    onChange={(e) => setPanelAngle(parseFloat(e.target.value))}
                    disabled={sunTrackingEnabled}
                    style={{
                      ...sliderStyle,
                      cursor: sunTrackingEnabled ? 'not-allowed' : 'pointer',
                      opacity: sunTrackingEnabled ? 0.5 : 1,
                    }}
                  />
                </div>

                {/* Sun tracking toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Manual Control</span>
                  <button
                    onClick={() => setSunTrackingEnabled(!sunTrackingEnabled)}
                    style={{
                      width: '60px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      background: sunTrackingEnabled ? colors.success : colors.border,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.3s',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: sunTrackingEnabled ? '33px' : '3px',
                      transition: 'left 0.3s',
                    }} />
                  </button>
                  <span style={{ ...typo.small, color: sunTrackingEnabled ? colors.success : colors.textSecondary, fontWeight: sunTrackingEnabled ? 600 : 400 }}>
                    Sun Tracking
                  </span>
                </div>

                {/* Power output display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : '1fr',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: isInEclipse ? colors.error : colors.accent }}>
                      {currentPower.toFixed(0)}%
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Current Power</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{incidenceAngle.toFixed(0)}°</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Incidence Angle</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: currentPower > 95 ? colors.success : currentPower > 70 ? colors.warning : colors.error
                    }}>
                      {currentPower > 95 ? 'Optimal' : currentPower > 70 ? 'Good' : 'Poor'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Efficiency</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cosine curve */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              Power Output Curve
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PowerCurveVisualization showTitle={true} />
            </div>
          </div>

          {/* Discovery prompt */}
          {currentPower > 95 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Maximum power achieved! Notice how the panel faces directly toward the sun.
              </p>
            </div>
          )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Cosine Law →
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Cosine Law of Solar Power
          </h2>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              As you predicted and observed in the experiment, the angle between sunlight and the solar panel dramatically affects power output. Your prediction is now confirmed by the cosine law!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PowerCurveVisualization />
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Power = P₀ × cos(θ)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.success }}>0° incidence</span> (perpendicular): cos(0°) = 1.0 → 100% power
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.warning }}>60° incidence</span>: cos(60°) = 0.5 → 50% power
              </p>
              <p>
                At <span style={{ color: colors.error }}>90° incidence</span> (edge-on): cos(90°) = 0 → 0% power
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
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The effective collection area of a solar panel decreases as the cosine of the incidence angle. This is why satellites use sun-tracking mechanisms to keep panels perpendicular to sunlight—maximizing power throughout the orbit.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Eclipse Effects →
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Eclipse duration is constant regardless of orbit orientation' },
      { id: 'b', text: 'Higher beta angles (orbit plane parallel to sun) mean shorter or no eclipses' },
      { id: 'c', text: 'Eclipse only occurs at the equator' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Beta Angle and Eclipses
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            How does a satellite's orbital geometry affect eclipse duration?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
              <strong>Beta angle</strong> is the angle between the orbital plane and the sun direction. It determines how much of the orbit passes through Earth's shadow.
            </p>
            {/* Static beta angle diagram - no sliders */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg width="300" height="160" viewBox="0 0 300 160" style={{ background: colors.bgSecondary, borderRadius: '8px' }} preserveAspectRatio="xMidYMid meet">
                {/* Sun rays from left */}
                {[40, 60, 80, 100, 120].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="60" y2={y} stroke={colors.sun} strokeWidth="1.5" opacity="0.7" />
                ))}
                <text x="30" y="140" fill={colors.sun} fontSize="11" textAnchor="middle">Sun</text>
                {/* Earth */}
                <circle cx="150" cy="80" r="25" fill="#1E40AF" />
                <text x="150" y="84" fill="white" fontSize="11" textAnchor="middle">Earth</text>
                {/* High beta orbit (nearly horizontal) */}
                <ellipse cx="150" cy="80" rx="60" ry="15" fill="none" stroke={colors.success} strokeWidth="1.5" strokeDasharray="4,3" />
                <text x="225" y="60" fill={colors.success} fontSize="11">β=90°</text>
                <text x="225" y="72" fill={colors.success} fontSize="11">No eclipse</text>
                {/* Low beta orbit (angled through shadow) */}
                <ellipse cx="150" cy="80" rx="60" ry="40" fill="none" stroke={colors.error} strokeWidth="1.5" strokeDasharray="4,3" />
                <text x="225" y="100" fill={colors.error} fontSize="11">β=0°</text>
                <text x="225" y="112" fill={colors.error} fontSize="11">Max eclipse</text>
                {/* Shadow cone */}
                <path d="M 150 55 L 210 48 L 210 112 L 150 105 Z" fill="rgba(0,0,0,0.3)" />
              </svg>
            </div>
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
              Explore Eclipse Dynamics →
            </button>
          )}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const eclipsePercent = Math.max(0, (90 - betaAngle) / 90) * 40; // Up to 40% of orbit

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Beta Angle and Eclipse Duration
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust the beta angle to see how orbital geometry affects power availability
            </p>

            {/* Observation Guidance */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
                💡 Watch: As you decrease beta angle, the shadow zone grows larger. At 0°, the satellite passes through Earth's shadow for up to 40% of its orbit. At 90°, no eclipse occurs!
              </p>
            </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '12px' : '0' }}>
                  <SatelliteVisualization showEclipse={true} />
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Beta angle slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Beta Angle</span>
                    <span style={{
                      ...typo.small,
                      color: betaAngle > 70 ? colors.success : betaAngle > 30 ? colors.warning : colors.error,
                      fontWeight: 600
                    }}>
                      {betaAngle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={betaAngle}
                    onChange={(e) => setBetaAngle(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>0° (max eclipse)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>90° (no eclipse)</span>
                  </div>
                </div>

                {/* Orbit position slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Orbit Position</span>
                    <span style={{ ...typo.small, color: colors.earth, fontWeight: 600 }}>{orbitPosition.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={orbitPosition}
                    onChange={(e) => setOrbitPosition(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : '1fr',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: isInEclipse ? colors.error : colors.success }}>
                      {isInEclipse ? 'Eclipse' : 'Sunlit'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{eclipsePercent.toFixed(0)}%</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Orbit in Eclipse</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{currentPower.toFixed(0)}%</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Current Power</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Eclipse visualization bar */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
              Orbit Power Profile (one complete orbit)
            </div>
            <div style={{
              height: '24px',
              borderRadius: '12px',
              background: `linear-gradient(to right,
                ${colors.success} 0%,
                ${colors.success} ${(100 - eclipsePercent) / 2}%,
                ${colors.error} ${(100 - eclipsePercent) / 2}%,
                ${colors.error} ${(100 + eclipsePercent) / 2}%,
                ${colors.success} ${(100 + eclipsePercent) / 2}%,
                ${colors.success} 100%)`,
              position: 'relative',
            }}>
              {/* Orbit position indicator */}
              <div style={{
                position: 'absolute',
                left: `${(orbitPosition / 360) * 100}%`,
                top: '-4px',
                width: '4px',
                height: '32px',
                background: 'white',
                borderRadius: '2px',
                transform: 'translateX(-50%)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.success }}>Sunlit</span>
              <span style={{ ...typo.small, color: colors.error }}>Eclipse ({eclipsePercent.toFixed(0)}%)</span>
              <span style={{ ...typo.small, color: colors.success }}>Sunlit</span>
            </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Power System Design →
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Designing for Orbital Reality
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Sun-Tracking Arrays</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Sun-Tracking Arrays</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Active mechanisms rotate panels to face the sun continuously. Essential in LEO where sun direction changes rapidly. The ISS arrays rotate on two axes to maintain optimal power throughout 16 daily orbits.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Body-Fixed Arrays</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Body-Fixed Arrays</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Simpler, lighter, more reliable. Panels are fixed to the spacecraft body. Works well for spin-stabilized satellites or when power requirements are modest. Accepts cosine losses in exchange for simplicity.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Battery Sizing</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Battery Sizing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Eclipse duration directly determines battery capacity. A LEO satellite with 35-minute eclipses needs batteries for 39% of orbital energy. Batteries must handle thousands of charge/discharge cycles over mission life.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Beta Angle Optimization</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Beta Angle Optimization</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Dawn-dusk sun-synchronous orbits maintain high beta angles year-round, providing continuous sunlight. This is ideal for power-hungry missions like Earth observation satellites that need constant solar charging.
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

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Satellite Solar Angle"
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
    const isLastApp = selectedApp === realWorldApps.length - 1;

    const handleGotIt = () => {
      playSound('click');
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      setCurrentAppRevealed(false);
      if (!isLastApp) {
        setSelectedApp(selectedApp + 1);
      }
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator: App X of Y */}
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              App {selectedApp + 1} of {realWorldApps.length}
            </p>

            {/* App selector tabs */}
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
                  setCurrentAppRevealed(false);
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
                Solar Angle Connection:
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

            {/* Got It / Next App button */}
            {!allAppsCompleted && (
              <button
                onClick={handleGotIt}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${colors.accent})`,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                }}
              >
                {completedApps[selectedApp] ? (isLastApp ? 'Complete ✓' : 'Next App →') : 'Got It →'}
              </button>
            )}
          </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test →
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
                ? 'You\'ve mastered satellite solar angle concepts!'
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
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'orbit 4s ease-in-out infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes orbit { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Solar Angle Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how solar angles affect satellite power generation and the engineering challenges of powering spacecraft in orbit.
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
              'The cosine law: Power = P₀ × cos(θ)',
              'Sun-tracking vs body-fixed solar arrays',
              'Beta angle and eclipse duration relationship',
              'LEO vs GEO power profiles',
              'Battery sizing for eclipse periods',
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default SatelliteSolarAngleRenderer;
