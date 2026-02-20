'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 199: RADIATION EFFECTS ON ELECTRONICS
// Physics: SEU rate, Total Ionizing Dose (TID), Latchup from energetic particles
// The Van Allen belts trap high-energy particles creating hazardous regions
// ============================================================================

const realWorldApps = [
  {
    icon: '1',
    title: 'Satellite Radiation Hardening',
    short: 'Satellites',
    tagline: 'Surviving the harsh space radiation environment',
    description: 'Satellites operating in Earth orbit face constant bombardment from high-energy protons, electrons, and heavy ions. The Van Allen radiation belts create particularly intense zones where particle fluxes can be millions of times higher than at ground level. Without proper radiation hardening, satellite electronics can experience bit flips, permanent damage, and catastrophic latchup events that can destroy entire systems within hours.',
    connection: 'This game teaches exactly how radiation interacts with semiconductor devices - the same physics that satellite engineers must understand to design systems that survive 15+ years in orbit.',
    howItWorks: 'Radiation-hardened designs use specialized manufacturing processes with insulating substrates (SOI), triple modular redundancy (TMR), error-correcting memory, current-limiting circuits for latchup protection, and thick shielding.',
    stats: [
      { value: '10-15', label: 'Year mission lifetimes' },
      { value: '$500M+', label: 'Typical satellite cost' },
      { value: '100x', label: 'Rad-hard chip cost premium' }
    ],
    examples: ['GPS III satellites', 'James Webb Space Telescope', 'Juno Jupiter probe', 'Mars rovers Curiosity and Perseverance'],
    companies: ['BAE Systems', 'Honeywell', 'Microchip Microsemi', 'Cobham Advanced Electronic Solutions'],
    color: '#3B82F6'
  },
  {
    icon: '2',
    title: 'Nuclear Facility Control Systems',
    short: 'Nuclear',
    tagline: 'Keeping reactors safe under intense radiation',
    description: 'Nuclear power plants and research reactors require instrumentation and control systems that function reliably in radiation fields that would destroy ordinary electronics within minutes. Sensors measuring reactor conditions must operate continuously in environments where total ionizing dose can reach 1 Mrad per year. Safety systems must guarantee correct operation even when radiation is causing ongoing damage to transistors.',
    connection: 'The TID accumulation mechanics in this game directly model how reactor instrumentation degrades over time, requiring scheduled replacement before critical failure thresholds are reached.',
    howItWorks: 'Nuclear-grade electronics use radiation-hardened components rated for 1 Mrad or more total dose. Analog circuits often outperform digital in high-radiation areas. Fiber optic cables replace electrical wiring in high-dose zones.',
    stats: [
      { value: '1 Mrad', label: 'Typical TID tolerance' },
      { value: '40+', label: 'Year reactor lifetimes' },
      { value: '99.9%', label: 'Required availability' }
    ],
    examples: ['Reactor protection systems', 'In-core neutron detectors', 'Fuel handling robotics', 'Remote inspection cameras'],
    companies: ['Westinghouse', 'Framatome', 'General Electric', 'Rolls Royce'],
    color: '#10B981'
  },
  {
    icon: '3',
    title: 'High-Altitude Avionics',
    short: 'Aviation',
    tagline: 'Flying safely through cosmic radiation',
    description: 'Commercial aircraft cruising at 35000 to 40000 feet experience cosmic ray flux 100 to 300 times higher than at sea level. Single Event Upsets in flight computers have caused autopilot disconnects, display anomalies, and navigation errors. The polar routes favored for transpacific flights pass through regions with even higher radiation intensity due to weaker geomagnetic shielding.',
    connection: 'This game simulates SEU rates at different altitudes - the exact analysis avionics engineers perform when certifying flight-critical systems for high-altitude operation.',
    howItWorks: 'Aviation electronics use triple-redundant computing with voting logic, error-detecting and correcting memory (EDAC), watchdog timers, and architectural isolation. Designs are validated through neutron beam testing at particle accelerators.',
    stats: [
      { value: '300x', label: 'Increased cosmic flux at altitude' },
      { value: '1e-9', label: 'Required failure rate per hour' },
      { value: '$1B+', label: 'Avionics development per aircraft' }
    ],
    examples: ['Boeing 787 flight computers', 'Airbus A350 avionics', 'Fly-by-wire systems', 'Engine control units'],
    companies: ['Collins Aerospace', 'Honeywell Aerospace', 'Thales', 'Safran'],
    color: '#8B5CF6'
  },
  {
    icon: '4',
    title: 'Particle Physics Detectors',
    short: 'Physics',
    tagline: 'Discovering particles in a sea of radiation',
    description: 'The Large Hadron Collider at CERN generates radiation environments more intense than any spacecraft encounters. Detector electronics near the beam pipe receive radiation doses equivalent to decades in space within months. Yet these systems must precisely measure particles from 40 MHz collisions while embedded in this extreme environment, requiring unprecedented radiation tolerance.',
    connection: 'The SEU and latchup mechanisms explored in this game are daily concerns for physicists designing detector readout electronics that must survive LHC radiation levels of 1 GGy over their operational lifetime.',
    howItWorks: 'Detector ASICs use deep submicron processes with built-in radiation tolerance, redundant encoding of configuration data, frequent refresh of stored values, and architectures that can continue operating even with some failed channels.',
    stats: [
      { value: '1 GGy', label: 'LHC detector lifetime dose' },
      { value: '40 MHz', label: 'Collision rate' },
      { value: '100M', label: 'Readout channels total' }
    ],
    examples: ['ATLAS detector at CERN', 'CMS experiment', 'LHCb spectrometer', 'ALICE heavy-ion detector'],
    companies: ['CERN', 'Fermilab', 'SLAC National Accelerator Laboratory', 'DESY'],
    color: '#F59E0B'
  }
];

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseNames: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Play',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Play',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

