'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// ELON ORBITAL FACTORY - Complete 10-Phase Game (#27 of 36)
// In-space manufacturing — microgravity enables materials impossible on Earth
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

interface Props {
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
    scenario: "On Earth, when you melt metal and let it cool, convection currents constantly mix the liquid, creating inhomogeneous alloys.",
    question: "What happens to convection in microgravity?",
    options: [
      { id: 'a', label: "Convection is eliminated — no buoyancy-driven flow without gravity", correct: true },
      { id: 'b', label: "Convection increases due to lower air resistance" },
      { id: 'c', label: "Convection stays the same — it's not related to gravity" },
      { id: 'd', label: "Convection reverses direction" }
    ],
    explanation: "Convection requires buoyancy: hot fluid rises, cool fluid sinks. Without gravity, there's no 'up' or 'down,' so buoyancy-driven convection vanishes entirely."
  },
  {
    scenario: "Marangoni flow is driven by surface tension gradients caused by temperature differences across a liquid surface.",
    question: "In microgravity, why does Marangoni flow become the dominant mixing force?",
    options: [
      { id: 'a', label: "Because convection is eliminated, surface tension effects dominate", correct: true },
      { id: 'b', label: "Because gravity amplifies surface tension" },
      { id: 'c', label: "Because space is colder" },
      { id: 'd', label: "Marangoni flow doesn't exist in space" }
    ],
    explanation: "On Earth, buoyancy-driven convection overwhelms surface tension effects. Remove gravity, and Marangoni flow — driven purely by surface tension gradients — becomes the primary transport mechanism."
  },
  {
    scenario: "On Earth, molten materials must be held in containers (crucibles). The container walls can contaminate the melt and introduce nucleation sites.",
    question: "How does microgravity enable containerless processing?",
    options: [
      { id: 'a', label: "Without gravity, liquids float — acoustic or electromagnetic levitation holds samples without contact", correct: true },
      { id: 'b', label: "Materials don't melt in space" },
      { id: 'c', label: "Containers work better in space" },
      { id: 'd', label: "Vacuum alone is enough to hold materials" }
    ],
    explanation: "In microgravity, there's no need to fight gravity to keep a sample suspended. Gentle acoustic or electromagnetic forces can levitate molten samples, eliminating container contamination entirely."
  },
  {
    scenario: "Crystal growth requires atoms to arrange themselves in perfect lattice structures. On Earth, gravity causes sedimentation and density-driven flows that disrupt this ordering.",
    question: "Why are crystals grown in microgravity often superior?",
    options: [
      { id: 'a', label: "Slower, more uniform growth without convective disruption produces fewer defects", correct: true },
      { id: 'b', label: "Space radiation helps crystals form" },
      { id: 'c', label: "Lower temperature in space is better for crystals" },
      { id: 'd', label: "Crystals can't grow in microgravity" }
    ],
    explanation: "Without gravity-driven convection, the depletion zone around a growing crystal is perfectly symmetric. Atoms arrive uniformly from all directions, producing larger, more ordered crystals with fewer defects."
  },
  {
    scenario: "ZBLAN is a fluoride glass used for fiber optics. On Earth, gravity causes micro-crystallization during the fiber pulling process, scattering light.",
    question: "Why could space-made ZBLAN fiber be worth $1M per kilogram?",
    options: [
      { id: 'a', label: "Microgravity prevents crystallization, yielding 100x lower signal loss than silica fiber", correct: true },
      { id: 'b', label: "ZBLAN is a rare element only found in asteroids" },
      { id: 'c', label: "Space radiation makes it glow" },
      { id: 'd', label: "It's lighter in space so you need less material" }
    ],
    explanation: "Earth-made ZBLAN develops micro-crystals from gravity-driven convection during cooling. Space-made ZBLAN stays amorphous, achieving theoretical minimum attenuation — 100x better than silica fiber for telecommunications."
  },
  {
    scenario: "Protein crystallography requires large, well-ordered crystals to determine molecular structures via X-ray diffraction.",
    question: "Why has Merck collaborated with JAXA to grow insulin crystals on the ISS?",
    options: [
      { id: 'a', label: "Microgravity produces larger, more perfect protein crystals for better drug formulation", correct: true },
      { id: 'b', label: "Insulin only works in zero gravity" },
      { id: 'c', label: "It's cheaper to manufacture drugs in space" },
      { id: 'd', label: "Space radiation sterilizes the crystals" }
    ],
    explanation: "Protein crystals grown in microgravity are typically larger and have fewer defects. The improved crystal quality yields higher-resolution X-ray diffraction data, enabling better understanding of molecular structure for drug design."
  },
  {
    scenario: "In microgravity, when you form a molten metal droplet, surface tension pulls it into a perfect sphere — there's no gravity to cause sagging.",
    question: "Why is this relevant for manufacturing ball bearings?",
    options: [
      { id: 'a', label: "Space-made spheres are geometrically perfect — critical for precision bearings and calibration standards", correct: true },
      { id: 'b', label: "Ball bearings don't need to be round" },
      { id: 'c', label: "Earth bearings are already perfect" },
      { id: 'd', label: "Spheres are impossible to make in any gravity" }
    ],
    explanation: "On Earth, gravity deforms molten droplets into oblate shapes during solidification. In microgravity, surface tension alone shapes them into mathematically perfect spheres — ideal for precision instruments."
  },
  {
    scenario: "The ISS orbits Earth every 90 minutes. Various pumps, fans, and crew movements create micro-vibrations (g-jitter) at frequencies from 0.01 to 300 Hz.",
    question: "How do these vibrations affect crystal growth experiments?",
    options: [
      { id: 'a', label: "Even micro-g vibrations can disrupt crystal nucleation — isolation platforms are essential", correct: true },
      { id: 'b', label: "Vibrations help mix materials evenly" },
      { id: 'c', label: "Vibrations have no effect on crystal growth" },
      { id: 'd', label: "Only vibrations above 1000 Hz matter" }
    ],
    explanation: "Crystal growth at the atomic level is extraordinarily sensitive. Vibrations as small as 10⁻⁶g can induce unwanted convection in melts and disrupt nucleation. Active vibration isolation platforms like ARIS reduce g-jitter by 1000x."
  },
  {
    scenario: "Varda Space Industries manufactures pharmaceuticals in orbit and returns them to Earth via re-entry capsules.",
    question: "What is the primary economic argument for orbital pharmaceutical manufacturing?",
    options: [
      { id: 'a', label: "Unique crystal polymorphs formed in microgravity can improve drug efficacy and bioavailability", correct: true },
      { id: 'b', label: "It's cheaper to manufacture in space" },
      { id: 'c', label: "Drugs expire slower in space" },
      { id: 'd', label: "FDA requires space testing" }
    ],
    explanation: "Certain drug compounds form different crystal structures (polymorphs) in microgravity. These polymorphs can have dramatically better solubility and bioavailability, potentially transforming drugs that currently work poorly in pill form."
  },
  {
    scenario: "SpaceX's Starship has 1100m³ of pressurized cargo volume, potentially enabling large-scale orbital factories.",
    question: "What is the biggest challenge for scaling orbital manufacturing from ISS experiments to Starship-scale factories?",
    options: [
      { id: 'a', label: "Maintaining ultra-low vibration environments at industrial scale while managing thermal loads", correct: true },
      { id: 'b', label: "There is no gravity in Starship" },
      { id: 'c', label: "Starship is too small for factories" },
      { id: 'd', label: "Manufacturing doesn't work in orbit" }
    ],
    explanation: "Scaling from small ISS experiments to factory-scale production requires solving vibration isolation for large masses, managing significant thermal loads from industrial processes, and automating processes that currently need astronaut intervention."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💊',
    title: 'Varda Space Industries',
    short: 'Orbital pharmaceutical manufacturing and re-entry delivery',
    tagline: 'Making better drugs where gravity cannot interfere',
    description: 'Varda Space Industries manufactures pharmaceutical crystals in microgravity aboard autonomous spacecraft. Their capsules re-enter Earth\'s atmosphere to deliver space-made drug compounds with unique crystal structures impossible to create on the ground. Their first successful mission produced ritonavir crystals with improved properties.',
    connection: 'Without convection-driven mixing, crystal nucleation in microgravity produces unique polymorphs with enhanced bioavailability.',
    howItWorks: 'Autonomous capsules carry drug compounds to orbit, process them in microgravity, then de-orbit for recovery.',
    stats: [
      { value: 'ritonavir', label: 'First space crystals', icon: '💊' },
      { value: 're-entry', label: 'Delivery method', icon: '🔥' },
      { value: 'pharma', label: 'Primary focus', icon: '🏥' }
    ],
    examples: ['Ritonavir crystals', 'Protein crystallography', 'Small molecule drugs', 'Polymorphic screening'],
    companies: ['Varda Space Industries', 'Rocket Lab (launch)', 'SpaceX (future)', 'Pharmaceutical partners'],
    futureImpact: 'Routine orbital pharmaceutical factories could produce thousands of unique drug formulations annually.',
    color: '#8B5CF6'
  },
  {
    icon: '💡',
    title: 'ZBLAN Fiber Optics',
    short: 'Ultra-low-loss optical fibers manufactured in microgravity',
    tagline: 'The fiber that could replace silicon — if made in space',
    description: 'ZBLAN (ZrF₄-BaF₂-LaF₃-AlF₃-NaF) is a fluoride glass with theoretically 100x lower signal attenuation than silica fiber. On Earth, gravity-driven convection during cooling causes micro-crystallization that destroys its optical properties. In microgravity, ZBLAN stays perfectly amorphous, achieving near-theoretical performance.',
    connection: 'Eliminating convection prevents micro-crystal formation during fiber pulling — the key defect that limits Earth-made ZBLAN.',
    howItWorks: 'Fluoride glass preforms are heated and drawn into fibers in microgravity, where convection-free cooling prevents crystallization.',
    stats: [
      { value: '100x', label: 'Lower signal loss', icon: '📡' },
      { value: 'fluoride', label: 'Glass composition', icon: '🔬' },
      { value: '$1M/kg', label: 'Estimated value', icon: '💰' }
    ],
    examples: ['Telecommunications backbone', 'Submarine cables', 'Medical laser delivery', 'Infrared sensing'],
    companies: ['FOMS Inc.', 'Physical Optics Corp.', 'Thorlabs', 'Made In Space (Redwire)'],
    futureImpact: 'Space-made ZBLAN could revolutionize global telecommunications with orders-of-magnitude better signal transmission.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'ISS Protein Crystals',
    short: 'Growing perfect protein crystals for drug discovery',
    tagline: 'Better crystals mean better medicines',
    description: 'The ISS hosts ongoing protein crystallization experiments from agencies and companies worldwide. Merck collaborated with JAXA to grow insulin crystals in microgravity that were significantly larger and more uniform than Earth-grown equivalents. These superior crystals enable higher-resolution X-ray diffraction for drug formulation.',
    connection: 'Without sedimentation and convective disruption, protein molecules assemble into larger, more ordered crystal lattices.',
    howItWorks: 'Protein solutions are slowly concentrated in microgravity, allowing gentle, uniform crystal nucleation and growth.',
    stats: [
      { value: 'Merck/JAXA', label: 'Key collaboration', icon: '🤝' },
      { value: 'insulin', label: 'Crystal target', icon: '💉' },
      { value: 'drug', label: 'Formulation goal', icon: '💊' }
    ],
    examples: ['Insulin formulation', 'Antibody structure', 'Enzyme drug targets', 'Virus protein mapping'],
    companies: ['Merck', 'JAXA', 'NASA', 'Center for Advancement of Science in Space'],
    futureImpact: 'Routine access to microgravity crystallization will accelerate structure-based drug design across the pharmaceutical industry.',
    color: '#10B981'
  },
  {
    icon: '🚀',
    title: 'SpaceX Starship Volume',
    short: 'Enabling large-scale orbital factories with unprecedented cargo volume',
    tagline: 'From lab experiments to orbital factories',
    description: 'SpaceX Starship offers 1100m³ of pressurized cargo volume — more than the entire ISS pressurized volume. This unprecedented capacity could transform orbital manufacturing from small ISS experiments into full-scale industrial operations, housing multiple production lines for fibers, crystals, alloys, and pharmaceuticals simultaneously.',
    connection: 'Scale is the missing ingredient — Starship provides the volume and mass budget to make orbital manufacturing economically viable.',
    howItWorks: 'Starship\'s massive payload bay can host automated manufacturing modules with their own vibration isolation and thermal management.',
    stats: [
      { value: '1100m³', label: 'Pressurized cargo', icon: '📦' },
      { value: 'large-scale', label: 'Factory capability', icon: '🏭' },
      { value: 'vision', label: 'Industrial future', icon: '🔮' }
    ],
    examples: ['Fiber optic production', 'Pharmaceutical manufacturing', 'Alloy processing', 'Semiconductor crystal growth'],
    companies: ['SpaceX', 'Varda Space Industries', 'Redwire', 'Space Forge'],
    futureImpact: 'Starship-class vehicles will enable permanent orbital industrial parks producing materials impossible to make on Earth.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_OrbitalFactoryRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [gravityLevel, setGravityLevel] = useState(0);
  const [vibrationLevel, setVibrationLevel] = useState(0);

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
// Calculate quality metrics based on gravity
  const calculateCrystalQuality = (g: number) => Math.max(0, 100 - (g * 100) ** 1.5);
  const calculateFiberAttenuation = (g: number) => 0.01 + g * 9.99; // dB/km: 0.01 at 0g, ~10 at 1g
  const calculateAlloyHomogeneity = (g: number) => Math.max(0, 100 - g * 85);
  const calculateSphereRoundness = (g: number) => Math.max(0, 99.9999 - g * 2.5);

  // Calculate vibration impact
  const calculateVibrationImpact = (vib: number) => Math.max(0, 100 - vib * 80);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    space: '#3B82F6',
    earth: '#F97316',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'orbital-factory',
        gameTitle: 'Orbital Factory',
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

  // Current quality values
  const crystalQuality = calculateCrystalQuality(gravityLevel);
  const fiberAttenuation = calculateFiberAttenuation(gravityLevel);
  const alloyHomogeneity = calculateAlloyHomogeneity(gravityLevel);
  const sphereRoundness = calculateSphereRoundness(gravityLevel);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.space})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.space})`,
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

  // ---------------------------------------------------------------------------
  // SVG VISUALIZATION: Split view Earth vs Orbital factory
  // ---------------------------------------------------------------------------
  const OrbitalFactoryVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 420;
    const gNorm = gravityLevel;
    const midX = width / 2;
    const crystalQ = crystalQuality / 100;
    const fiberQ = Math.max(0, 1 - (fiberAttenuation / 10));
    const alloyQ = alloyHomogeneity / 100;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Orbital Factory visualization">
        <defs>
          {/* Gradient: space background */}
          <linearGradient id="spaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c0c1a" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          {/* Gradient: Earth side */}
          <linearGradient id="earthBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a3a5c" />
            <stop offset="100%" stopColor="#0d1b2a" />
          </linearGradient>
          {/* Gradient: orbital side */}
          <linearGradient id="orbitalBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0a2e" />
            <stop offset="100%" stopColor="#0d0518" />
          </linearGradient>
          {/* Crystal gradient */}
          <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          {/* Perfect crystal gradient */}
          <linearGradient id="perfectCrystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
          {/* Quality meter gradient */}
          <linearGradient id="qualityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Gravity arrow gradient */}
          <linearGradient id="gravArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Fiber optic glow */}
          <linearGradient id="fiberGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          {/* Alloy gradient */}
          <linearGradient id="alloyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Soft glow */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Star shimmer */}
          <filter id="starShimmer" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Shadow */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          {/* Noise texture for alloy */}
          <filter id="turbulence">
            <feTurbulence type="fractalNoise" baseFrequency={0.05 + gNorm * 0.15} numOctaves="3" seed="42" />
            <feDisplacementMap in="SourceGraphic" scale={gNorm * 8} />
          </filter>
          {/* Radial glow for quality meters */}
          <radialGradient id="meterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>
        </defs>

        {/* Background split */}
        <rect x="0" y="0" width={midX} height={height} fill="url(#earthBg)" />
        <rect x={midX} y="0" width={midX} height={height} fill="url(#orbitalBg)" />
        <line x1={midX} y1="0" x2={midX} y2={height} stroke="rgba(139,92,246,0.4)" strokeWidth="2" strokeDasharray="6,4" />

        {/* Stars on orbital side */}
        {[
          [midX + 20, 25], [midX + 60, 45], [midX + 100, 15], [midX + 140, 55],
          [midX + 40, 80], [midX + 110, 70], [midX + 80, 35], [midX + 150, 30]
        ].map(([cx, cy], i) => (
          <circle key={`star-${i}`} cx={cx} cy={cy as number} r={1 + (i % 3) * 0.5} fill="white" opacity={0.3 + (i % 4) * 0.15} filter="url(#starShimmer)" />
        ))}

        {/* Section labels */}
        <text x={midX / 2} y={22} fill={colors.earth} fontSize="13" fontWeight="700" textAnchor="middle">
          EARTH FACTORY (1g)
        </text>
        <text x={midX + midX / 2} y={22} fill={colors.accent} fontSize="13" fontWeight="700" textAnchor="middle">
          ORBITAL FACTORY ({gravityLevel.toFixed(2)}g)
        </text>

        {/* --- EARTH SIDE: Gravity arrow --- */}
        <g>
          <line x1={midX / 2 - 60} y1={40} x2={midX / 2 - 60} y2={height - 50} stroke="url(#gravArrowGrad)" strokeWidth="3" opacity="0.6" />
          <polygon points={`${midX / 2 - 60},${height - 45} ${midX / 2 - 66},${height - 55} ${midX / 2 - 54},${height - 55}`} fill={colors.earth} opacity="0.8" />
          <text x={midX / 2 - 60} y={height - 72} fill={colors.earth} fontSize="11" textAnchor="middle" fontWeight="600">g=1</text>
        </g>

        {/* --- CRYSTAL GROWTH COMPARISON --- */}
        {/* Earth crystal - defective */}
        <g>
          <text x={midX / 2} y={50} fill="#94a3b8" fontSize="11" textAnchor="middle">Crystal Growth</text>
          {/* Irregular crystal shape on Earth */}
          <polygon
            points={`${midX / 2 - 15},${100} ${midX / 2 - 5},${65} ${midX / 2 + 8},${62} ${midX / 2 + 18},${70} ${midX / 2 + 20},${95} ${midX / 2 + 5},${105} ${midX / 2 - 10},${103}`}
            fill="url(#crystalGrad)"
            opacity={0.5}
            stroke="#60A5FA"
            strokeWidth="1"
          />
          {/* Defect lines */}
          <line x1={midX / 2 - 8} y1={75} x2={midX / 2 + 12} y2={90} stroke="#EF4444" strokeWidth="1" opacity="0.7" strokeDasharray="2,2" />
          <line x1={midX / 2 + 5} y1={68} x2={midX / 2 - 5} y2={95} stroke="#EF4444" strokeWidth="1" opacity="0.5" strokeDasharray="2,2" />
          {/* Convection arrows */}
          <path d={`M ${midX / 2 - 25} 250 Q ${midX / 2 - 35} 155 ${midX / 2 - 25} 60`} stroke="#F97316" strokeWidth="1" fill="none" opacity="0.5" />
          <path d={`M ${midX / 2 + 25} 65 Q ${midX / 2 + 35} 155 ${midX / 2 + 25} 250`} stroke="#F97316" strokeWidth="1" fill="none" opacity="0.5" />
          <text x={midX / 2} y={115} fill="#EF4444" fontSize="11" textAnchor="middle">Defective</text>
        </g>

        {/* Orbital crystal - quality depends on gravity slider */}
        <g>
          <text x={midX + midX / 2} y={50} fill="#94a3b8" fontSize="11" textAnchor="middle">Crystal Growth</text>
          {/* Crystal quality varies with gravity */}
          <polygon
            points={`${midX + midX / 2 - 14},${98 - crystalQ * 5} ${midX + midX / 2 - 6},${62 + (1 - crystalQ) * 10} ${midX + midX / 2 + 6},${60 + (1 - crystalQ) * 8} ${midX + midX / 2 + 16},${68 + (1 - crystalQ) * 12} ${midX + midX / 2 + 16},${95 - crystalQ * 3} ${midX + midX / 2 + 4},${103 - crystalQ * 3} ${midX + midX / 2 - 10},${101 - crystalQ * 4}`}
            fill="url(#perfectCrystalGrad)"
            opacity={0.5 + crystalQ * 0.5}
            stroke="#A78BFA"
            strokeWidth="1.5"
            filter={crystalQ > 0.8 ? 'url(#glow)' : undefined}
          />
          {/* Show defects if gravity is high */}
          {gNorm > 0.3 && (
            <line x1={midX + midX / 2 - 6} y1={72} x2={midX + midX / 2 + 8} y2={88} stroke="#EF4444" strokeWidth="1" opacity={gNorm * 0.8} strokeDasharray="2,2" />
          )}
          <text x={midX + midX / 2} y={115} fill={crystalQ > 80 ? colors.success : crystalQ > 40 ? colors.warning : colors.error} fontSize="11" textAnchor="middle" fontWeight="600">
            {crystalQ.toFixed(0)}% Quality
          </text>
        </g>

        {/* --- FIBER PULLING COMPARISON --- */}
        {/* Earth fiber - scattered light */}
        <g>
          <text x={midX / 2} y={135} fill="#94a3b8" fontSize="11" textAnchor="middle">Fiber Optic</text>
          <line x1={midX / 2 - 40} y1={155} x2={midX / 2 + 40} y2={155} stroke="url(#fiberGlow)" strokeWidth="4" opacity="0.4" />
          {/* Scatter points (micro-crystals) */}
          {[-30, -15, 0, 10, 25, 35].map((dx, i) => (
            <circle key={`scatter-${i}`} cx={midX / 2 + dx} cy={155} r={2} fill="#EF4444" opacity="0.6" />
          ))}
          <text x={midX / 2} y={172} fill="#EF4444" fontSize="11" textAnchor="middle">10 dB/km loss</text>
        </g>

        {/* Orbital fiber - quality depends on gravity */}
        <g>
          <text x={midX + midX / 2} y={135} fill="#94a3b8" fontSize="11" textAnchor="middle">Fiber Optic</text>
          <line x1={midX + midX / 2 - 40} y1={155} x2={midX + midX / 2 + 40} y2={155} stroke="url(#fiberGlow)" strokeWidth="4" opacity={0.4 + fiberQ * 0.6} filter={fiberQ > 0.8 ? 'url(#glow)' : undefined} />
          {/* Show scatter based on gravity */}
          {Array.from({ length: Math.floor(gNorm * 6) }).map((_, i) => (
            <circle key={`oscatter-${i}`} cx={midX + midX / 2 - 30 + i * 12} cy={155} r={1.5} fill="#EF4444" opacity={gNorm * 0.7} />
          ))}
          <text x={midX + midX / 2} y={172} fill={fiberAttenuation < 1 ? colors.success : fiberAttenuation < 5 ? colors.warning : colors.error} fontSize="11" textAnchor="middle" fontWeight="600">
            {fiberAttenuation.toFixed(2)} dB/km loss
          </text>
        </g>

        {/* --- ALLOY MIXING COMPARISON --- */}
        {/* Earth alloy - stratified */}
        <g>
          <text x={midX / 2} y={195} fill="#94a3b8" fontSize="11" textAnchor="middle">Alloy Mixing</text>
          <rect x={midX / 2 - 25} y={205} width="50" height="40" rx="4" fill="#6B7280" opacity="0.6" />
          {/* Stratification layers */}
          <rect x={midX / 2 - 25} y={205} width="50" height="10" rx="2" fill="#D1D5DB" opacity="0.4" />
          <rect x={midX / 2 - 25} y={215} width="50" height="10" fill="#9CA3AF" opacity="0.5" />
          <rect x={midX / 2 - 25} y={225} width="50" height="10" fill="#6B7280" opacity="0.6" />
          <rect x={midX / 2 - 25} y={235} width="50" height="10" rx="2" fill="#4B5563" opacity="0.7" />
          <text x={midX / 2} y={258} fill="#EF4444" fontSize="11" textAnchor="middle">Stratified</text>
        </g>

        {/* Orbital alloy - homogeneous based on gravity */}
        <g>
          <text x={midX + midX / 2} y={195} fill="#94a3b8" fontSize="11" textAnchor="middle">Alloy Mixing</text>
          <rect x={midX + midX / 2 - 25} y={205} width="50" height="40" rx="4" fill="url(#alloyGrad)" opacity={0.5 + alloyQ / 200} filter={gNorm > 0.3 ? 'url(#turbulence)' : undefined} />
          {/* Show stratification only if gravity is present */}
          {gNorm > 0.2 && (
            <>
              <rect x={midX + midX / 2 - 25} y={205} width="50" height={10 + gNorm * 5} rx="2" fill="#D1D5DB" opacity={gNorm * 0.3} />
              <rect x={midX + midX / 2 - 25} y={235 - gNorm * 5} width="50" height={10 + gNorm * 5} rx="2" fill="#4B5563" opacity={gNorm * 0.4} />
            </>
          )}
          <text x={midX + midX / 2} y={258} fill={alloyQ > 80 ? colors.success : alloyQ > 40 ? colors.warning : colors.error} fontSize="11" textAnchor="middle" fontWeight="600">
            {alloyQ.toFixed(0)}% Homogeneous
          </text>
        </g>

        {/* --- QUALITY METERS --- */}
        <g>
          <text x={width / 2} y={275} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">
            Manufacturing Quality vs Acceleration
          </text>
          <text x={width / 2} y={290} fill="#94a3b8" fontSize="11" textAnchor="middle">
            Density homogeneity at {gravityLevel.toFixed(2)}g
          </text>

          {/* Quality bars */}
          {[
            { label: 'Crystal', value: crystalQuality, x: width * 0.15 },
            { label: 'Fiber', value: fiberQ * 100, x: width * 0.38 },
            { label: 'Alloy', value: alloyHomogeneity, x: width * 0.62 },
            { label: 'Sphere', value: (sphereRoundness - 97) * 33.33, x: width * 0.85 },
          ].map((meter, i) => {
            const barH = 60;
            const barW = 16;
            const fillH = barH * Math.max(0, Math.min(1, meter.value / 100));
            const mColor = meter.value > 80 ? colors.success : meter.value > 40 ? colors.warning : colors.error;
            return (
              <g key={`meter-${i}`}>
                <rect x={meter.x - barW / 2} y={295} width={barW} height={barH} rx="4" fill={colors.border} />
                <rect x={meter.x - barW / 2} y={295 + barH - fillH} width={barW} height={fillH} rx="4" fill={mColor} opacity="0.8" />
                <text x={meter.x} y={295 + barH + 14} fill="#94a3b8" fontSize="11" textAnchor="middle">{meter.label}</text>
                <text x={meter.x} y={295 + barH + 28} fill={mColor} fontSize="11" fontWeight="600" textAnchor="middle">{meter.value.toFixed(0)}%</text>
              </g>
            );
          })}
        </g>

        {/* Gravity indicator */}
        <rect x={width / 2 - 80} y={height - 25} width="160" height="18" rx="4" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.3)" />
        <text x={width / 2} y={height - 12} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Gravity: {gravityLevel.toFixed(2)}g | Quality: {((crystalQuality + alloyHomogeneity) / 2).toFixed(0)}%
        </text>
      </svg>
    );
  };

  // Vibration Impact Visualization for twist phases
  const VibrationVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const vibImpact = calculateVibrationImpact(vibrationLevel);
    const combinedQuality = vibImpact * (crystalQuality / 100);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="vibGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="isolationGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="vibGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="waveFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0d0518" rx="12" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Micro-Vibration Impact on Crystal Growth
        </text>

        {/* Vibration wave visualization */}
        <g>
          <text x={width / 2} y={50} fill="#94a3b8" fontSize="11" textAnchor="middle">
            Spacecraft Vibration Environment
          </text>
          {/* Vibration wave */}
          <path
            d={`M 40 85 ${Array.from({ length: 20 }).map((_, i) => {
              const x = 40 + i * ((width - 80) / 20);
              const amp = Math.max(45, vibrationLevel * 55);
              const y = 85 + Math.sin(i * 1.2) * amp;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            stroke="#F59E0B"
            strokeWidth="2"
            fill="none"
            opacity="0.7"
            filter="url(#waveFilter)"
          />
          {/* Flat line for reference (no vibration) */}
          <line x1={40} y1={85} x2={width - 40} y2={85} stroke="#10B981" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          <text x={width - 35} y={75} fill="#10B981" fontSize="11" textAnchor="end">Ideal: 0 vibration</text>
        </g>

        {/* Crystal growing with vibration effects */}
        <g>
          <text x={width / 2} y={125} fill="#94a3b8" fontSize="11" textAnchor="middle">
            Crystal Lattice Formation
          </text>
          {/* Crystal grid - affected by vibration */}
          {Array.from({ length: 7 }).map((_, row) =>
            Array.from({ length: 9 }).map((__, col) => {
              const baseX = width / 2 - 72 + col * 18;
              const baseY = 140 + row * 14;
              const jitterX = vibrationLevel * (Math.sin(row * 3 + col * 7) * 4);
              const jitterY = vibrationLevel * (Math.cos(row * 5 + col * 2) * 3);
              return (
                <circle
                  key={`atom-${row}-${col}`}
                  cx={baseX + jitterX}
                  cy={baseY + jitterY}
                  r={3}
                  fill={vibrationLevel < 0.3 ? '#A78BFA' : vibrationLevel < 0.6 ? '#F59E0B' : '#EF4444'}
                  opacity={0.5 + (1 - vibrationLevel) * 0.5}
                />
              );
            })
          )}
        </g>

        {/* Vibration impact bar */}
        <g>
          <text x={width / 2} y={250} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
            Crystal Quality: {vibImpact.toFixed(0)}% | Combined: {(combinedQuality * 100).toFixed(0)}%
          </text>
          <rect x={50} y={260} width={width - 100} height={16} rx="8" fill={colors.border} />
          <rect
            x={50}
            y={260}
            width={(width - 100) * (vibImpact / 100)}
            height={16}
            rx="8"
            fill="url(#vibGrad)"
            filter={vibImpact < 30 ? 'url(#vibGlow)' : undefined}
          />
          <circle
            cx={50 + (width - 100) * (vibImpact / 100)}
            cy={268}
            r="6"
            fill={vibImpact > 80 ? colors.success : vibImpact > 40 ? colors.warning : colors.error}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#vibGlow)"
          />
        </g>

        {/* Isolation platform diagram */}
        <g>
          <text x={width / 2} y={300} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="600">
            Vibration Isolation Platform (ARIS-type)
          </text>
          <rect x={width / 2 - 60} y={310} width="120" height="8" rx="2" fill="url(#isolationGrad)" opacity="0.6" />
          {/* Springs */}
          {[-40, -15, 15, 40].map((dx, i) => (
            <line key={`spring-${i}`} x1={width / 2 + dx} y1={318} x2={width / 2 + dx} y2={330} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5" />
          ))}
          <text x={width / 2} y={height - 5} fill="#94a3b8" fontSize="11" textAnchor="middle">
            Reduces g-jitter by 1000x
          </text>
        </g>
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
            🏭🛰️
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Orbital Factory
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;What if we could make <span style={{ color: colors.accent }}>perfect materials</span> where gravity doesn&apos;t interfere? In orbit, we can grow flawless crystals, pull impossibly pure fibers, and mix alloys that gravity won&apos;t let us create on Earth.&quot;
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
              &quot;The factory of the future floats in orbit — where the absence of gravity is the most valuable manufacturing tool ever discovered.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              — In-Space Manufacturing Vision
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
      { id: 'a', text: 'Technology limitation — we just need better machines' },
      { id: 'b', text: 'Gravity causes sagging during solidification — microgravity produces perfect spheres' },
      { id: 'c', text: 'Material limitation — metals can\'t form perfect spheres' },
      { id: 'd', text: 'We can already make perfectly round ball bearings on Earth' },
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
              Why can&apos;t we make perfectly round spherical ball bearings on Earth?
            </h2>

            {/* Static SVG showing sphere comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <radialGradient id="earthSphereGrad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#D1D5DB" />
                    <stop offset="100%" stopColor="#6B7280" />
                  </radialGradient>
                  <radialGradient id="spaceSphereGrad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#C4B5FD" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </radialGradient>
                  <filter id="predictGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Ball Bearing: Earth vs Space</text>

                {/* Earth bearing - slightly oblate */}
                <text x="110" y="50" textAnchor="middle" fill={colors.earth} fontSize="11">On Earth (1g)</text>
                <ellipse cx="110" cy="110" rx="42" ry="38" fill="url(#earthSphereGrad)" stroke="#9CA3AF" strokeWidth="1" />
                <line x1="110" y1="60" x2="110" y2="160" stroke={colors.earth} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                <text x="110" y="165" textAnchor="middle" fill={colors.earth} fontSize="11">Gravity sags</text>
                <polygon points="110,148 106,142 114,142" fill={colors.earth} opacity="0.6" />
                <text x="110" y="182" textAnchor="middle" fill="#94a3b8" fontSize="11">Oblate — not perfect</text>

                {/* Space bearing - perfect sphere */}
                <text x="290" y="50" textAnchor="middle" fill={colors.accent} fontSize="11">In Orbit (0g)</text>
                <circle cx="290" cy="110" r="40" fill="url(#spaceSphereGrad)" stroke="#A78BFA" strokeWidth="1.5" filter="url(#predictGlow)" />
                <text x="290" y="165" textAnchor="middle" fill={colors.accent} fontSize="11">Surface tension only</text>
                <text x="290" y="182" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Perfect sphere</text>
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
              ← Back
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

  // PLAY PHASE - Microgravity Manufacturing Simulator
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
              Microgravity Manufacturing Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> In microgravity, buoyancy-driven convection vanishes. Without convection, crystals grow uniformly, fibers pull without micro-crystallization, and alloys mix homogeneously. This enables materials impossible to manufacture on Earth.
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
                <strong style={{ color: colors.textPrimary }}>Microgravity Manufacturing</strong> is the production of materials in near-zero gravity environments where buoyancy-driven convection is eliminated.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Convection Elimination</strong> refers to the absence of buoyancy-driven fluid flow, enabling uniform crystal growth and mixing.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.space }}>Containerless Processing</strong> describes levitating molten materials with acoustic or electromagnetic fields, avoiding crucible contamination.
              </p>
            </div>

            {/* Formula */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.accent, fontWeight: 700, marginBottom: '4px' }}>Key Relationship</p>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0, fontFamily: 'monospace' }}>
                Q = 100 - (g {'×'} 100){'³'}{'\u2044'}{'²'} where Q = crystal quality (%), g = acceleration
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px', margin: 0 }}>
                Quality is proportional to (1 - g{'³'}{'\u2044'}{'²'}). Even small increases in gravity cause disproportionate quality loss.
              </p>
            </div>

            {/* Visualization explanation and observation guidance */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization compares Earth-based manufacturing (left) with orbital manufacturing (right). Try adjusting the gravity slider and observe how product quality changes. Watch the crystal defect lines appear as gravity increases. Notice how fiber scatter points multiply and alloy layers stratify. At 0g, crystals are flawless, fibers are pure, and alloys are perfectly mixed. As gravity increases, convection disrupts all three processes.
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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '0' : '0', maxHeight: '50vh', overflow: 'hidden' }}>
                    <OrbitalFactoryVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Gravity slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Gravitational Acceleration Force</span>
                      <span style={{ ...typo.small, color: gravityLevel < 0.1 ? colors.success : gravityLevel < 0.5 ? colors.warning : colors.error, fontWeight: 600 }}>
                        {gravityLevel.toFixed(2)}g ({gravityLevel < 0.01 ? 'Perfect Microgravity' : gravityLevel < 0.1 ? 'Low Gravity' : gravityLevel < 0.5 ? 'Partial Gravity' : 'Near-Earth Gravity'})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={gravityLevel * 100}
                      onChange={(e) => setGravityLevel(parseInt(e.target.value) / 100)}
                      onInput={(e) => setGravityLevel(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Gravity Level"
                      style={sliderStyle(colors.accent, gravityLevel * 100, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0g (Perfect)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0.5g (Mars)</span>
                      <span style={{ ...typo.small, color: colors.error }}>1g (Earth)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: crystalQuality > 80 ? colors.success : crystalQuality > 40 ? colors.warning : colors.error }}>
                        {crystalQuality.toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Crystal Quality</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: fiberAttenuation < 1 ? colors.success : fiberAttenuation < 5 ? colors.warning : colors.error }}>
                        {fiberAttenuation.toFixed(2)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>dB/km Loss</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: alloyHomogeneity > 80 ? colors.success : alloyHomogeneity > 40 ? colors.warning : colors.error }}>
                        {alloyHomogeneity.toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Alloy Homogeneity</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>
                        {sphereRoundness.toFixed(4)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Sphere Roundness</div>
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
              ← Back
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
              The Physics of Microgravity Manufacturing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — as you observed in the simulator, gravity causes sagging during solidification. In microgravity, surface tension alone shapes molten droplets into mathematically perfect spheres.'
                : 'As you observed in the simulator, your prediction revealed a key insight — gravity fundamentally limits manufacturing quality. Molten metal sags under its own weight on Earth, but in orbit, surface tension creates perfect spheres.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Three Key Advantages of Microgravity:</strong>
                </p>
                <p style={{ marginBottom: '12px' }}>
                  1. <span style={{ color: colors.accent }}>No Convection</span> — Without buoyancy-driven flow, crystal growth proceeds uniformly in all directions, producing larger and more perfect crystals.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  2. <span style={{ color: colors.space }}>No Sedimentation</span> — Heavy particles don&apos;t sink, so alloys and composites mix homogeneously instead of stratifying by density.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  3. <span style={{ color: colors.success }}>Surface Tension Dominates</span> — Liquids naturally form perfect spheres since surface tension is the only shaping force.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Convection Matters So Much
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                On Earth, heated fluid expands, becomes less dense, and rises (buoyancy). This creates convection currents that constantly stir molten materials. For crystal growth, this means atoms arrive at the crystal surface unevenly — some faces grow faster, defects form, and the crystal structure is compromised. In microgravity, the depletion zone around a growing crystal is perfectly spherical, and atoms diffuse uniformly from all directions.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, fontFamily: 'monospace', margin: 0 }}>
                The relationship: Crystal Quality = 100 - (g {'×'} 100){'³'}{'\u2044'}{'²'} — quality is proportional to the inverse of gravitational acceleration raised to the 3/2 power.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Quality Comparison by Environment
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Crystal Defects', earth: 'Many', space: 'Near Zero', color: colors.accent },
                  { label: 'Fiber Loss', earth: '10 dB/km', space: '0.01 dB/km', color: colors.space },
                  { label: 'Alloy Mixing', earth: 'Stratified', space: 'Homogeneous', color: colors.success },
                  { label: 'Sphere Shape', earth: 'Oblate', space: 'Perfect', color: colors.warning },
                  { label: 'Contamination', earth: 'Crucible', space: 'Containerless', color: colors.error },
                  { label: 'Nucleation', earth: 'Random', space: 'Controlled', color: '#EC4899' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.small, color: item.color, fontWeight: 700, marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ ...typo.small, color: colors.error, fontSize: '11px' }}>Earth: {item.earth}</div>
                    <div style={{ ...typo.small, color: colors.success, fontSize: '11px' }}>Space: {item.space}</div>
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Explore the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', text: 'Don\'t affect anything — space is quiet enough' },
      { id: 'b', text: 'Disrupt crystal growth at the atomic level — isolation platforms are needed' },
      { id: 'c', text: 'Help mixing by adding gentle agitation' },
      { id: 'd', text: 'Only matter for extremely large crystals' },
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
              <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
                The Twist: There&apos;s a hidden problem in orbit...
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Even in orbit, a nearby pump causes micro-vibrations that...
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                The ISS isn&apos;t truly motionless. Crew members exercise, pumps circulate coolant, reaction wheels adjust attitude, and docking spacecraft transmit jolts through the structure. These &quot;micro-vibrations&quot; (called g-jitter) range from 10⁻⁶g to 10⁻³g across frequencies from 0.01 to 300 Hz.
              </p>
            </div>

            {/* Static SVG showing vibration concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="220" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <rect x="0" y="0" width="400" height="220" fill="#0d0518" rx="8" />
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Micro-Vibration Sources on ISS</text>

                {/* Perfect crystal vs disrupted */}
                <text x="110" y="50" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Isolated Platform</text>
                {/* Ordered grid */}
                {Array.from({ length: 5 }).map((_, row) =>
                  Array.from({ length: 5 }).map((__, col) => (
                    <circle key={`ord-${row}-${col}`} cx={80 + col * 15} cy={65 + row * 15} r={3} fill="#A78BFA" opacity={0.8} />
                  ))
                )}
                <text x="110" y="150" textAnchor="middle" fill={colors.success} fontSize="11">Perfect Lattice</text>

                {/* Disrupted grid */}
                <text x="290" y="50" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">Unshielded</text>
                {Array.from({ length: 5 }).map((_, row) =>
                  Array.from({ length: 5 }).map((__, col) => (
                    <circle key={`dis-${row}-${col}`} cx={260 + col * 15 + Math.sin(row * 3 + col * 7) * 5} cy={65 + row * 15 + Math.cos(row * 5 + col * 2) * 4} r={3} fill="#F59E0B" opacity={0.7} />
                  ))
                )}
                <text x="290" y="150" textAnchor="middle" fill={colors.error} fontSize="11">Disordered Atoms</text>

                {/* Vibration wave at bottom */}
                <path
                  d={`M 40 170 ${Array.from({ length: 20 }).map((_, i) => {
                    const x = 40 + i * 16;
                    const y = 170 + Math.sin(i * 1.2) * 35;
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  stroke="#F59E0B"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.7"
                />
                <text x="200" y="215" textAnchor="middle" fill="#94a3b8" fontSize="11">G-jitter vibration wave (0.01 - 300 Hz frequency range)</text>
                <line x1="40" y1="170" x2="360" y2="170" stroke="#10B981" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {twistOptions.map(opt => (
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
                    transition: 'all 0.2s',
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
              ← Back
            </button>
            {twistPrediction && (
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

  // TWIST PLAY PHASE - Vibration exploration
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
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              G-Jitter: The Hidden Enemy
            </h2>

            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>The Problem:</strong> Even in orbit, spacecraft systems create micro-vibrations. These tiny accelerations — as small as one-millionth of Earth&apos;s gravity — can destroy crystal growth experiments by inducing residual convection at the atomic level.
              </p>
            </div>

            {/* Educational panel */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The crystal lattice grid shows atoms being displaced by spacecraft vibrations. As g-jitter increases, the ordered lattice distorts and crystal quality plummets, visualized by color shifts from purple (perfect) to red (disrupted).</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the vibration slider, micro-accelerations induce residual convection that disrupts atomic ordering. Combining high vibration with any gravity drastically reduces the combined quality metric below usable thresholds.</p>
            </div>

            {/* Vibration visualization */}
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
                    <VibrationVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Vibration slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Vibration Level (g-jitter)</span>
                      <span style={{ ...typo.small, color: vibrationLevel < 0.2 ? colors.success : vibrationLevel < 0.5 ? colors.warning : colors.error, fontWeight: 600 }}>
                        {(vibrationLevel * 1000).toFixed(1)} × 10⁻³g
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={vibrationLevel * 100}
                      onChange={(e) => setVibrationLevel(parseInt(e.target.value) / 100)}
                      onInput={(e) => setVibrationLevel(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Vibration Level"
                      style={sliderStyle(colors.warning, vibrationLevel * 100, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0 (Isolated)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>ISS typical</span>
                      <span style={{ ...typo.small, color: colors.error }}>High (crew activity)</span>
                    </div>
                  </div>

                  {/* Gravity slider (maintained from play phase) */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Base Gravity Level</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {gravityLevel.toFixed(2)}g
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={gravityLevel * 100}
                      onChange={(e) => setGravityLevel(parseInt(e.target.value) / 100)}
                      onInput={(e) => setGravityLevel(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Gravity Level"
                      style={sliderStyle(colors.accent, gravityLevel * 100, 0, 100)}
                    />
                  </div>

                  {/* Combined stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>
                        {(vibrationLevel * 1000).toFixed(1)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>G-jitter (×10⁻³g)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: calculateVibrationImpact(vibrationLevel) > 60 ? colors.success : colors.error }}>
                        {calculateVibrationImpact(vibrationLevel).toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Vibration Quality</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: (calculateVibrationImpact(vibrationLevel) * crystalQuality / 100) > 60 ? colors.success : colors.error }}>
                        {(calculateVibrationImpact(vibrationLevel) * crystalQuality / 100).toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Combined Quality</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vibration sources info */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Common Vibration Sources on ISS
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { source: 'Coolant pumps', level: '10⁻⁴g', freq: '50-100 Hz' },
                  { source: 'Crew exercise', level: '10⁻³g', freq: '1-5 Hz' },
                  { source: 'Reaction wheels', level: '10⁻⁵g', freq: '10-50 Hz' },
                  { source: 'Docking events', level: '10⁻²g', freq: 'Transient' },
                ].map((item, i) => (
                  <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{item.source}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Level: {item.level}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Freq: {item.freq}</div>
                  </div>
                ))}
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Deep Understanding
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              Vibration Isolation: The Critical Solution
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {twistPrediction === 'b'
                ? 'Correct! Even in microgravity, vibrations as small as 10⁻⁶g can disrupt crystal growth. Active vibration isolation platforms are essential for high-quality manufacturing in orbit.'
                : 'Your prediction revealed the surprising truth — microgravity alone isn\'t enough. The vibration environment on a spacecraft is a major engineering challenge that requires sophisticated isolation technology.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Active Rack Isolation System (ARIS)
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '12px' }}>
                  NASA developed the <span style={{ color: colors.accent }}>Active Rack Isolation System (ARIS)</span> to protect sensitive experiments. ARIS uses electromagnetic actuators to counteract vibrations in real-time, reducing g-jitter by a factor of 1000x.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  The system measures accelerations with ultra-sensitive accelerometers and applies equal-and-opposite forces through voice-coil actuators — like noise-canceling headphones, but for mechanical vibration.
                </p>
                <p>
                  Future orbital factories will need <span style={{ color: colors.warning }}>industrial-scale isolation</span> that can handle the thermal loads and mass of manufacturing equipment while maintaining sub-micro-g vibration levels.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Why This Matters for Scaling Up
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Moving from ISS-scale experiments (a few grams) to factory-scale production (kilograms to tons) means the vibration isolation challenge grows enormously. Larger masses require larger actuators, and industrial processes generate their own vibrations. This is one of the key engineering challenges that must be solved before orbital factories become commercially viable.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Key Insight
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Microgravity manufacturing requires two things: eliminating gravity AND controlling vibration. Getting to orbit solves the first problem, but the second requires ongoing engineering innovation. The best space factories will be those that achieve the quietest vibration environments while operating at industrial scale.
              </p>
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Real-World Applications
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
        conceptName="E L O N_ Orbital Factory"
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
                      // Auto-advance to next uncompleted app, or to test if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1 && newCompleted.every(c => c)) {
                        setTimeout(() => goToPhase('test'), 400);
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
              ← Back
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
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand microgravity manufacturing and its revolutionary potential!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Orbital Manufacturing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of microgravity manufacturing to real-world scenarios. Consider convection elimination, containerless processing, crystal nucleation, Marangoni flow, vibration isolation, and the economics of in-space production as you work through each problem.
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
                ← Previous
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
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Orbital Factory Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why microgravity enables perfect materials, how convection elimination transforms manufacturing, and why vibration isolation is the critical engineering challenge.
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
                'Microgravity eliminates buoyancy-driven convection',
                'Containerless processing avoids contamination',
                'Surface tension creates perfect spheres without gravity',
                'ZBLAN fiber optics: 100x better in space',
                'G-jitter requires active vibration isolation',
                'Scaling from ISS to Starship-class factories',
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

export default ELON_OrbitalFactoryRenderer;
