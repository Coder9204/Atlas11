'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// DIFFUSION VS CONVECTION RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches the difference between diffusion (random molecular motion) and
// convection (bulk fluid flow driven by temperature gradients)
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
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

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#a855f7',
    primaryDark: '#9333ea',
    secondary: '#ec4899',
    accent: '#06b6d4',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    cold: '#3b82f6',
    hot: '#ef4444',
    warm: '#f97316',
    dye: '#d946ef',
    background: {
      primary: '#0c0a09',
      secondary: '#1c1917',
      tertiary: '#292524',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#e2e8f0',
      muted: '#cbd5e1',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      secondary: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
      warm: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
      cool: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      heat: 'linear-gradient(180deg, #3b82f6 0%, #ef4444 100%)',
    },
  },
  typography: {
    fontFamily: theme.fontFamily,
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

interface DyeParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface ConvectionParticle {
  id: number;
  x: number;
  y: number;
  temp: number;
}

interface DiffusionConvectionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function DiffusionConvectionRenderer({ onGameEvent, gamePhase, onPhaseComplete }: DiffusionConvectionRendererProps) {
  const lastClickRef = useRef(0);

  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const { isMobile } = useViewport();
// Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Diffusion simulation
  const [dyeParticles, setDyeParticles] = useState<DyeParticle[]>([]);
  const [dyeDropped, setDyeDropped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waterTemp, setWaterTemp] = useState<'cold' | 'room' | 'hot'>('room');
  const [simSpeed, setSimSpeed] = useState(50);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Convection currents
  const [convectionParticles, setConvectionParticles] = useState<ConvectionParticle[]>([]);
  const [heatSource, setHeatSource] = useState<'bottom' | 'side' | 'none'>('bottom');
  const [showCurrents, setShowCurrents] = useState(true);
  const convectionRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "You place a drop of food coloring in a glass of perfectly still room-temperature water and watch it slowly spread without stirring.",
      question: "What physical process is causing the food coloring to spread?",
      options: [
        { id: 'a', label: "Convection currents in the water" },
        { id: 'b', label: "Diffusion - random molecular motion spreading molecules from high to low concentration", correct: true },
        { id: 'c', label: "Gravity pulling the dye downward" },
        { id: 'd', label: "Chemical reactions between dye and water" }
      ],
      explanation: "In still, uniform-temperature water, diffusion is the primary mechanism. Molecules are in constant random motion (Brownian motion), and over time this causes them to spread from areas of high concentration to low concentration until evenly distributed."
    },
    {
      scenario: "A chef notices that when they add cream to hot coffee, it mixes almost instantly, but when added to iced coffee, the cream forms visible swirls for much longer.",
      question: "Why does the cream mix faster in hot coffee?",
      options: [
        { id: 'a', label: "Hot liquids are less viscous and allow faster movement" },
        { id: 'b', label: "Temperature gradients create convection currents that rapidly transport and mix the cream", correct: true },
        { id: 'c', label: "Hot coffee chemically reacts with cream" },
        { id: 'd', label: "Steam from the hot coffee pushes the cream around" }
      ],
      explanation: "In hot coffee, temperature differences between the cream and coffee create convection currents - bulk fluid movements that rapidly transport and mix materials. This is much faster than diffusion alone, which dominates in the cold coffee with minimal temperature gradients."
    },
    {
      scenario: "A lava lamp sits on a desk, with colorful blobs constantly rising from the bottom, reaching the top, then sinking back down.",
      question: "What drives the continuous rising and sinking motion in the lava lamp?",
      options: [
        { id: 'a', label: "Magnets hidden in the base alternating polarity" },
        { id: 'b', label: "The light bulb heats the wax, making it less dense so it rises; it cools at the top and sinks", correct: true },
        { id: 'c', label: "Air bubbles forming and popping in the wax" },
        { id: 'd', label: "Electric currents flowing through the liquid" }
      ],
      explanation: "This is convection in action. The heat source at the bottom warms the wax, causing it to expand and become less dense than the surrounding liquid. Buoyancy forces push it upward. At the top, away from the heat, it cools, contracts, becomes denser, and sinks - creating the mesmerizing cycle."
    },
    {
      scenario: "A biologist is studying how oxygen reaches cells deep inside the human body after entering through the lungs.",
      question: "How does oxygen primarily travel from the lungs to distant tissues?",
      options: [
        { id: 'a', label: "Purely by diffusion through body tissues" },
        { id: 'b', label: "Convection via blood circulation carries it most of the way, then diffusion moves it into cells", correct: true },
        { id: 'c', label: "Nerve signals direct oxygen to where it's needed" },
        { id: 'd', label: "Lymphatic system transport" }
      ],
      explanation: "Both processes work together. Blood circulation (convection) rapidly transports oxygen throughout the body. At the capillary level, oxygen then diffuses from the blood (high concentration) into the cells (low concentration). This combination is far more efficient than diffusion alone."
    },
    {
      scenario: "Perfume is sprayed in one corner of a completely still, air-conditioned room with uniform temperature. After several minutes, people across the room can smell it.",
      question: "What is the primary mechanism spreading the perfume scent in this scenario?",
      options: [
        { id: 'a', label: "Air currents from the AC system" },
        { id: 'b', label: "Diffusion - random molecular motion carrying scent molecules through the air", correct: true },
        { id: 'c', label: "Perfume molecules are attracted to human noses" },
        { id: 'd', label: "Convection from body heat of people in the room" }
      ],
      explanation: "In a still room with uniform temperature, there are no significant air currents to drive convection. The scent spreads through diffusion - perfume molecules randomly collide with air molecules and gradually spread from high concentration (near the spray) to low concentration (across the room). This is relatively slow."
    },
    {
      scenario: "An oceanographer is studying how the Gulf Stream moves warm water from the Gulf of Mexico toward Europe, moderating the climate there.",
      question: "What type of heat transfer mechanism best describes ocean currents like the Gulf Stream?",
      options: [
        { id: 'a', label: "Radiation - heat energy traveling as electromagnetic waves" },
        { id: 'b', label: "Convection - bulk fluid movement transporting thermal energy", correct: true },
        { id: 'c', label: "Conduction - heat transfer through direct molecular contact" },
        { id: 'd', label: "Diffusion - random spreading of heat molecules" }
      ],
      explanation: "Ocean currents are large-scale convection. Warm water (which is less dense) moves in bulk, transporting enormous amounts of thermal energy across vast distances. This is far more efficient than molecular diffusion for moving heat over such scales."
    },
    {
      scenario: "A researcher is comparing how quickly a drop of ink spreads in cold water (5C) versus hot water (80C), with both containers kept completely still.",
      question: "Even without convection, why does the ink spread faster in the hot water?",
      options: [
        { id: 'a', label: "Hot water has less surface tension" },
        { id: 'b', label: "Higher temperature means faster molecular motion, increasing the rate of diffusion", correct: true },
        { id: 'c', label: "Ink is more soluble in hot water" },
        { id: 'd', label: "Hot water has more dissolved gases that help spread the ink" }
      ],
      explanation: "Temperature directly affects molecular kinetic energy. In hotter water, molecules move faster and collide more frequently, causing the ink molecules to spread more rapidly through random motion. This is why diffusion rate increases with temperature."
    },
    {
      scenario: "In a traditional hot air balloon, a burner heats the air inside the envelope, causing the balloon to rise.",
      question: "What physical principle allows the hot air balloon to rise?",
      options: [
        { id: 'a', label: "The fire pushes the balloon upward" },
        { id: 'b', label: "Heated air expands and becomes less dense than surrounding cool air, creating buoyancy", correct: true },
        { id: 'c', label: "Hot air molecules are lighter than cold air molecules" },
        { id: 'd', label: "The envelope fabric repels cold air" }
      ],
      explanation: "This is the same principle that drives convection. When air is heated, molecules move faster and spread apart, decreasing the air's density. The less dense hot air inside the balloon is buoyed upward by the denser cool air surrounding it, just like warm water rising in a pot."
    },
    {
      scenario: "A pharmaceutical company needs to design a drug patch that releases medication slowly through the skin over 24 hours.",
      question: "What transport mechanism does the drug patch primarily rely on to deliver medication through skin?",
      options: [
        { id: 'a', label: "Convection through blood vessels in the patch" },
        { id: 'b', label: "Diffusion - drug molecules move from high concentration in the patch to lower concentration in the body", correct: true },
        { id: 'c', label: "Osmosis pulling water and drugs through the skin" },
        { id: 'd', label: "Active transport requiring ATP energy" }
      ],
      explanation: "Transdermal patches rely on diffusion. The drug is at high concentration in the patch and moves through the skin toward lower concentration in the body. The patch design controls the diffusion rate to achieve steady, extended drug delivery over time."
    },
    {
      scenario: "Atmospheric scientists observe that the Earth's mantle, despite being mostly solid, flows very slowly over millions of years, driving plate tectonics.",
      question: "What type of flow describes the slow movement of Earth's mantle material?",
      options: [
        { id: 'a', label: "Diffusion of rock molecules through the solid mantle" },
        { id: 'b', label: "Convection - hot material rises, cools, and sinks in vast circulation patterns", correct: true },
        { id: 'c', label: "Magnetic field forces moving iron-rich rock" },
        { id: 'd', label: "Tidal forces from the moon stirring the mantle" }
      ],
      explanation: "The mantle undergoes extremely slow convection over geological timescales. Hot material from near the core rises, spreads as it cools, then sinks back down. This convection is believed to be a major driver of plate tectonics, causing continents to move over millions of years."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Real-world applications for transfer phase
  const realWorldApps = [
    {
      icon: '💊',
      title: 'Drug Delivery Systems',
      short: 'Controlled pharmaceutical release',
      tagline: 'Medicine That Knows When and Where to Act',
      description: 'Pharmaceutical companies engineer drug delivery systems that use diffusion and convection principles to release medications at precise rates. From time-release capsules to transdermal patches, understanding how molecules move through tissues is essential for effective treatment.',
      connection: 'Just like dye spreading through water, drug molecules diffuse from high concentration areas (the pill or patch) to low concentration areas (your bloodstream). Temperature and blood flow (convection) dramatically affect absorption rates.',
      howItWorks: 'Drug delivery systems use polymer matrices with carefully designed pore sizes to control diffusion rates. Some advanced systems respond to body temperature or pH, using convection-like mechanisms to trigger drug release exactly where needed.',
      stats: [
        { value: '$300B+', label: 'Global drug delivery market', icon: '📊' },
        { value: '12-24 hrs', label: 'Extended release duration', icon: '⏱️' },
        { value: '70%', label: 'Better patient compliance', icon: '✓' }
      ],
      examples: [
        'Nicotine patches release medication through skin diffusion over 24 hours',
        'Insulin pumps deliver precise doses using controlled convective flow',
        'Chemotherapy nanoparticles target tumors using enhanced permeation effects',
        'Time-release pain medications use polymer diffusion barriers'
      ],
      companies: ['Johnson & Johnson', 'Pfizer', 'Novartis', 'AbbVie', 'Merck'],
      futureImpact: 'Smart drug delivery systems will use real-time body monitoring to adjust medication release, potentially eliminating overdoses and improving treatment outcomes for millions of patients.',
      color: premiumDesign.colors.primary
    },
    {
      icon: '💻',
      title: 'Semiconductor Doping',
      short: 'Atomic-level chip fabrication',
      tagline: 'The Foundation of Every Computer Chip',
      description: 'Every smartphone, computer, and electronic device relies on semiconductor doping - a process where dopant atoms diffuse into silicon wafers at high temperatures. This precise diffusion creates the electrical properties that make transistors work.',
      connection: 'Dopant atoms spread through silicon crystals via thermal diffusion, exactly like dye in hot water. Higher temperatures dramatically increase diffusion rates, allowing engineers to control penetration depth by adjusting time and temperature.',
      howItWorks: 'Silicon wafers are heated to 900-1200°C and exposed to dopant gases (phosphorus for N-type, boron for P-type). Atoms diffuse into the crystal lattice, creating regions with different electrical properties that form transistors.',
      stats: [
        { value: '3nm', label: 'Smallest chip features', icon: '🔬' },
        { value: '$580B', label: 'Semiconductor market 2024', icon: '📈' },
        { value: '100B+', label: 'Transistors per chip', icon: '⚡' }
      ],
      examples: [
        'Apple M-series chips use precise boron diffusion for billions of transistors',
        'Solar cells rely on phosphorus diffusion to create photovoltaic junctions',
        'LED manufacturing uses gallium and indium diffusion for light emission',
        'Quantum computer qubits require ultra-precise single-atom doping'
      ],
      companies: ['TSMC', 'Intel', 'Samsung', 'ASML'],
      futureImpact: 'As chips approach atomic limits, new diffusion techniques will enable 3D chip architectures and quantum computing, continuing the exponential growth of computing power.',
      color: premiumDesign.colors.accent
    },
    {
      icon: '🌍',
      title: 'Air Quality and Pollution Dispersion',
      short: 'Atmospheric transport modeling',
      tagline: 'Predicting Where Pollution Goes',
      description: 'Environmental scientists use diffusion-convection equations to predict how pollutants spread through the atmosphere. This knowledge is critical for air quality forecasting, emergency response to chemical spills, and urban planning.',
      connection: 'Smoke from a factory chimney demonstrates both processes: molecular diffusion spreads particles in all directions, while atmospheric convection (wind and thermal currents) carries pollution across cities and continents.',
      howItWorks: 'Computer models solve advection-diffusion equations that combine random molecular spreading (diffusion) with bulk air movement (convection). Temperature inversions can trap pollutants by suppressing vertical convection.',
      stats: [
        { value: '7M', label: 'Deaths from air pollution yearly', icon: '⚠️' },
        { value: '99%', label: 'World breathes polluted air', icon: '🌐' },
        { value: '72 hrs', label: 'Forecast accuracy window', icon: '📅' }
      ],
      examples: [
        'Wildfire smoke tracking predicts hazardous air quality days in advance',
        'Nuclear accident modeling (like Fukushima) uses diffusion-convection equations',
        'City planners use pollution dispersion models to locate industrial zones',
        'Real-time air quality apps predict ozone and particulate levels'
      ],
      companies: ['EPA', 'NOAA', 'European Environment Agency', 'IQAir', 'BreezoMeter'],
      futureImpact: 'AI-enhanced pollution models will enable personalized air quality warnings and help cities design smarter ventilation corridors, potentially saving millions of lives annually.',
      color: premiumDesign.colors.success
    },
    {
      icon: '🔥',
      title: 'Heat Exchangers',
      short: 'Industrial thermal engineering',
      tagline: 'Moving Heat Where It Needs to Go',
      description: 'Heat exchangers are everywhere - in your car radiator, refrigerator, power plants, and HVAC systems. They use convection to efficiently transfer thermal energy between fluids without mixing them, making modern life possible.',
      connection: 'Your experiment showed how convection currents accelerate heat transport. Heat exchangers maximize this effect by forcing fluids through channels that enhance convective heat transfer, far faster than diffusion alone.',
      howItWorks: 'Two fluids flow through separate channels in close contact. Convection carries heat from the hot fluid to the channel walls, conduction transfers it through the wall, and convection carries it into the cold fluid. Counter-flow designs maximize efficiency.',
      stats: [
        { value: '$20B', label: 'Global market value', icon: '💰' },
        { value: '95%+', label: 'Heat recovery possible', icon: '♻️' },
        { value: '500°C+', label: 'Operating temperatures', icon: '🌡️' }
      ],
      examples: [
        'Car radiators use forced convection to cool engine coolant',
        'Nuclear power plants transfer reactor heat to steam generators',
        'Data center cooling systems prevent server overheating',
        'Geothermal heat pumps extract ground warmth for home heating'
      ],
      companies: ['Alfa Laval', 'Kelvion', 'Danfoss', 'Chart Industries', 'SPX Flow'],
      futureImpact: 'Advanced heat exchangers will capture waste heat from industrial processes and data centers, potentially recycling enough energy to power millions of homes and significantly reduce carbon emissions.',
      color: premiumDesign.colors.warning
    }
  ];

  // Mobile detection
// Typography responsive system
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

  // Sync with external phase
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Sound effect
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
    } catch { /* Audio not supported */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Safe state update helper
  const safeNavigate = useCallback((action: () => void) => {
    action();
  }, []);

  // Debounced navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    // Reset state for play phases
    if (newPhase === 'play') {
      setDyeParticles([]);
      setDyeDropped(false);
      setElapsedTime(0);
    }
    if (newPhase === 'twist_play') {
      initConvectionParticles();
    }
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Initialize convection particles
  const initConvectionParticles = useCallback(() => {
    const particles: ConvectionParticle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: i,
        x: 30 + Math.random() * 240,
        y: 30 + Math.random() * 180,
        temp: 50,
      });
    }
    setConvectionParticles(particles);
  }, []);

  // Diffusion animation
  useEffect(() => {
    if (phase === 'play' && dyeDropped) {
      const tempMultiplier = waterTemp === 'cold' ? 0.3 : waterTemp === 'hot' ? 2.5 : 1;

      const animate = () => {
        setElapsedTime(t => t + 0.016);
        setDyeParticles(prev => prev.map(p => {
          // Random walk (diffusion)
          const randomVx = (Math.random() - 0.5) * 2 * tempMultiplier;
          const randomVy = (Math.random() - 0.5) * 2 * tempMultiplier;

          // Add convection if hot
          let convectionVy = 0;
          if (waterTemp === 'hot') {
            // Simple convection: particles near bottom go up, near top go down at sides
            const centerX = 150;
            const distFromCenter = Math.abs(p.x - centerX);
            if (p.y > 150) {
              convectionVy = -0.5; // Rise from bottom
            } else if (p.y < 80 && distFromCenter > 50) {
              convectionVy = 0.3; // Sink at sides
            }
          }

          let newX = p.x + p.vx * 0.5 + randomVx;
          let newY = p.y + p.vy * 0.5 + randomVy + convectionVy;
          let newVx = p.vx * 0.95 + randomVx * 0.1;
          let newVy = p.vy * 0.95 + randomVy * 0.1;

          // Boundary checks
          if (newX < 35) { newX = 35; newVx = Math.abs(newVx); }
          if (newX > 265) { newX = 265; newVx = -Math.abs(newVx); }
          if (newY < 35) { newY = 35; newVy = Math.abs(newVy); }
          if (newY > 215) { newY = 215; newVy = -Math.abs(newVy); }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy };
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, dyeDropped, waterTemp]);

  // Convection animation
  useEffect(() => {
    if (phase === 'twist_play') {
      const animate = () => {
        setConvectionParticles(prev => prev.map(p => {
          let newX = p.x;
          let newY = p.y;
          let newTemp = p.temp;

          if (heatSource === 'bottom') {
            // Heat from bottom
            if (p.y > 180) newTemp = Math.min(100, p.temp + 2);
            if (p.y < 50) newTemp = Math.max(20, p.temp - 1);

            // Convection current
            const centerX = 150;
            const buoyancy = (newTemp - 50) * 0.03;
            newY -= buoyancy;

            // Horizontal circulation
            if (p.y < 60) {
              newX += (p.x < centerX) ? -0.5 : 0.5;
            }
            if (p.y > 180) {
              newX += (p.x < centerX) ? 0.3 : -0.3;
            }
          } else if (heatSource === 'side') {
            // Heat from left side
            if (p.x < 50) newTemp = Math.min(100, p.temp + 2);
            if (p.x > 250) newTemp = Math.max(20, p.temp - 1);

            // Side-driven convection
            const buoyancy = (newTemp - 50) * 0.025;
            if (p.x < 100) newY -= buoyancy;
            if (p.x > 200) newY += buoyancy * 0.5;

            // Top/bottom circulation
            if (p.y < 50) newX += 0.4;
            if (p.y > 190) newX -= 0.3;
          } else {
            // No heat source - gradual equilibrium
            newTemp = newTemp + (50 - newTemp) * 0.01;
          }

          // Random motion (molecular)
          newX += (Math.random() - 0.5) * 0.8;
          newY += (Math.random() - 0.5) * 0.8;

          // Boundaries
          if (newX < 30) newX = 30;
          if (newX > 270) newX = 270;
          if (newY < 30) newY = 30;
          if (newY > 210) newY = 210;

          return { ...p, x: newX, y: newY, temp: newTemp };
        }));
        convectionRef.current = requestAnimationFrame(animate);
      };
      convectionRef.current = requestAnimationFrame(animate);

      return () => {
        if (convectionRef.current) cancelAnimationFrame(convectionRef.current);
      };
    }
  }, [phase, heatSource]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (convectionRef.current) cancelAnimationFrame(convectionRef.current);
    };
  }, []);

  // Drop dye
  const dropDye = useCallback(() => {
    const particles: DyeParticle[] = [];
    const centerX = 150;
    const centerY = 80;

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 15;
      particles.push({
        id: i,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: `hsl(${280 + Math.random() * 40}, 80%, ${50 + Math.random() * 20}%)`,
        size: 3 + Math.random() * 3,
      });
    }
    setDyeParticles(particles);
    setDyeDropped(true);
    setElapsedTime(0);
  }, []);

  // Get temperature color
  const getTempColor = (temp: number) => {
    if (temp < 40) return premiumDesign.colors.cold;
    if (temp > 70) return premiumDesign.colors.hot;
    return premiumDesign.colors.warm;
  };

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: `linear-gradient(135deg, ${premiumDesign.colors.success} 0%, #059669 100%)`,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.success),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={() => {
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
          <span>{phase.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.primary,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // ==================== PHASE RENDERERS ====================

  function renderHookPhase() {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        {/* Premium badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '9999px',
          marginBottom: '32px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#c084fc',
            borderRadius: '50%',
          }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#c084fc', letterSpacing: '0.05em' }}>
            PHYSICS EXPLORATION
          </span>
        </div>

        {/* Main title */}
        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          color: premiumDesign.colors.text.primary,
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          Diffusion vs Convection
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          maxWidth: '400px',
          marginBottom: '40px',
          lineHeight: 1.6,
        }}>
          Discover the two hidden forces that spread substances through fluids
        </p>

        {/* Premium card with content */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>&#x1F9EA;</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              lineHeight: 1.6,
            }}>
              Drop food coloring into a glass of water.
            </p>
            <p style={{
              fontSize: '18px',
              color: '#94a3b8',
              lineHeight: 1.6,
            }}>
              What happens? Does it matter if the water is hot or cold?
            </p>
            <p style={{
              fontSize: '16px',
              color: premiumDesign.colors.primary,
              fontWeight: 600,
              paddingTop: '8px',
            }}>
              Discover how molecules spread through liquids!
            </p>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={() => goToPhase('predict')}
          style={{
            marginTop: '40px',
            padding: '20px 40px',
            background: premiumDesign.colors.gradient.primary,
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 8px 24px ${premiumDesign.colors.primary}40`,
            transition: 'all 0.3s ease',
          }}
        >
          Explore Diffusion \u2192
        </button>

        {/* Feature hints */}
        <div style={{
          marginTop: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          fontSize: '14px',
          color: '#64748b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#c084fc' }}>\u2726</span>
            Interactive Lab
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#c084fc' }}>\u2726</span>
            Real-World Examples
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#c084fc' }}>\u2726</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'same', label: 'The dye will spread at the same rate in hot and cold water', icon: '=' },
      { id: 'faster_hot', label: 'The dye will spread FASTER in hot water', icon: '🔥' },
      { id: 'faster_cold', label: 'The dye will spread FASTER in cold water', icon: '❄️' },
      { id: 'no_spread', label: 'The dye won\'t spread at all - it will sink', icon: '⬇️' },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Make Your Prediction
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            What do you think will happen when we drop dye into water at different temperatures?
          </p>
        </div>

        {/* Static visualization for predict phase */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: '320px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diffusion Convection visualization">
            <defs>
              <linearGradient id="predictCold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="predictHot" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Cold water beaker */}
            <rect x="20" y="40" width="120" height="100" rx="4" fill="url(#predictCold)" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="80" cy="70" r="12" fill="#d946ef" opacity="0.8" />
            <text x="80" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Cold Water</text>
            <text x="80" y="25" textAnchor="middle" fill="#3b82f6" fontSize="11">5C</text>

            {/* Hot water beaker */}
            <rect x="180" y="40" width="120" height="100" rx="4" fill="url(#predictHot)" stroke="#ef4444" strokeWidth="2" />
            <circle cx="240" cy="70" r="12" fill="#d946ef" opacity="0.8" />
            <text x="240" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Hot Water</text>
            <text x="240" y="25" textAnchor="middle" fill="#ef4444" fontSize="11">80C</text>

            {/* Dye drops */}
            <ellipse cx="80" cy="50" rx="6" ry="8" fill="#d946ef" />
            <ellipse cx="240" cy="50" rx="6" ry="8" fill="#d946ef" />

            {/* Question marks */}
            <text x="80" y="105" textAnchor="middle" fill="#a855f7" fontSize="18" fontWeight="700">?</text>
            <text x="240" y="105" textAnchor="middle" fill="#a855f7" fontSize="18" fontWeight="700">?</text>
          </svg>
        </div>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === pred.id
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === pred.id
                  ? 'rgba(168, 85, 247, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                safeNavigate(() => setPrediction(pred.id));
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{
                  color: premiumDesign.colors.text.primary,
                  fontSize: '15px',
                }}>
                  {pred.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '\u2190 Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction \u2192',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    const spreadRadius = dyeParticles.length > 0
      ? Math.sqrt(dyeParticles.reduce((acc, p) => {
          const dx = p.x - 150;
          const dy = p.y - 125;
          return acc + dx * dx + dy * dy;
        }, 0) / dyeParticles.length)
      : 0;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🧪 Diffusion Experiment
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Drop dye into water and observe how it spreads
          </p>
          <p style={{ color: premiumDesign.colors.text.muted, fontSize: typo.small, marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            Diffusion is defined as the net movement of particles from a region of higher concentration to a region of lower concentration.
            This is important in real-world applications from drug delivery to industrial chemical processes used in everyday life.
          </p>
          <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: typo.small, marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            J = -D × (dC/dx) where D ∝ T
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.xl,
          flex: 1,
        }}>
          {/* Simulation */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <svg
              viewBox="0 0 300 250"
              width="100%"
              style={{
                maxWidth: '300px',
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
             preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Premium beaker glass gradient */}
                <linearGradient id="diffBeakerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                  <stop offset="25%" stopColor="#334155" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#475569" stopOpacity="0.15" />
                  <stop offset="75%" stopColor="#334155" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0.3" />
                </linearGradient>

                {/* Cold water gradient */}
                <linearGradient id="diffColdWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
                  <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3" />
                </linearGradient>

                {/* Hot water gradient */}
                <linearGradient id="diffHotWater" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.1" />
                </linearGradient>

                {/* Room temp water gradient */}
                <linearGradient id="diffRoomWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.05" />
                  <stop offset="50%" stopColor="#64748b" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
                </linearGradient>

                {/* Dye particle gradient */}
                <radialGradient id="diffDyeParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#f0abfc" stopOpacity="1" />
                  <stop offset="40%" stopColor="#d946ef" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#a855f7" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
                </radialGradient>

                {/* Dye drop gradient */}
                <radialGradient id="diffDyeDrop" cx="50%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#f5d0fe" stopOpacity="1" />
                  <stop offset="50%" stopColor="#e879f9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#c026d3" stopOpacity="0.8" />
                </radialGradient>

                {/* Particle glow filter */}
                <filter id="diffParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Soft inner glow for beaker */}
                <filter id="diffBeakerGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Drop shadow filter */}
                <filter id="diffDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Concentration gradient overlay */}
                <radialGradient id="diffConcentration" cx="50%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#d946ef" stopOpacity={dyeDropped ? 0.15 : 0} />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity={dyeDropped ? 0.08 : 0} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background layer */}
              <g id="background-layer">
                <rect width="300" height="250" fill="#0c0a09" />
                <pattern id="diffLabGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                  <rect width="15" height="15" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
                </pattern>
                <rect width="300" height="250" fill="url(#diffLabGrid)" />
              </g>

              {/* Container layer */}
              <g id="container-layer">
                {/* Beaker with premium glass effect */}
                <rect
                  x="30" y="30" width="240" height="190"
                  fill={waterTemp === 'cold' ? 'url(#diffColdWater)' : waterTemp === 'hot' ? 'url(#diffHotWater)' : 'url(#diffRoomWater)'}
                  stroke="url(#diffBeakerGlass)"
                  strokeWidth="3"
                  rx="8"
                />

                {/* Beaker highlight for glass effect */}
                <rect
                  x="32" y="32" width="8" height="186"
                  fill="rgba(255,255,255,0.08)"
                  rx="4"
                />
              </g>

              {/* Concentration gradient visualization when dye is dropped */}
              {dyeDropped && (
                <rect
                  x="30" y="30" width="240" height="190"
                  fill="url(#diffConcentration)"
                  rx="8"
                  style={{ transition: 'opacity 0.5s ease' }}
                />
              )}

              {/* Heat indicator waves for hot water */}
              {waterTemp === 'hot' && (
                <g opacity="0.4">
                  <path d="M60 210 Q75 200, 90 210 Q105 220, 120 210" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.6">
                    <animate attributeName="d" dur="2s" repeatCount="indefinite"
                      values="M60 210 Q75 200, 90 210 Q105 220, 120 210;M60 210 Q75 220, 90 210 Q105 200, 120 210;M60 210 Q75 200, 90 210 Q105 220, 120 210" />
                  </path>
                  <path d="M140 210 Q155 200, 170 210 Q185 220, 200 210" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.5">
                    <animate attributeName="d" dur="2.3s" repeatCount="indefinite"
                      values="M140 210 Q155 220, 170 210 Q185 200, 200 210;M140 210 Q155 200, 170 210 Q185 220, 200 210;M140 210 Q155 220, 170 210 Q185 200, 200 210" />
                  </path>
                  <path d="M180 210 Q195 200, 210 210 Q225 220, 240 210" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.4">
                    <animate attributeName="d" dur="1.8s" repeatCount="indefinite"
                      values="M180 210 Q195 200, 210 210 Q225 220, 240 210;M180 210 Q195 220, 210 210 Q225 200, 240 210;M180 210 Q195 200, 210 210 Q225 220, 240 210" />
                  </path>
                </g>
              )}

              {/* Cold indicator crystals for cold water */}
              {waterTemp === 'cold' && (
                <g opacity="0.5">
                  <polygon points="45,200 50,190 55,200" fill="#60a5fa" opacity="0.4" />
                  <polygon points="245,195 250,185 255,195" fill="#3b82f6" opacity="0.3" />
                  <polygon points="70,205 73,198 76,205" fill="#93c5fd" opacity="0.35" />
                </g>
              )}

              {/* Dye particles with gradient and glow */}
              {dyeParticles.map(p => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.size}
                  fill="url(#diffDyeParticle)"
                  filter="url(#diffParticleGlow)"
                  opacity={0.85}
                />
              ))}

              {/* Drop indicator with premium styling */}
              {!dyeDropped && (
                <g filter="url(#diffDropShadow)">
                  <ellipse cx="150" cy="20" rx="10" ry="12" fill="url(#diffDyeDrop)" />
                  <ellipse cx="147" cy="16" rx="3" ry="4" fill="rgba(255,255,255,0.4)" />
                  <path d="M150 32 L150 50" stroke="url(#diffDyeDrop)" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round" />
                  <circle cx="150" cy="56" r="3" fill="url(#diffDyeDrop)" opacity="0.5">
                    <animate attributeName="opacity" dur="1s" repeatCount="indefinite" values="0.5;0.8;0.5" />
                  </circle>
                </g>
              )}

              {/* Mixing effect swirls when hot */}
              {waterTemp === 'hot' && dyeDropped && elapsedTime > 0.5 && (
                <g opacity="0.2">
                  <path d="M100 120 Q130 100, 160 120 Q190 140, 200 110" stroke="#d946ef" strokeWidth="1" fill="none">
                    <animate attributeName="d" dur="3s" repeatCount="indefinite"
                      values="M100 120 Q130 100, 160 120 Q190 140, 200 110;M100 130 Q130 150, 160 130 Q190 110, 200 140;M100 120 Q130 100, 160 120 Q190 140, 200 110" />
                  </path>
                  <path d="M80 160 Q120 180, 150 150 Q180 120, 220 160" stroke="#a855f7" strokeWidth="1" fill="none">
                    <animate attributeName="d" dur="4s" repeatCount="indefinite"
                      values="M80 160 Q120 180, 150 150 Q180 120, 220 160;M80 140 Q120 120, 150 160 Q180 200, 220 140;M80 160 Q120 180, 150 150 Q180 120, 220 160" />
                  </path>
                </g>
              )}

              {/* Grid lines for visual reference */}
              <line x1="30" y1="70" x2="270" y2="70" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
              <line x1="30" y1="125" x2="270" y2="125" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
              <line x1="30" y1="180" x2="270" y2="180" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
              <line x1="100" y1="30" x2="100" y2="220" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
              <line x1="200" y1="30" x2="200" y2="220" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />

              {/* Educational labels */}
              <g id="labels-layer">
                <text x="150" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Diffusion Experiment</text>
                <text x="150" y="245" textAnchor="middle" fill="#cbd5e1" fontSize="11">Concentration</text>
                {!dyeDropped && <text x="60" y="50" textAnchor="middle" fill="#d946ef" fontSize="11">Dye Drop</text>}
                {dyeDropped && <text x="60" y="50" textAnchor="middle" fill="#a855f7" fontSize="11">Dye Particles</text>}
                {/* Speed indicator that updates with slider */}
                <text x="270" y="245" textAnchor="end" fill="#94a3b8" fontSize="11">Speed: {simSpeed}%</text>
              </g>
            </svg>

            {/* Temperature label outside SVG */}
            <div style={{
              textAlign: 'center',
              marginTop: '8px',
              fontSize: typo.small,
              color: waterTemp === 'cold' ? premiumDesign.colors.cold : waterTemp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.text.secondary,
              fontWeight: 500,
            }}>
              {waterTemp === 'cold' ? '❄️ Cold (5°C)' : waterTemp === 'hot' ? '🔥 Hot (80°C)' : '🌡️ Room Temp (20°C)'}
            </div>

            {/* Drop instruction outside SVG */}
            {!dyeDropped && (
              <div style={{
                textAlign: 'center',
                marginTop: '4px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.muted,
              }}>
                Click &quot;Drop Dye&quot; to start
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Water Temperature
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['cold', 'room', 'hot'] as const).map(temp => (
                  <button
                    key={temp}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: waterTemp === temp ? `2px solid ${temp === 'cold' ? premiumDesign.colors.cold : temp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.primary}` : '1px solid rgba(255,255,255,0.1)',
                      background: waterTemp === temp ? `${temp === 'cold' ? premiumDesign.colors.cold : temp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.primary}20` : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onClick={() => {
                      setWaterTemp(temp);
                      setDyeDropped(false);
                      setDyeParticles([]);
                      setElapsedTime(0);
                    }}
                  >
                    {temp === 'cold' ? '❄️ Cold' : temp === 'hot' ? '🔥 Hot' : '🌡️ Room'}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: dyeDropped ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: dyeDropped ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (!dyeDropped) dropDye();
              }}
            >
              {dyeDropped ? '💧 Dye Dropped' : '💧 Drop Dye'}
            </button>

            {dyeDropped && (
              <button
                style={{
                  padding: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setDyeDropped(false);
                  setDyeParticles([]);
                  setElapsedTime(0);
                }}
              >
                🔄 Reset
              </button>
            )}

            {/* Simulation Speed Slider */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: premiumDesign.colors.text.secondary, fontSize: '13px' }}>Speed</span>
                <span style={{ color: premiumDesign.colors.primary, fontSize: '13px', fontWeight: 600 }}>{simSpeed}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={simSpeed}
                onChange={(e) => setSimSpeed(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                  cursor: 'pointer',
                  background: premiumDesign.colors.background.tertiary,
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Spread Radius
              </div>
              <div style={{ color: premiumDesign.colors.dye, fontSize: '24px', fontWeight: 700 }}>
                {spreadRadius.toFixed(1)} px
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px' }}>
                Time: {elapsedTime.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '\u2190 Back', onClick: () => goToPhase('predict') },
          { text: 'See Results \u2192', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const wasCorrect = prediction === 'faster_hot';

    const reviewContent = [
      {
        title: "What You Observed",
        content: `In hot water, the dye spreads much faster than in cold water. ${wasCorrect ? "Your prediction was correct!" : "This might be surprising!"} But WHY does this happen? The temperature of the water has a dramatic effect on how quickly substances spread through it. This is one of the most important principles in heat transfer and fluid dynamics.\n\nKey relationship: Diffusion Rate ∝ Temperature (higher T = faster spreading)`,
        highlight: wasCorrect,
      },
      {
        title: "The Secret: Two Different Processes",
        content: "There are TWO ways substances spread through fluids:\n\nDIFFUSION: This is random molecular motion that happens everywhere. Molecules are always vibrating and bumping into each other, slowly spreading from areas of high concentration to low concentration.\n\nCONVECTION: This is bulk fluid movement driven by temperature differences. Hot fluid rises because it's less dense, while cold fluid sinks. This creates currents that can move substances much faster than diffusion alone.",
      },
      {
        title: "The Physics Formula",
        content: "Fick's Law describes diffusion mathematically:\n\nJ = -D × (dC/dx)\n\nWhere J = diffusion flux, D = diffusion coefficient, and dC/dx = concentration gradient.\n\nThe diffusion coefficient D is proportional to temperature: D ∝ T. This relationship shows why higher temperatures lead to faster diffusion - molecules have more kinetic energy!",
      },
      {
        title: "Why Hot Water Wins",
        content: "In cold water, you see mainly DIFFUSION - slow random molecular motion spreading the dye gradually. In hot water, temperature gradients create powerful CONVECTION CURRENTS that actively carry the dye throughout the liquid. The hot water near the dye rises quickly, pulling fresh water in from the sides, creating a continuous mixing cycle that spreads the dye dramatically faster than molecular motion alone!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Understanding the Results
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.primary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {reviewContent[reviewStep].content}
          </p>

          {reviewContent[reviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Great prediction! You correctly anticipated that hot water would spread the dye faster.
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.primary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => {
                  safeNavigate(() => setReviewStep(i));
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '\u2190 Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Explore Convection →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                safeNavigate(() => setReviewStep(r => r + 1));
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const predictions = [
      { id: 'bottom', label: 'Heating from the BOTTOM will create the strongest currents', icon: '\u2B06\uFE0F' },
      { id: 'side', label: 'Heating from the SIDE will create the strongest currents', icon: '\u27A1\uFE0F' },
      { id: 'same', label: 'Both will create equally strong currents', icon: '=' },
      { id: 'none', label: 'Neither will create currents - heat just spreads evenly', icon: '\u25CB' },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            The Twist: Heat Position
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Does it matter WHERE we apply heat? What creates the strongest convection currents?
          </p>
        </div>

        {/* Static visualization for twist predict phase */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: '320px' }} preserveAspectRatio="xMidYMid meet">
            {/* Bottom heat container */}
            <rect x="20" y="30" width="120" height="100" rx="4" fill="rgba(30,41,59,0.6)" stroke="#64748b" strokeWidth="2" />
            <rect x="20" y="115" width="120" height="15" rx="2" fill="#ef4444" opacity="0.8" />
            <text x="80" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="11">Bottom Heat</text>
            <text x="80" y="75" textAnchor="middle" fill="#cbd5e1" fontSize="14">?</text>

            {/* Side heat container */}
            <rect x="180" y="30" width="120" height="100" rx="4" fill="rgba(30,41,59,0.6)" stroke="#64748b" strokeWidth="2" />
            <rect x="180" y="30" width="15" height="100" rx="2" fill="#ef4444" opacity="0.8" />
            <text x="240" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="11">Side Heat</text>
            <text x="248" y="75" textAnchor="middle" fill="#cbd5e1" fontSize="14">?</text>

            {/* Heat source labels */}
            <text x="80" y="20" textAnchor="middle" fill="#f97316" fontSize="11">Heat Source</text>
            <text x="240" y="20" textAnchor="middle" fill="#f97316" fontSize="11">Heat Source</text>
          </svg>
        </div>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === pred.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === pred.id
                  ? 'rgba(236, 72, 153, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                safeNavigate(() => setTwistPrediction(pred.id));
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{ color: premiumDesign.colors.text.primary, fontSize: '15px' }}>
                  {pred.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test It →',
            onClick: goNext,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🌀 Convection Currents
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch how heat position affects fluid flow
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.xl,
          flex: 1,
        }}>
          {/* Simulation */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <svg
              viewBox="0 0 300 250"
              width="100%"
              style={{
                maxWidth: '300px',
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
             preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Container glass gradient */}
                <linearGradient id="diffConvContainerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0.4" />
                  <stop offset="25%" stopColor="#4b5563" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#6b7280" stopOpacity="0.25" />
                  <stop offset="75%" stopColor="#4b5563" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0.4" />
                </linearGradient>

                {/* Fluid background gradient */}
                <linearGradient id="diffConvFluid" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#1e293b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#334155" stopOpacity="0.5" />
                </linearGradient>

                {/* Heat source gradient - bottom */}
                <linearGradient id="diffHeatBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
                </linearGradient>

                {/* Heat source gradient - side */}
                <linearGradient id="diffHeatSide" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
                </linearGradient>

                {/* Cold particle gradient */}
                <radialGradient id="diffConvColdParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.5" />
                </radialGradient>

                {/* Warm particle gradient */}
                <radialGradient id="diffConvWarmParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
                  <stop offset="40%" stopColor="#fb923c" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.5" />
                </radialGradient>

                {/* Hot particle gradient */}
                <radialGradient id="diffConvHotParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
                  <stop offset="40%" stopColor="#f87171" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.5" />
                </radialGradient>

                {/* Arrow gradient for flow */}
                <linearGradient id="diffFlowArrow" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.8" />
                </linearGradient>

                {/* Particle glow filter */}
                <filter id="diffConvParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Heat source glow filter */}
                <filter id="diffHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker with gradient */}
                <marker id="diffConvArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
                  <path d="M0,0 L0,8 L12,4 z" fill="url(#diffFlowArrow)" opacity="0.8" />
                </marker>

                {/* Arrow marker for secondary flows */}
                <marker id="diffConvArrowSmall" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" opacity="0.5" />
                </marker>
              </defs>

              {/* Background with subtle pattern */}
              <rect width="300" height="250" fill="#0c0a09" />
              <pattern id="diffConvLabGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                <rect width="15" height="15" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
              </pattern>
              <rect width="300" height="250" fill="url(#diffConvLabGrid)" />

              {/* Container with premium glass effect */}
              <rect
                x="25" y="25" width="250" height="200"
                fill="url(#diffConvFluid)"
                stroke="url(#diffConvContainerGlass)"
                strokeWidth="3"
                rx="8"
              />

              {/* Glass highlight */}
              <rect
                x="27" y="27" width="6" height="196"
                fill="rgba(255,255,255,0.06)"
                rx="3"
              />

              {/* Heat source indicator - bottom */}
              {heatSource === 'bottom' && (
                <g filter="url(#diffHeatGlow)">
                  <rect x="25" y="220" width="250" height="10" fill="url(#diffHeatBottom)" rx="3" />
                  {/* Animated heat waves */}
                  <g opacity="0.6">
                    <path d="M50 218 Q65 210, 80 218" stroke="#fbbf24" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.5s" repeatCount="indefinite"
                        values="M50 218 Q65 210, 80 218;M50 215 Q65 207, 80 215;M50 218 Q65 210, 80 218" />
                    </path>
                    <path d="M130 218 Q145 210, 160 218" stroke="#f97316" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.8s" repeatCount="indefinite"
                        values="M130 218 Q145 208, 160 218;M130 213 Q145 203, 160 213;M130 218 Q145 208, 160 218" />
                    </path>
                    <path d="M200 218 Q215 210, 230 218" stroke="#fbbf24" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.3s" repeatCount="indefinite"
                        values="M200 218 Q215 210, 230 218;M200 214 Q215 206, 230 214;M200 218 Q215 210, 230 218" />
                    </path>
                  </g>
                </g>
              )}

              {/* Heat source indicator - side */}
              {heatSource === 'side' && (
                <g filter="url(#diffHeatGlow)">
                  <rect x="15" y="25" width="10" height="200" fill="url(#diffHeatSide)" rx="3" />
                  {/* Animated heat waves */}
                  <g opacity="0.6">
                    <path d="M27 50 Q35 65, 27 80" stroke="#fbbf24" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.5s" repeatCount="indefinite"
                        values="M27 50 Q35 65, 27 80;M30 50 Q38 65, 30 80;M27 50 Q35 65, 27 80" />
                    </path>
                    <path d="M27 120 Q35 135, 27 150" stroke="#f97316" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.8s" repeatCount="indefinite"
                        values="M27 120 Q33 135, 27 150;M30 120 Q36 135, 30 150;M27 120 Q33 135, 27 150" />
                    </path>
                    <path d="M27 180 Q35 195, 27 210" stroke="#fbbf24" strokeWidth="1.5" fill="none">
                      <animate attributeName="d" dur="1.3s" repeatCount="indefinite"
                        values="M27 180 Q35 195, 27 210;M30 180 Q38 195, 30 210;M27 180 Q35 195, 27 210" />
                    </path>
                  </g>
                </g>
              )}

              {/* Convection particles with temperature-based gradients */}
              {convectionParticles.map(p => {
                const particleGradient = p.temp < 40 ? 'url(#diffConvColdParticle)'
                  : p.temp > 70 ? 'url(#diffConvHotParticle)'
                  : 'url(#diffConvWarmParticle)';
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={particleGradient}
                    filter="url(#diffConvParticleGlow)"
                    opacity={0.8}
                  />
                );
              })}

              {/* Convection flow arrows - bottom heating */}
              {showCurrents && heatSource === 'bottom' && (
                <g>
                  {/* Main upward current */}
                  <path d="M150 195 L150 55" stroke="url(#diffFlowArrow)" strokeWidth="3" fill="none"
                    markerEnd="url(#diffConvArrow)" opacity="0.7" />
                  {/* Side currents going down */}
                  <path d="M70 55 C70 90, 70 130, 75 170" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6,4"
                    fill="none" markerEnd="url(#diffConvArrowSmall)" opacity="0.4" />
                  <path d="M230 55 C230 90, 230 130, 225 170" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6,4"
                    fill="none" markerEnd="url(#diffConvArrowSmall)" opacity="0.4" />
                  {/* Top horizontal spread */}
                  <path d="M155 50 Q190 45, 220 55" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4,3"
                    fill="none" opacity="0.35" />
                  <path d="M145 50 Q110 45, 80 55" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4,3"
                    fill="none" opacity="0.35" />
                  {/* Bottom convergence */}
                  <path d="M80 190 Q115 200, 145 195" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4,3"
                    fill="none" opacity="0.35" />
                  <path d="M220 190 Q185 200, 155 195" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4,3"
                    fill="none" opacity="0.35" />
                </g>
              )}

              {/* Convection flow arrows - side heating */}
              {showCurrents && heatSource === 'side' && (
                <g>
                  {/* Rising current on heated side */}
                  <path d="M50 190 L50 50" stroke="url(#diffFlowArrow)" strokeWidth="3" fill="none"
                    markerEnd="url(#diffConvArrow)" opacity="0.7" />
                  {/* Top horizontal flow */}
                  <path d="M55 50 Q150 40, 250 55" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6,4"
                    fill="none" markerEnd="url(#diffConvArrowSmall)" opacity="0.4" />
                  {/* Descending current on cold side */}
                  <path d="M250 60 L250 185" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6,4"
                    fill="none" markerEnd="url(#diffConvArrowSmall)" opacity="0.4" />
                  {/* Bottom return flow */}
                  <path d="M245 190 Q150 200, 55 190" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4,3"
                    fill="none" opacity="0.35" />
                </g>
              )}

              {/* Educational labels in SVG */}
              <text x="150" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Convection Currents</text>
              <text x="150" y="240" textAnchor="middle" fill="#cbd5e1" fontSize="11">Water Container</text>
              {heatSource !== 'none' && <text x="150" y="120" textAnchor="middle" fill="#f97316" fontSize="11">Heat rises, cold sinks</text>}
            </svg>

            {/* Legend outside SVG using typo system */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginTop: '8px',
              fontSize: typo.label,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)' }} />
                <span style={{ color: premiumDesign.colors.text.muted }}>Cold</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #fdba74 0%, #f97316 100%)' }} />
                <span style={{ color: premiumDesign.colors.text.muted }}>Warm</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)' }} />
                <span style={{ color: premiumDesign.colors.text.muted }}>Hot</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Heat Source Position
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['bottom', 'side', 'none'] as const).map(pos => (
                  <button
                    key={pos}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: heatSource === pos ? `2px solid ${premiumDesign.colors.hot}` : '1px solid rgba(255,255,255,0.1)',
                      background: heatSource === pos ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onClick={() => {
                      setHeatSource(pos);
                    }}
                  >
                    {pos === 'bottom' ? '⬆️ Bottom' : pos === 'side' ? '➡️ Side' : '○ None'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showCurrents}
                  onChange={(e) => setShowCurrents(e.target.checked)}
                  style={{ accentColor: premiumDesign.colors.primary }}
                />
                Show current arrows
              </label>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Watch how {heatSource === 'bottom'
                  ? 'hot fluid rises from the bottom, creating a strong vertical current'
                  : heatSource === 'side'
                  ? 'heat from the side creates a diagonal circulation pattern'
                  : 'without heat, particles move randomly (diffusion only)'}
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '\u2190 Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Understand Results \u2192', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const wasCorrect = twistPrediction === 'bottom';

    const twistReviewContent = [
      {
        title: "Bottom Heating Creates Strongest Currents",
        content: `${wasCorrect ? "You predicted correctly! " : ""}Heating from the BOTTOM creates the most efficient convection because:\n\n• Hot fluid naturally rises (lower density)\n• Creates a continuous cycle: rise → cool at top → sink → reheat\n• This is why we cook with heat from below!`,
        highlight: wasCorrect,
      },
      {
        title: "Side Heating: Weaker Currents",
        content: "Side heating still creates convection, but it's less efficient:\n\n• Only heats one side of the fluid\n• Creates diagonal, less organized flow\n• The top of the container tends to stay warmer than the bottom",
      },
      {
        title: "The Key Insight",
        content: "Convection is most efficient when heat can naturally drive the cycle:\n\n• Heat goes UP (hot rises)\n• Cool comes DOWN (cold sinks)\n• This is why radiators are placed low and air conditioners high!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Heat Position Analysis
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Excellent prediction! You understood that bottom heating creates the strongest convection.
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => {
                  safeNavigate(() => setTwistReviewStep(i));
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '\u2190 Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                safeNavigate(() => setTwistReviewStep(t => t + 1));
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const currentApp = realWorldApps[activeApp];
    const isCurrentCompleted = completedApps.has(activeApp);
    const allCompleted = completedApps.size === realWorldApps.length;

    const handleCompleteApp = () => {
      const newCompleted = new Set(completedApps);
      newCompleted.add(activeApp);
      setCompletedApps(newCompleted);
      playSound('success');
      emitEvent('app_explored', { appNumber: activeApp + 1, appTitle: currentApp.title });

      // Auto-advance to next app
      if (activeApp < realWorldApps.length - 1) {
        setTimeout(() => setActiveApp(activeApp + 1), 500);
      }
    };

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: premiumDesign.spacing.lg,
          padding: `0 ${premiumDesign.spacing.md}px`,
        }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: premiumDesign.colors.success,
            marginBottom: premiumDesign.spacing.xs,
          }}>
            Step 8 - Real World Applications
          </p>
          <p style={{
            fontSize: '12px',
            color: premiumDesign.colors.text.muted,
          }}>
            {completedApps.size}/{realWorldApps.length} completed - {allCompleted ? 'Ready for test!' : 'Complete all to proceed'}
          </p>
        </div>

        {/* App tabs */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: `0 ${premiumDesign.spacing.md}px`,
        }}>
          {realWorldApps.map((app, i) => {
            const isCompleted = completedApps.has(i);
            const isCurrent = activeApp === i;
            const isLocked = i > 0 && !completedApps.has(i - 1) && !isCompleted;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!isLocked) {
                    safeNavigate(() => setActiveApp(i));
                    playSound('click');
                  }
                }}
                disabled={isLocked}
                style={{
                  padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                  borderRadius: premiumDesign.radius.md,
                  border: isCurrent ? `2px solid ${app.color}` : `1px solid rgba(255,255,255,0.1)`,
                  backgroundColor: isCurrent ? `${app.color}20` : isCompleted ? 'rgba(16, 185, 129, 0.15)' : premiumDesign.colors.background.tertiary,
                  color: isLocked ? premiumDesign.colors.text.muted : premiumDesign.colors.text.primary,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease',
                }}
              >
                <span>{app.icon}</span>
                <span>{isMobile ? '' : app.short}</span>
                {isCompleted && <span style={{ color: premiumDesign.colors.success }}>&#10003;</span>}
                {isLocked && <span>&#128274;</span>}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: `0 ${premiumDesign.spacing.md}px` }}>
            {/* App header */}
            <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
              <span style={{ fontSize: '56px' }}>{currentApp.icon}</span>
              <h2 style={{
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: 800,
                color: premiumDesign.colors.text.primary,
                marginTop: premiumDesign.spacing.sm,
              }}>
                {currentApp.title}
              </h2>
              <p style={{ color: currentApp.color, fontSize: '16px', fontWeight: 600 }}>
                {currentApp.tagline}
              </p>
            </div>

            {/* Description */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
              borderLeft: `4px solid ${currentApp.color}`,
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '16px', lineHeight: 1.7, margin: 0 }}>
                {currentApp.description}
              </p>
            </div>

            {/* Connection to diffusion/convection */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
              borderLeft: `4px solid ${premiumDesign.colors.primary}`,
            }}>
              <h3 style={{ color: premiumDesign.colors.primary, fontSize: '16px', fontWeight: 700, marginBottom: premiumDesign.spacing.sm }}>
                &#128279; Connection to Your Experiment
              </h3>
              <p style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.7, margin: 0 }}>
                {currentApp.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
            }}>
              <h3 style={{ color: premiumDesign.colors.text.primary, fontSize: '16px', fontWeight: 700, marginBottom: premiumDesign.spacing.sm }}>
                &#9881;&#65039; How It Works
              </h3>
              <p style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.7, margin: 0 }}>
                {currentApp.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: premiumDesign.spacing.sm,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{
                  background: premiumDesign.colors.background.card,
                  borderRadius: premiumDesign.radius.md,
                  padding: premiumDesign.spacing.md,
                  textAlign: 'center',
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: currentApp.color, fontSize: isMobile ? '16px' : '20px', fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
            }}>
              <h3 style={{ color: premiumDesign.colors.text.primary, fontSize: '16px', fontWeight: 700, marginBottom: premiumDesign.spacing.sm }}>
                &#128203; Real Examples
              </h3>
              <ul style={{ color: premiumDesign.colors.text.secondary, paddingLeft: '20px', lineHeight: 1.8, margin: 0 }}>
                {currentApp.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>

            {/* Companies */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
            }}>
              <h3 style={{ color: premiumDesign.colors.text.primary, fontSize: '16px', fontWeight: 700, marginBottom: premiumDesign.spacing.sm }}>
                &#127970; Industry Leaders
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: premiumDesign.spacing.sm }}>
                {currentApp.companies.map((company, i) => (
                  <span key={i} style={{
                    background: `${currentApp.color}20`,
                    color: currentApp.color,
                    padding: `${premiumDesign.spacing.xs}px ${premiumDesign.spacing.sm}px`,
                    borderRadius: premiumDesign.radius.full,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Future impact */}
            <div style={{
              background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${premiumDesign.colors.background.card} 100%)`,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              marginBottom: premiumDesign.spacing.md,
              border: `1px solid ${currentApp.color}40`,
            }}>
              <h3 style={{ color: currentApp.color, fontSize: '16px', fontWeight: 700, marginBottom: premiumDesign.spacing.sm }}>
                &#128640; Future Impact
              </h3>
              <p style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.7, margin: 0 }}>
                {currentApp.futureImpact}
              </p>
            </div>

            {/* Complete button */}
            {!isCurrentCompleted && (
              <button
                onClick={handleCompleteApp}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: 'none',
                  background: `linear-gradient(135deg, ${currentApp.color} 0%, ${premiumDesign.colors.accent} 100%)`,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${currentApp.color}40`,
                }}
              >
                {activeApp < realWorldApps.length - 1 ? 'Got It! Continue &#8594;' : '&#10003; Complete All Topics'}
              </button>
            )}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: allCompleted ? 'Take the Quiz &#8594;' : `Explore ${realWorldApps.length - completedApps.size} More &#8594;`,
            onClick: goNext,
            disabled: !allCompleted,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: passed ? premiumDesign.colors.success : premiumDesign.colors.warning,
              marginBottom: premiumDesign.spacing.sm,
            }}>
              {testScore}/{testQuestions.length}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 600,
              color: premiumDesign.colors.text.secondary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {percentage}%
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? 'You have mastered diffusion and convection!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of 10
          </span>
          <span style={{ color: premiumDesign.colors.success, fontWeight: 600 }}>
            Score: {testScore}/{testQuestions.length}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          {/* Scenario context */}
          <p style={{
            fontSize: '15px',
            color: premiumDesign.colors.text.secondary,
            marginBottom: premiumDesign.spacing.lg,
            lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            {question.scenario}
          </p>

          <h3 style={{
            fontSize: isMobile ? '18px' : '20px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{ display: 'grid', gap: premiumDesign.spacing.md }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.correct;
              const showResult = showExplanation;

              let bgColor = premiumDesign.colors.background.secondary;
              let borderColor = 'rgba(255,255,255,0.1)';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (isSelected) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = premiumDesign.colors.error;
                }
              } else if (isSelected) {
                bgColor = 'rgba(168, 85, 247, 0.2)';
                borderColor = premiumDesign.colors.primary;
              }

              return (
                <button
                  key={index}
                  style={{
                    padding: premiumDesign.spacing.lg,
                    borderRadius: premiumDesign.radius.lg,
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    cursor: showExplanation ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => {
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                >
                  <span style={{
                    color: premiumDesign.colors.text.primary,
                    fontSize: '15px',
                  }}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div style={{
            background: question.options[selectedAnswer as number]?.correct
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: `1px solid ${question.options[selectedAnswer as number]?.correct
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(239, 68, 68, 0.3)'}`,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            <p style={{
              color: question.options[selectedAnswer as number]?.correct
                ? premiumDesign.colors.success
                : premiumDesign.colors.error,
              fontWeight: 600,
              marginBottom: premiumDesign.spacing.sm,
            }}>
              {question.options[selectedAnswer as number]?.correct ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Quiz control button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: premiumDesign.spacing.lg,
        }}>
          <button
            onClick={() => {
              if (showExplanation) {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              } else {
                if (question.options[selectedAnswer as number]?.correct) {
                  setTestScore(s => s + 1);
                }
                setShowExplanation(true);
              }
            }}
            disabled={selectedAnswer === null && !showExplanation}
            style={{
              padding: '16px 32px',
              minHeight: '48px',
              borderRadius: premiumDesign.radius.lg,
              border: 'none',
              background: (selectedAnswer === null && !showExplanation)
                ? premiumDesign.colors.background.tertiary
                : premiumDesign.colors.gradient.primary,
              color: (selectedAnswer === null && !showExplanation)
                ? premiumDesign.colors.text.muted
                : 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (selectedAnswer === null && !showExplanation) ? 'not-allowed' : 'pointer',
              opacity: (selectedAnswer === null && !showExplanation) ? 0.5 : 1,
              boxShadow: (selectedAnswer === null && !showExplanation) ? 'none' : `0 4px 16px ${premiumDesign.colors.primary}40`,
            }}
          >
            {showExplanation
              ? (currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'See Results')
              : 'Check Answer'}
          </button>
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Confetti animation */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: [
                premiumDesign.colors.primary,
                premiumDesign.colors.secondary,
                premiumDesign.colors.success,
                premiumDesign.colors.accent,
              ][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        {renderProgressBar()}

        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: premiumDesign.colors.gradient.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: premiumDesign.spacing.xl,
          boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 800,
          color: premiumDesign.colors.text.primary,
          marginBottom: premiumDesign.spacing.sm,
        }}>
          Heat Transfer Master!
        </h1>

        <p style={{
          fontSize: '20px',
          color: premiumDesign.colors.text.secondary,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          Final Score: <span style={{ color: premiumDesign.colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: premiumDesign.spacing.md,
          maxWidth: '400px',
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          {[
            { icon: '💧', label: 'Diffusion = Random Motion' },
            { icon: '🌀', label: 'Convection = Bulk Flow' },
            { icon: '⬆️', label: 'Hot Rises, Cold Sinks' },
            { icon: '🌡️', label: 'Heat Position Matters' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                background: premiumDesign.colors.background.secondary,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: premiumDesign.spacing.xs }}>{item.icon}</div>
              <div style={{ fontSize: '13px', color: premiumDesign.colors.text.secondary }}>{item.label}</div>
            </div>
          ))}
        </div>

        {renderButton(
          'Complete Lesson ✓',
          () => {
            emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length });
          },
          'success'
        )}
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  const isFirst = phase === 'hook';
  const isLast = phase === 'mastery';
  const isTestActive = phase === 'test' && !testComplete;
  const isNextDisabled = isLast || isTestActive;

  return (
    <div style={{
      minHeight: '100dvh',
      height: '100dvh',
      background: 'linear-gradient(180deg, #0f172a 0%, #0c0a09 50%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: premiumDesign.typography.fontFamily,
      color: '#f8fafc',
    }}>
      {/* Progress bar header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: premiumDesign.colors.background.tertiary,
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: premiumDesign.colors.gradient.primary,
          transition: 'width 0.3s ease',
        }} />
      </header>

      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '60px',
        paddingBottom: '16px',
        paddingLeft: isMobile ? '16px' : '24px',
        paddingRight: isMobile ? '16px' : '24px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {phase === 'hook' && renderHookPhase()}
          {phase === 'predict' && renderPredictPhase()}
          {phase === 'play' && renderPlayPhase()}
          {phase === 'review' && renderReviewPhase()}
          {phase === 'twist_predict' && renderTwistPredictPhase()}
          {phase === 'twist_play' && renderTwistPlayPhase()}
          {phase === 'twist_review' && renderTwistReviewPhase()}
          {phase === 'transfer' && (
            <TransferPhaseView
              conceptName="Diffusion Convection"
              applications={realWorldApps}
              onComplete={() => goToPhase('test')}
              isMobile={isMobile}
              colors={colors}
              typo={typo}
              playSound={playSound}
            />
          )}
          {phase === 'test' && renderTestPhase()}
          {phase === 'mastery' && renderMasteryPhase()}
        </div>
      </div>

      {/* Fixed bottom navigation bar */}
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 20px',
            minHeight: '48px',
            border: 'none',
            borderRadius: '10px',
            background: 'transparent',
            color: isFirst ? 'rgba(148,163,184,0.3)' : '#e2e8f0',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontFamily: premiumDesign.typography.fontFamily,
            fontSize: '14px',
            fontWeight: 500,
            opacity: isFirst ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {'\u2190 Back'}
        </button>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              title={phaseLabels[p]}
              aria-label={phaseLabels[p]}
              style={{
                width: phase === p ? '24px' : '12px',
                height: '44px',
                padding: '18px 0',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? premiumDesign.colors.primary : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={isNextDisabled}
          style={{
            padding: '12px 20px',
            minHeight: '48px',
            border: 'none',
            borderRadius: '10px',
            background: isNextDisabled ? 'rgba(148,163,184,0.2)' : premiumDesign.colors.gradient.primary,
            color: isNextDisabled ? 'rgba(148,163,184,0.5)' : 'white',
            cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            fontFamily: premiumDesign.typography.fontFamily,
            fontSize: '14px',
            fontWeight: 600,
            opacity: isNextDisabled ? 0.4 : 1,
            transition: 'all 0.2s ease',
            boxShadow: isNextDisabled ? 'none' : `0 4px 12px ${premiumDesign.colors.primary}40`,
          }}
        >
          {'Next \u2192'}
        </button>
      </nav>
    </div>
  );
}