const colors = {
  bgPrimary: '#0a0f1a',
  bgCard: '#111827',
  bgCardHover: '#1e293b',
  border: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#ef4444',
  accentSecondary: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const RadiationEffectsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);

  // Simulation state
  const [altitude, setAltitude] = useState(400);
  const [shielding, setShielding] = useState(2);
  const [chipType, setChipType] = useState<'commercial' | 'rad-tolerant' | 'rad-hard'>('commercial');
  const [solarActivity, setSolarActivity] = useState<'quiet' | 'moderate' | 'storm'>('quiet');
  const [seuCount, setSeuCount] = useState(0);
  const [tidAccumulated, setTidAccumulated] = useState(0);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Physics calculations
  const calculateRadiation = useCallback(() => {
    let fluxFactor = 1;
    if (altitude < 1000) {
      fluxFactor = 0.5 + altitude / 2000;
    } else if (altitude >= 1000 && altitude <= 6000) {
      fluxFactor = 10 + 90 * Math.sin((altitude - 1000) / 5000 * Math.PI);
    } else if (altitude > 6000 && altitude < 13000) {
      fluxFactor = 10 - 8 * ((altitude - 6000) / 7000);
    } else if (altitude >= 13000 && altitude <= 30000) {
      fluxFactor = 2 + 50 * Math.sin((altitude - 13000) / 17000 * Math.PI);
    } else {
      fluxFactor = 5;
    }
    const solarMultiplier = solarActivity === 'quiet' ? 1 : solarActivity === 'moderate' ? 3 : 10;
    const shieldingFactor = Math.exp(-shielding / 5);
    const hardnessFactor = chipType === 'commercial' ? 1 : chipType === 'rad-tolerant' ? 0.1 : 0.01;
    const seuRate = fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor * 0.1;
    const tidRate = fluxFactor * solarMultiplier * shieldingFactor * 10;
    const latchupRisk = fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor > 5 ? 'HIGH' :
                        fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor > 1 ? 'MODERATE' : 'LOW';
    return {
      fluxFactor: fluxFactor.toFixed(1),
      seuRate: seuRate.toFixed(2),
      tidRate: tidRate.toFixed(1),
      latchupRisk,
      beltRegion: altitude < 1000 ? 'Below Inner Belt' :
                  altitude <= 6000 ? 'INNER BELT' :
                  altitude < 13000 ? 'Slot Region' :
                  altitude <= 30000 ? 'OUTER BELT' : 'Beyond Belts',
      riskLevel: fluxFactor > 50 ? 'CRITICAL' : fluxFactor > 10 ? 'HIGH' : fluxFactor > 2 ? 'MODERATE' : 'LOW'
    };
  }, [altitude, shielding, chipType, solarActivity]);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // SEU accumulation
  useEffect(() => {
    const interval = setInterval(() => {
      const rad = calculateRadiation();
      if (Math.random() < parseFloat(rad.seuRate) / 100) {
        setSeuCount(c => c + 1);
      }
      setTidAccumulated(t => t + parseFloat(rad.tidRate) / 8640);
    }, 100);
    return () => clearInterval(interval);
  }, [calculateRadiation]);

  // Discovery messages on altitude change
  useEffect(() => {
    if (altitude >= 1000 && altitude <= 6000) {
      setDiscoveryMessage('You entered the inner Van Allen belt! Proton flux is extremely high here. SEU rates spike dramatically.');
    } else if (altitude >= 13000 && altitude <= 30000) {
      setDiscoveryMessage('You are in the outer Van Allen belt! Trapped electrons create intense radiation that degrades electronics over time.');
    } else if (altitude < 500) {
      setDiscoveryMessage('Low Earth Orbit is relatively safe. The ISS operates here, shielded by Earth\'s magnetic field.');
    } else if (altitude > 35000) {
      setDiscoveryMessage('Geostationary orbit sits above the outer belt. Radiation is moderate but constant over 15+ year missions.');
    } else {
      setDiscoveryMessage('');
    }
  }, [altitude]);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click' | 'beep') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      const configs: Record<string, () => void> = {
        transition: () => { oscillator.frequency.setValueAtTime(440, ctx.currentTime); gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.15); },
        correct: () => { oscillator.frequency.setValueAtTime(523, ctx.currentTime); gainNode.gain.setValueAtTime(0.15, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.2); },
        incorrect: () => { oscillator.frequency.setValueAtTime(200, ctx.currentTime); gainNode.gain.setValueAtTime(0.12, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.25); },
        complete: () => { oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(392, ctx.currentTime); gainNode.gain.setValueAtTime(0.15, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.3); },
        click: () => { oscillator.frequency.setValueAtTime(600, ctx.currentTime); gainNode.gain.setValueAtTime(0.08, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.05); },
        beep: () => { oscillator.frequency.setValueAtTime(1000, ctx.currentTime); gainNode.gain.setValueAtTime(0.05, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03); oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.03); },
      };
      configs[soundType]?.();
    } catch {
      // Audio not available
    }
  }, []);

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });
  }, [playSound, onGameEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'bitflips' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'bitflips' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'van_allen' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'van_allen' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });
  }, [testAnswers, playSound, onGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: realWorldApps[appIndex].title } });
  }, [playSound, onGameEvent]);

  const testQuestions = [
    {
      question: "What is a Single Event Upset (SEU)?",
      options: [
        { text: "A satellite collision", correct: false },
        { text: "A bit flip in memory caused by a high-energy particle", correct: true },
        { text: "An electrical short circuit", correct: false },
        { text: "A software bug", correct: false }
      ]
    },
    {
      question: "Why do space-grade chips cost so much more than commercial chips?",
      options: [
        { text: "They use gold instead of copper", correct: false },
        { text: "They are rad-hardened with special design and manufacturing", correct: true },
        { text: "They are hand-made by astronauts", correct: false },
        { text: "Space agencies overcharge for them", correct: false }
      ]
    },
    {
      question: "What are the Van Allen belts?",
      options: [
        { text: "Asteroid debris orbiting Earth", correct: false },
        { text: "Regions of trapped energetic particles around Earth", correct: true },
        { text: "Radio interference zones", correct: false },
        { text: "Magnetic field lines visible from space", correct: false }
      ]
    },
    {
      question: "Total Ionizing Dose (TID) causes damage by:",
      options: [
        { text: "Making the chip physically crack", correct: false },
        { text: "Accumulating charge in oxide layers, degrading transistor performance", correct: true },
        { text: "Changing the chip's color", correct: false },
        { text: "Making the chip radioactive", correct: false }
      ]
    },
    {
      question: "What is latchup in electronics?",
      options: [
        { text: "When a chip gets locked in a high-current state, potentially destructive", correct: true },
        { text: "When the satellite latches onto a space station", correct: false },
        { text: "A type of memory storage", correct: false },
        { text: "Normal chip operation", correct: false }
      ]
    },
    {
      question: "Which orbit altitude is typically MOST hazardous for radiation?",
      options: [
        { text: "LEO at 400 km (below inner belt)", correct: false },
        { text: "MEO passing through Van Allen belts (1000-30000 km)", correct: true },
        { text: "GEO at 36000 km (above outer belt)", correct: false },
        { text: "All orbits have identical radiation", correct: false }
      ]
    },
    {
      question: "How does shielding help protect electronics?",
      options: [
        { text: "It makes the satellite invisible to particles", correct: false },
        { text: "It absorbs or deflects incoming particles, reducing dose", correct: true },
        { text: "It creates a magnetic field", correct: false },
        { text: "It has no effect on space radiation", correct: false }
      ]
    },
    {
      question: "During a solar storm, radiation levels can:",
      options: [
        { text: "Stay exactly the same", correct: false },
        { text: "Increase by 10-1000x for hours to days", correct: true },
        { text: "Drop to zero", correct: false },
        { text: "Only affect the Sun", correct: false }
      ]
    },
    {
      question: "Triple Modular Redundancy (TMR) protects against SEUs by:",
      options: [
        { text: "Using three copies and voting - one upset is outvoted", correct: true },
        { text: "Making the chip three times thicker", correct: false },
        { text: "Running the chip three times faster", correct: false },
        { text: "It does not protect against SEUs at all", correct: false }
      ]
    },
    {
      question: "Why do GPS satellites in MEO require more radiation hardening than ISS?",
      options: [
        { text: "GPS satellites are older", correct: false },
        { text: "GPS orbits pass through the Van Allen belts", correct: true },
        { text: "ISS has astronauts who can fix things", correct: false },
        { text: "GPS satellites are smaller", correct: false }
      ]
    }
  ];

  // ============================================================
  // SVG VISUALIZATION - Radiation profile with interactive marker
  // ============================================================
  const renderVisualization = () => {
    const rad = calculateRadiation();
    const svgW = 500;
    const svgH = 350;
    const plotLeft = 60;
    const plotRight = 460;
    const plotTop = 40;
    const plotBottom = 300;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // Generate radiation flux curve data points (altitude vs flux)
    const dataPoints: { x: number; y: number; alt: number; flux: number }[] = [];
    const altSteps = [200, 500, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 15000, 17000, 19000, 21000, 23000, 25000, 27000, 30000, 33000, 36000, 40000];
    const maxFlux = 100;
    for (const alt of altSteps) {
      let flux = 0.5;
      if (alt < 1000) {
        flux = 0.5 + alt / 2000;
      } else if (alt >= 1000 && alt <= 6000) {
        flux = 10 + 90 * Math.sin((alt - 1000) / 5000 * Math.PI);
      } else if (alt > 6000 && alt < 13000) {
        flux = 10 - 8 * ((alt - 6000) / 7000);
      } else if (alt >= 13000 && alt <= 30000) {
        flux = 2 + 50 * Math.sin((alt - 13000) / 17000 * Math.PI);
      } else {
        flux = 5;
      }
      const xNorm = alt / 40000;
      const yNorm = Math.min(flux / maxFlux, 1);
      dataPoints.push({
        x: plotLeft + xNorm * plotW,
        y: plotBottom - yNorm * plotH,
        alt,
        flux,
      });
    }

    // Build SVG path with L commands
    const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Current marker position
    const curFlux = parseFloat(rad.fluxFactor);
    const markerX = plotLeft + (altitude / 40000) * plotW;
    const markerY = plotBottom - (Math.min(curFlux / maxFlux, 1)) * plotH;

    // Grid lines
    const gridYValues = [0, 25, 50, 75, 100];
    const gridXAlts = [0, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000];

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '600px' }}>
        <defs>
          <linearGradient id="radCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="25%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="radFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="radMarkerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
          <filter id="radGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="#0f172a" rx="8" />

        {/* Title */}
        <text x={svgW / 2} y="22" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">Radiation Flux vs Altitude</text>

        {/* Grid lines */}
        {gridYValues.map(val => {
          const y = plotBottom - (val / maxFlux) * plotH;
          return (
            <g key={`gy-${val}`}>
              <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.6} />
              <text x={plotLeft - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="system-ui, sans-serif">{val}</text>
            </g>
          );
        })}
        {gridXAlts.map(alt => {
          const x = plotLeft + (alt / 40000) * plotW;
          return (
            <g key={`gx-${alt}`}>
              <line x1={x} y1={plotTop} x2={x} y2={plotBottom} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.5} />
              <text x={x} y={plotBottom + 16} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="system-ui, sans-serif">{alt >= 1000 ? `${alt / 1000}k` : alt}</text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={svgW / 2} y={plotBottom + 35} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="system-ui, sans-serif">Altitude (km)</text>
        <text x="14" y="14" textAnchor="start" fill="#cbd5e1" fontSize="11" fontFamily="system-ui, sans-serif">Intensity</text>

        {/* Belt region shading */}
        <rect x={plotLeft + (1000 / 40000) * plotW} y={plotTop} width={(5000 / 40000) * plotW} height={plotH} fill="#ef4444" opacity={0.08} />
        <rect x={plotLeft + (13000 / 40000) * plotW} y={plotTop} width={(17000 / 40000) * plotW} height={plotH} fill="#f59e0b" opacity={0.08} />

        {/* Belt labels */}
        <text x={plotLeft + (3500 / 40000) * plotW} y={plotTop - 2} textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif" filter="url(#radGlow)">Inner Belt</text>
        <text x={plotLeft + (21500 / 40000) * plotW} y={plotTop - 2} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif" filter="url(#radGlow)">Outer Belt</text>

        {/* Fill under curve */}
        <path d={`${pathD} L ${dataPoints[dataPoints.length - 1].x.toFixed(1)} ${plotBottom} L ${dataPoints[0].x.toFixed(1)} ${plotBottom} Z`} fill="url(#radFillGrad)" />

        {/* Main curve */}
        <path d={pathD} fill="none" stroke="url(#radCurveGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Axes */}
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#475569" strokeWidth="1" />
        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#475569" strokeWidth="1" />

        {/* Interactive marker */}
        <circle cx={markerX} cy={markerY} r="12" fill="url(#radMarkerGlow)" />
        <circle cx={markerX} cy={markerY} r="6" fill="#fde047" stroke="#ffffff" strokeWidth="2" />
        <circle cx={markerX} cy={markerY} r="3" fill="#ffffff" />

        {/* Marker value label */}
        <rect x={markerX - 35} y={markerY - 28} width="70" height="18" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
        <text x={markerX} y={markerY - 15} textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">{altitude} km</text>

        {/* Status readout - right side */}
        <rect x={plotRight - 135} y={plotBottom - 95} width="130" height="90" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="0.5" opacity={0.95} />
        <text x={plotRight - 70} y={plotBottom - 78} textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" filter="url(#radGlow)">STATUS</text>
        <text x={plotRight - 130} y={plotBottom - 62} fill="#cbd5e1" fontSize="11" fontFamily="system-ui, sans-serif">SEU:</text>
        <text x={plotRight - 10} y={plotBottom - 62} textAnchor="end" fill="#a855f7" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">{rad.seuRate}/day</text>
        <text x={plotRight - 130} y={plotBottom - 46} fill="#cbd5e1" fontSize="11" fontFamily="system-ui, sans-serif">TID:</text>
        <text x={plotRight - 10} y={plotBottom - 46} textAnchor="end" fill="#f59e0b" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">{rad.tidRate} rad/d</text>
        <text x={plotRight - 130} y={plotBottom - 30} fill="#cbd5e1" fontSize="11" fontFamily="system-ui, sans-serif">Latchup:</text>
        <text x={plotRight - 10} y={plotBottom - 30} textAnchor="end" fill={rad.latchupRisk === 'HIGH' ? '#ef4444' : rad.latchupRisk === 'MODERATE' ? '#f59e0b' : '#22c55e'} fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">{rad.latchupRisk}</text>
        <text x={plotRight - 70} y={plotBottom - 14} textAnchor="middle" fill={rad.beltRegion.includes('BELT') ? '#ef4444' : '#22c55e'} fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">{rad.beltRegion}</text>
      </svg>
    );
  };

  // ============================================================
  // NAVIGATION BAR - fixed at top with Back, dots, Next
  // ============================================================
  const renderNavigationBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      background: 'rgba(10, 15, 26, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #334155',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '44px',
    }}>
      <button
        onClick={goBack}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '10px',
          border: '1px solid #334155',
          background: currentPhaseIndex > 0 ? '#1e293b' : 'transparent',
          color: currentPhaseIndex > 0 ? '#e2e8f0' : '#475569',
          fontWeight: 600,
          fontSize: '14px',
          cursor: currentPhaseIndex > 0 ? 'pointer' : 'not-allowed',
          opacity: currentPhaseIndex > 0 ? 1 : 0.5,
          transition: 'all 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back
      </button>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => goToPhase(p)}
            title={phaseNames[p]}
            style={{
              width: phase === p ? '20px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: phase === p
                ? 'linear-gradient(135deg, #ef4444, #a855f7)'
                : currentPhaseIndex > i
                  ? '#22c55e'
                  : '#334155',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <button
        onClick={goNext}
        disabled={currentPhaseIndex >= phaseOrder.length - 1}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '10px',
          border: 'none',
          background: currentPhaseIndex < phaseOrder.length - 1
            ? 'linear-gradient(135deg, #ef4444, #a855f7)'
            : '#1e293b',
          color: currentPhaseIndex < phaseOrder.length - 1 ? '#ffffff' : '#475569',
          fontWeight: 700,
          fontSize: '14px',
          cursor: currentPhaseIndex < phaseOrder.length - 1 ? 'pointer' : 'not-allowed',
          opacity: currentPhaseIndex < phaseOrder.length - 1 ? 1 : 0.5,
          transition: 'all 0.2s ease',
          boxShadow: currentPhaseIndex < phaseOrder.length - 1 ? '0 2px 12px rgba(239, 68, 68, 0.3)' : 'none',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Next
      </button>
    </nav>
  );

  // ============================================================
  // PROGRESS BAR
  // ============================================================
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '44px',
      left: 0,
      right: 0,
      height: '3px',
      background: '#1e293b',
      zIndex: 49,
    }}>
      <div style={{
        width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #ef4444, #a855f7)',
        transition: 'width 0.4s ease',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );

  // ============================================================
  // SLIDER COMPONENT
  // ============================================================
  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit: string = '') => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fde047' }}>{value.toLocaleString()}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '20px',
          touchAction: 'pan-y',
          accentColor: '#ef4444',
          WebkitAppearance: 'none',
          appearance: 'none' as const,
          background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
          borderRadius: '10px',
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{min.toLocaleString()}{unit}</span>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{max.toLocaleString()}{unit}</span>
      </div>
    </div>
  );

  // ============================================================
  // CARD COMPONENT
  // ============================================================
  const cardStyle = (highlight: boolean = false): React.CSSProperties => ({
    background: highlight ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(168,85,247,0.1))' : '#111827',
    border: `1px solid ${highlight ? 'rgba(239,68,68,0.3)' : '#334155'}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: highlight ? '0 4px 20px rgba(239,68,68,0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
  });

  // ============================================================
  // PHASE CONTENT RENDERERS
  // ============================================================

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px', marginBottom: '24px' }}>
        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', letterSpacing: '0.05em' }}>SPACE RADIATION</span>
      </div>

      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', lineHeight: '1.2', background: 'linear-gradient(135deg, #ffffff, #fca5a5, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', maxWidth: '600px' }}>
        Why Do Space Chips Cost 1000x More?
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '24px', lineHeight: '1.6', fontWeight: 400 }}>
        Your phone has more processing power than early spacecraft, but would fail in minutes in space. What is so different?
      </p>

      <div style={{ ...cardStyle(true), maxWidth: '600px', padding: '16px' }}>
        {renderVisualization()}
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          marginTop: '24px',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #ef4444, #a855f7)',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 700,
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Discover Radiation Effects
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '16px', lineHeight: '1.3' }}>Make Your Prediction</h2>

      <div style={{ ...cardStyle(), maxWidth: '600px', padding: '16px', marginBottom: '16px' }}>
        {renderVisualization()}
      </div>

      <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '20px', textAlign: 'center', maxWidth: '500px', lineHeight: '1.6' }}>
        High-energy particles bombard spacecraft constantly. What is the most common effect on electronics?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '500px', marginBottom: '20px' }}>
        {[
          { id: 'heat', text: 'They heat up the chip until it melts' },
          { id: 'bitflips', text: 'They flip bits in memory - turning 0s to 1s randomly' },
          { id: 'glow', text: 'They make the chip glow with radiation' },
          { id: 'nothing', text: 'Modern chips are immune to radiation' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '1.4',
              border: showPredictionFeedback && option.id === 'bitflips'
                ? '2px solid #22c55e'
                : showPredictionFeedback && selectedPrediction === option.id
                  ? '2px solid #ef4444'
                  : '1px solid #334155',
              background: showPredictionFeedback && option.id === 'bitflips'
                ? 'rgba(34,197,94,0.2)'
                : showPredictionFeedback && selectedPrediction === option.id
                  ? 'rgba(239,68,68,0.2)'
                  : selectedPrediction === option.id
                    ? 'rgba(168,85,247,0.2)'
                    : '#111827',
              color: '#e2e8f0',
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{ ...cardStyle(true), maxWidth: '500px' }}>
          <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: selectedPrediction === 'bitflips' ? '#22c55e' : '#ef4444' }}>
            {selectedPrediction === 'bitflips' ? 'Exactly right!' : 'Close, but the main effect is more subtle!'}
          </p>
          <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '14px' }}>
            Single Event Upsets (SEUs) - when a particle strikes a transistor and flips a bit - are the most common radiation effect. One cosmic ray can change your data or crash your program!
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const rad = calculateRadiation();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', lineHeight: '1.3' }}>Radiation Environment Simulator</h2>

        <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px', textAlign: 'center', maxWidth: '500px', lineHeight: '1.5' }}>
          This visualization shows the radiation flux factor across different orbital altitudes. Notice how the curve peaks at the Van Allen belts where trapped particles create intense radiation zones. Try adjusting altitude and observe how SEU rate, TID dose, and latchup risk change in real time.
        </p>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ ...cardStyle(true), padding: '16px', marginBottom: '16px' }}>
              {renderVisualization()}
            </div>

            {/* Educational: cause-effect, key terms, real-world */}
            <div style={{ ...cardStyle(), width: '100%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>What You Are Seeing</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '12px' }}>
            Because higher altitude means entering the Van Allen radiation belts, the flux factor (radiation intensity) increases dramatically. Moving the altitude slider from 400 km to 3000 km shows how SEU rate spikes when entering the inner belt. This is why satellites in medium Earth orbit need extensive radiation hardening.
          </p>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '12px' }}>
            <strong style={{ color: '#a855f7' }}>Key Terms:</strong> SEU (Single Event Upset) = a bit flip from a particle strike. TID (Total Ionizing Dose) = cumulative radiation damage over time. Latchup = destructive high-current state triggered by a particle.
          </p>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            <strong style={{ color: '#f59e0b' }}>Real-World Impact:</strong> The International Space Station at 400 km altitude experiences about 0.5 SEU per day. GPS satellites at 20200 km in the outer belt experience 50x more radiation, which is why each GPS satellite costs over $500M with extensive shielding.
          </p>
        </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{ ...cardStyle(), width: '100%' }}>
              {renderSlider('Altitude', altitude, 200, 40000, 200, setAltitude, ' km')}
              {renderSlider('Shielding', shielding, 0, 20, 1, setShielding, ' mm Al')}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {(['commercial', 'rad-tolerant', 'rad-hard'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setChipType(type)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: chipType === type ? '2px solid #a855f7' : '1px solid #334155',
                      background: chipType === type ? 'rgba(168,85,247,0.2)' : '#0f172a',
                      color: chipType === type ? '#c4b5fd' : '#94a3b8',
                      fontWeight: chipType === type ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {type === 'commercial' ? 'Commercial' : type === 'rad-tolerant' ? 'Rad-Tolerant' : 'Rad-Hard'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {(['quiet', 'moderate', 'storm'] as const).map(activity => (
                  <button
                    key={activity}
                    onClick={() => setSolarActivity(activity)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: solarActivity === activity ? '2px solid #f59e0b' : '1px solid #334155',
                      background: solarActivity === activity ? 'rgba(245,158,11,0.2)' : '#0f172a',
                      color: solarActivity === activity ? '#fde047' : '#94a3b8',
                      fontWeight: solarActivity === activity ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data readout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', maxWidth: '600px', width: '100%', marginTop: '16px' }}>
          <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7' }}>{rad.seuRate}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>SEU/day</div>
          </div>
          <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{rad.tidRate}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>rad/day TID</div>
          </div>
          <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: rad.latchupRisk === 'HIGH' ? '#ef4444' : rad.latchupRisk === 'MODERATE' ? '#f59e0b' : '#22c55e' }}>{rad.latchupRisk}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Latchup Risk</div>
          </div>
        </div>

        {/* Discovery message */}
        {discoveryMessage && (
          <div style={{ ...cardStyle(true), maxWidth: '600px', width: '100%', marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: '#fde047', lineHeight: '1.5', fontWeight: 600 }}>
              {discoveryMessage}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', lineHeight: '1.3' }}>Understanding Radiation Effects</h2>
      <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', textAlign: 'center', maxWidth: '500px', lineHeight: '1.5' }}>
        The physics of radiation damage explains why space electronics require such extreme engineering.
      </p>

      <div style={{ ...cardStyle(true), maxWidth: '600px', padding: '16px', marginBottom: '16px' }}>
        {renderVisualization()}
      </div>

      {/* Formula / equation */}
      <div style={{ ...cardStyle(true), maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fde047', marginBottom: '4px' }}>SEU Rate Formula</p>
        <p style={{ fontSize: '16px', color: '#e2e8f0', fontFamily: 'monospace', lineHeight: '1.6' }}>
          SEU_rate = Flux_factor x Solar_multiplier x e^(-shielding/5) x Hardness_factor
        </p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
          The exponential shielding term shows why doubling shielding thickness does not double protection - it follows an exponential decay. F = F0 x e^(-d/L) where d is thickness and L is attenuation length.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '600px', width: '100%' }}>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#a855f7', marginBottom: '8px', lineHeight: '1.3' }}>Single Event Upset (SEU)</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            A particle strike flips one or more bits in memory. Non-destructive but can corrupt data or crash systems. This is the most common radiation effect in space, happening constantly in unshielded electronics.
          </p>
        </div>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', lineHeight: '1.3' }}>Total Ionizing Dose (TID)</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Accumulated radiation damage to transistor oxides. Gradual degradation over months/years. TID causes threshold voltage shifts and leakage current increases that eventually make chips fail permanently.
          </p>
        </div>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', lineHeight: '1.3' }}>Single Event Latchup (SEL)</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            A particle creates a parasitic thyristor, causing high current draw. Latchup can destroy the chip if power is not cut immediately because the current path becomes self-sustaining.
          </p>
        </div>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '8px', lineHeight: '1.3' }}>Rad-Hardening Techniques</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Special transistor designs (SOI), triple modular redundancy (TMR), error-correcting memory (ECC), and watchdog timers. These techniques add 100x to 1000x cost premium per chip.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginBottom: '16px', lineHeight: '1.3' }}>The Most Dangerous Place</h2>

      <div style={{ ...cardStyle(), maxWidth: '600px', padding: '16px', marginBottom: '16px' }}>
        {renderVisualization()}
      </div>

      <div style={{ ...cardStyle(true), maxWidth: '500px', marginBottom: '20px' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', textAlign: 'center', marginBottom: '8px', lineHeight: '1.5' }}>
          Satellites operate at many different altitudes. Some orbits are far more hazardous than others.
        </p>
        <p style={{ fontSize: '20px', color: '#c4b5fd', textAlign: 'center', fontWeight: 700 }}>
          Where is radiation the most intense around Earth?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '500px', marginBottom: '20px' }}>
        {[
          { id: 'surface', text: 'Right at Earth\'s surface - closest to the core' },
          { id: 'leo', text: 'Low Earth Orbit at 400 km - like the ISS' },
          { id: 'van_allen', text: 'The Van Allen belts at 1000-30000 km altitude' },
          { id: 'deep', text: 'Deep space, far from any planet' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '1.4',
              border: showTwistFeedback && option.id === 'van_allen'
                ? '2px solid #22c55e'
                : showTwistFeedback && twistPrediction === option.id
                  ? '2px solid #ef4444'
                  : '1px solid #334155',
              background: showTwistFeedback && option.id === 'van_allen'
                ? 'rgba(34,197,94,0.2)'
                : showTwistFeedback && twistPrediction === option.id
                  ? 'rgba(239,68,68,0.2)'
                  : twistPrediction === option.id
                    ? 'rgba(168,85,247,0.2)'
                    : '#111827',
              color: '#e2e8f0',
              cursor: showTwistFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{ ...cardStyle(true), maxWidth: '500px' }}>
          <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: twistPrediction === 'van_allen' ? '#22c55e' : '#a855f7' }}>
            {twistPrediction === 'van_allen' ? 'Correct!' : 'The Van Allen belts are the danger zone!'}
          </p>
          <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '14px' }}>
            Earth's magnetic field traps energetic particles in donut-shaped belts. Radiation there is 100-1000x higher than in LEO or GEO. Apollo astronauts had to pass through quickly!
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginBottom: '12px', lineHeight: '1.3' }}>Van Allen Belt Explorer</h2>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '900px',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ ...cardStyle(true), padding: '16px', marginBottom: '16px' }}>
            {renderVisualization()}
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ ...cardStyle(), width: '100%' }}>
            <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '12px', lineHeight: '1.5' }}>
              <strong style={{ color: '#a855f7' }}>Sweep through altitude</strong> to see how radiation changes. Notice the peaks at the inner and outer belts!
            </p>
            {renderSlider('Altitude', altitude, 200, 40000, 200, setAltitude, ' km')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', maxWidth: '600px', width: '100%', marginTop: '16px' }}>
        <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>LEO</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Below belts</div>
        </div>
        <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>Van Allen</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Danger zone</div>
        </div>
        <div style={{ ...cardStyle(), textAlign: 'center', padding: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>GEO</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Above belts</div>
        </div>
      </div>

      {discoveryMessage && (
        <div style={{ ...cardStyle(true), maxWidth: '600px', width: '100%', marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: '#fde047', lineHeight: '1.5', fontWeight: 600 }}>
            {discoveryMessage}
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginBottom: '16px', lineHeight: '1.3' }}>Navigating the Radiation Environment</h2>

      <div style={{ ...cardStyle(true), maxWidth: '600px', padding: '16px', marginBottom: '16px' }}>
        {renderVisualization()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', width: '100%' }}>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '8px', lineHeight: '1.3' }}>Safe Havens</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            LEO (400 km) is protected by Earth's magnetic field. GEO (36000 km) is above the outer belt. Most satellites operate in these zones where radiation is manageable with standard hardening.
          </p>
        </div>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', lineHeight: '1.3' }}>Danger Zones</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Inner belt (1500-5000 km) has trapped protons. Outer belt (13000-25000 km) has trapped electrons. GPS satellites at 20200 km need heavy shielding and rad-hard chips.
          </p>
        </div>
        <div style={cardStyle()}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', lineHeight: '1.3' }}>Apollo's Challenge</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Moon-bound astronauts passed through both belts. The trajectory was optimized to minimize time in the danger zone. Total dose was significant but not lethal thanks to mission planning.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[activeAppTab];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginBottom: '16px', lineHeight: '1.3' }}>Real-World Applications</h2>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeAppTab === index ? '2px solid ' + a.color : '1px solid #334155',
                background: activeAppTab === index ? `${a.color}22` : '#111827',
                color: activeAppTab === index ? a.color : '#94a3b8',
                fontWeight: activeAppTab === index ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {completedApps.has(index) ? '\u2713 ' : ''}{a.short}
            </button>
          ))}
        </div>

        {/* App detail card */}
        <div style={{ ...cardStyle(true), maxWidth: '600px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${app.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: app.color }}>{app.icon}</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', lineHeight: '1.3' }}>{app.title}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>{app.description}</p>

          <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: app.color, marginBottom: '8px' }}>Radiation Connection</h4>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>{app.connection}</p>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>How It Works</h4>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>{app.howItWorks}</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.3' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>Examples</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {app.examples.map((ex, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: '6px', background: '#1e293b', fontSize: '11px', color: '#cbd5e1' }}>{ex}</span>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>Key Organizations</h4>
            <p style={{ fontSize: '12px', color: '#cbd5e1' }}>{app.companies.join(', ')}</p>
          </div>

          {!completedApps.has(activeAppTab) && (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Mark as Understood
            </button>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>Completed: {completedApps.size} / {realWorldApps.length}</p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          {activeAppTab < realWorldApps.length - 1 && (
            <button
              onClick={() => setActiveAppTab(activeAppTab + 1)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Next Application
            </button>
          )}
          <button
            onClick={() => goToPhase('test')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #a855f7)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 12px rgba(239,68,68,0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Take the Test
          </button>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[currentTestQuestion];
    const allAnswered = testAnswers.every(a => a !== -1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '12px', lineHeight: '1.3' }}>Knowledge Test</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', textAlign: 'center', maxWidth: '500px', lineHeight: '1.5', fontWeight: 400 }}>
          Test your understanding of radiation effects on electronics. These questions cover Single Event Upsets, Total Ionizing Dose, Van Allen belts, shielding strategies, and radiation hardening techniques used in spacecraft and satellite design. Answer all questions to see your score.
        </p>

        {!showTestResults ? (
          <>
            {/* Question counter */}
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: testAnswers[i] !== -1 ? '#22c55e' : i === currentTestQuestion ? '#ef4444' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            {/* Question card */}
            <div style={{ ...cardStyle(true), maxWidth: '600px', width: '100%' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px', lineHeight: '1.4' }}>
                {currentTestQuestion + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options.map((option, oIndex) => {
                  const isSelected = testAnswers[currentTestQuestion] === oIndex;
                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        lineHeight: '1.4',
                        border: isSelected ? '2px solid #a855f7' : '1px solid #334155',
                        background: isSelected ? 'rgba(168,85,247,0.2)' : '#0f172a',
                        color: isSelected ? '#c4b5fd' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        WebkitTapHighlightColor: 'transparent',
                        boxShadow: isSelected ? '0 0 0 1px rgba(168,85,247,0.5)' : 'none',
                      }}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation between questions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              {currentTestQuestion > 0 && (
                <button
                  onClick={() => setCurrentTestQuestion(currentTestQuestion - 1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Previous
                </button>
              )}
              {currentTestQuestion < testQuestions.length - 1 && (
                <button
                  onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Next Question
                </button>
              )}
              {allAnswered && (
                <button
                  onClick={() => {
                    setShowTestResults(true);
                    playSound('complete');
                    onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 12px rgba(34,197,94,0.3)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Submit Answers
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Results */}
            <div style={{ fontSize: '48px', fontWeight: 800, color: calculateTestScore() >= 7 ? '#22c55e' : '#f59e0b', marginBottom: '8px' }}>
              {calculateTestScore()} / {testQuestions.length}
            </div>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '20px' }}>
              Score: {calculateTestScore() >= 7 ? 'Excellent! You have mastered radiation effects.' : 'Good effort! Review the material and try again.'}
            </p>

            {/* Answer review */}
            <div style={{ maxWidth: '600px', width: '100%', maxHeight: '50vh', overflowY: 'auto' as const }}>
              {testQuestions.map((tq, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== -1 && tq.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ ...cardStyle(), marginBottom: '8px', borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                      {isCorrect ? '\u2713' : '\u2717'} {qIndex + 1}. {tq.question}
                    </p>
                    <p style={{ fontSize: '12px', color: isCorrect ? '#86efac' : '#fca5a5' }}>
                      {userAnswer !== -1 ? tq.options[userAnswer].text : 'No answer'}
                      {!isCorrect && ` (Correct: ${tq.options.find(o => o.correct)?.text})`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Play Again
              </button>
              {calculateTestScore() >= 7 && (
                <button
                  onClick={() => goToPhase('mastery')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Claim Mastery Badge
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>&#127942;</div>
      <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', lineHeight: '1.2', background: 'linear-gradient(135deg, #ef4444, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        Radiation Effects Master!
      </h2>
      <div style={{ ...cardStyle(true), maxWidth: '500px' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '20px', lineHeight: '1.6' }}>
          You understand why space electronics must be specially hardened!
        </p>
        <div style={{ textAlign: 'left' }}>
          {[
            'SEU, TID, and Latchup mechanisms',
            'Van Allen belts trap dangerous particles',
            'Shielding and rad-hardening protect electronics',
            'Different orbits have different radiation levels'
          ].map((item, i) => (
            <p key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', fontSize: '14px', color: '#cbd5e1' }}>
              <span style={{ color: '#22c55e', fontSize: '18px', fontWeight: 700 }}>{'\u2713'}</span>
              {item}
            </p>
          ))}
        </div>
      </div>
      <button
        onClick={() => goToPhase('hook')}
        style={{
          marginTop: '24px',
          padding: '12px 24px',
          borderRadius: '10px',
          border: '1px solid #334155',
          background: '#1e293b',
          color: '#e2e8f0',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Start Over
      </button>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Radiation Effects"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {renderNavigationBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingBottom: '16px',
      }}>
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default RadiationEffectsRenderer;
