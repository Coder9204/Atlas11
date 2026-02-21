import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// GAME 111: STICK-SLIP EARTHQUAKES
// The sudden release of stored elastic energy when friction breaks
// Demonstrates static vs kinetic friction, energy storage, and seismic events
// ============================================================================

interface StickSlipRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
  onGameEvent?: (event: any) => void;
}

// Color palette with proper contrast
const realWorldApps = [
  {
    icon: '\u{1F30D}',
    title: 'Earthquake Prediction',
    short: 'Understanding seismic cycles through stick-slip',
    tagline: 'The earth builds up stress, then releases',
    description: 'Earthquakes occur when accumulated tectonic stress overcomes fault friction in a sudden slip event. Understanding the stick-slip cycle helps scientists assess seismic hazards and predict future earthquakes.',
    connection: 'Stick-slip mechanics directly model earthquake physics. Faults "stick" for decades as plates push against them, then "slip" catastrophically when stress exceeds static friction.',
    howItWorks: 'GPS and seismometers monitor ground deformation. Paleoseismology dates past earthquakes. Models use static friction to estimate stress accumulation and predict when faults might fail.',
    stats: [
      { value: '500yr', label: 'Major quake cycle', icon: '\u{1F4C5}' },
      { value: 'M9.0', label: 'Max subduction quake', icon: '\u{1F4CA}' },
      { value: '3cm/yr', label: 'Typical plate motion', icon: '\u{1F30F}' }
    ],
    examples: ['San Andreas Fault', 'Japan Trench', 'Himalayan Front', 'Cascadia Subduction'],
    companies: ['USGS', 'Japan Meteorological Agency', 'GeoNet', 'UNAVCO'],
    futureImpact: 'Dense sensor networks and AI will enable better forecasting of earthquake probability, giving communities days to weeks of warning for potential major events.',
    color: '#ef4444'
  },
  {
    icon: '\u{1F3BB}',
    title: 'Bowed String Instruments',
    short: 'Creating music through controlled stick-slip',
    tagline: 'Making strings sing',
    description: 'Violins and cellos produce sound through stick-slip motion between bow and string. Rosin creates the right friction for the bow to alternately grip and release the string at the desired frequency.',
    connection: 'The bow sticks to the string, deflecting it until kinetic friction takes over and it slips back. This cycle repeats hundreds of times per second, driving the string vibration.',
    howItWorks: 'Rosin increases static friction between horsehair and string. The Helmholtz motion creates a kink that travels along the string. Bow pressure and speed control tone quality.',
    stats: [
      { value: '440Hz', label: 'A string frequency', icon: '\u{1F3B5}' },
      { value: '100g', label: 'Typical bow pressure', icon: '\u{2696}' },
      { value: '0.5m/s', label: 'Bow speed', icon: '\u{1F3C3}' }
    ],
    examples: ['Violin technique', 'Cello bowing', 'Bass fiddle', 'Chinese erhu'],
    companies: ['Stradivari', 'Pirastro', 'Thomastik-Infeld', "D'Addario"],
    futureImpact: 'Robotic bowing systems will enable new musical instruments and help train students by precisely reproducing the stick-slip dynamics of master musicians.',
    color: '#f59e0b'
  },
  {
    icon: '\u{1F697}',
    title: 'Brake Squeal',
    short: 'Unwanted stick-slip in braking systems',
    tagline: 'When friction makes noise',
    description: 'Brake squeal occurs when stick-slip motion between brake pads and rotors excites resonant frequencies in the brake assembly. Engineers work to eliminate this annoying phenomenon.',
    connection: 'The negative slope of friction vs. velocity can cause instability. When friction drops as speed increases, stick-slip oscillations grow into audible squealing.',
    howItWorks: 'Pad material alternates between sticking and slipping on the rotor. This self-excited vibration couples to structural resonances. Chamfers, shims, and special compounds reduce squeal.',
    stats: [
      { value: '1-16kHz', label: 'Squeal frequency', icon: '\u{1F50A}' },
      { value: '-$1B', label: 'Annual warranty costs', icon: '\u{1F4B0}' },
      { value: '0.35', label: 'Target friction coefficient', icon: '\u{1F4CA}' }
    ],
    examples: ['Automotive disc brakes', 'Motorcycle brakes', 'Industrial machinery', 'Aircraft landing gear'],
    companies: ['Brembo', 'Akebono', 'Federal-Mogul', 'TMD Friction'],
    futureImpact: 'Active noise cancellation and smart brake materials will eliminate squeal by dynamically adjusting friction characteristics based on real-time vibration sensing.',
    color: '#3b82f6'
  },
  {
    icon: '\u{1F3D4}',
    title: 'Glacier Movement',
    short: 'Ice stick-slip on continental scale',
    tagline: 'When ice rivers suddenly surge',
    description: 'Glaciers exhibit stick-slip behavior, alternating between periods of slow creep and sudden surges. Understanding this helps predict ice sheet collapse and sea level rise.',
    connection: 'Glacial ice sticks to bedrock through frozen debris and pressure, then slips when meltwater lubricates the base. This creates episodic motion similar to earthquake fault behavior.',
    howItWorks: 'Basal friction depends on temperature, water pressure, and sediment type. GPS measures surface velocity. Seismometers detect "icequakes" during slip events. Models predict future behavior.',
    stats: [
      { value: '10km/yr', label: 'Surge velocity', icon: '\u{1F3C3}' },
      { value: 'M7', label: 'Largest glacial quake', icon: '\u{1F4CA}' },
      { value: '3m/yr', label: 'Potential sea rise', icon: '\u{1F30A}' }
    ],
    examples: ['Antarctic ice streams', 'Greenland outlet glaciers', 'Alaskan tidewater glaciers', 'Himalayan surge glaciers'],
    companies: ['NASA', 'British Antarctic Survey', 'Alfred Wegener Institute', 'NOAA'],
    futureImpact: 'Satellite monitoring and improved friction models will help predict catastrophic glacier collapse events, providing critical input for climate adaptation planning.',
    color: '#8b5cf6'
  }
];

const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast (brightness >= 180)

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Rock/earth colors
  rockLight: '#78716c',
  rockDark: '#44403c',
  rockHighlight: '#a8a29e',
  fault: '#dc2626',

  // Stress colors
  stressLow: '#22c55e',
  stressMedium: '#f59e0b',
  stressHigh: '#ef4444',

  // Energy colors
  stored: '#3b82f6',
  released: '#f97316',

  // UI colors
  accent: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const StickSlipRenderer: React.FC<StickSlipRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
  onGameEvent,
}) => {
  // ==================== STATE ====================
  const [internalPhase, setInternalPhase] = useState('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [drivingForce, setDrivingForce] = useState(65); // 0-100 (tectonic plate movement)
  const [frictionStrength, setFrictionStrength] = useState(55); // 0-100
  const [surfaceRoughness, setSurfaceRoughness] = useState(45); // 0-100

  // Simulation state
  const [stress, setStress] = useState(0);
  const [isSlipping, setIsSlipping] = useState(false);
  const [slipHistory, setSlipHistory] = useState<Array<{ time: number; magnitude: number }>>([]);
  const [displacement, setDisplacement] = useState(0);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [selectedApp, setSelectedApp] = useState(0);

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testQuestion, setTestQuestion] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const { isMobile } = useViewport();
// Phase management
  const phase = gamePhase || phaseProp || internalPhase;
  const validPhases = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
  const phaseLabels: Record<string, string> = {
    hook: 'Introduction',
    predict: 'Prediction',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Complete',
  };

  const advancePhase = () => {
    const idx = validPhases.indexOf(phase as typeof validPhases[number]);
    const nextPhase = validPhases[Math.min(idx + 1, validPhases.length - 1)];
    setInternalPhase(nextPhase);
    onPhaseComplete?.();
  };
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

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateStaticFriction = useCallback(() => {
    // Static friction coefficient depends on surface roughness
    return 0.5 + (surfaceRoughness / 100) * 0.4 + (frictionStrength / 100) * 0.3;
  }, [surfaceRoughness, frictionStrength]);

  const calculateKineticFriction = useCallback(() => {
    // Kinetic friction is always less than static
    return calculateStaticFriction() * 0.7;
  }, [calculateStaticFriction]);

  const calculateBreakThreshold = useCallback(() => {
    // Stress level at which static friction breaks
    return calculateStaticFriction() * 100;
  }, [calculateStaticFriction]);

  // ==================== ANIMATION LOOP ====================
  // Only run animation in play phases (not test/transfer/mastery to avoid act() warnings)
  useEffect(() => {
    if (!isAnimating) return;
    if (phase !== 'play' && phase !== 'twist_play' && phase !== 'hook') return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      // Stress builds up from tectonic driving force
      const stressRate = (drivingForce / 100) * 0.5;
      const threshold = calculateBreakThreshold();

      setStress(prevStress => {
        const newStress = prevStress + stressRate;

        // Check for slip event
        if (newStress >= threshold && !isSlipping) {
          setIsSlipping(true);
          const magnitude = (newStress / threshold) * (0.5 + Math.random() * 0.5);
          setSlipHistory(prev => [...prev.slice(-9), { time: animationTime, magnitude }]);

          // Displacement during slip
          setDisplacement(prev => prev + magnitude * 5);

          // Release most (but not all) stress
          setTimeout(() => {
            setStress(threshold * 0.2 * Math.random());
            setIsSlipping(false);
          }, 200);

          return newStress;
        }

        return Math.min(newStress, threshold * 1.1);
      });
    }, 50);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, phase, drivingForce, isSlipping]);

  // ==================== PROGRESS BAR ====================
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgCard,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(phase as typeof validPhases[number]) + 1) / validPhases.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.stressHigh})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // ==================== NAVIGATION DOTS ====================
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => advancePhase()}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase as typeof validPhases[number]) >= i ? colors.accent : 'rgba(51, 65, 85, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
          title={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const threshold = calculateBreakThreshold();
    const stressPercent = Math.min(100, (stress / threshold) * 100);
    const staticFriction = calculateStaticFriction();
    const kineticFriction = calculateKineticFriction();

    // Stress color
    const stressColor = stressPercent < 50 ? colors.stressLow
      : stressPercent < 80 ? colors.stressMedium
        : colors.stressHigh;

    // Interactive marker position based on drivingForce slider
    const markerX = 50 + (drivingForce / 100) * 400;
    const markerY = 350 - (drivingForce / 100) * 250;

    // Generate stress-strain path with space-separated coords and >=10 L-commands
    const stressPathPoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const px = 50 + t * 400;
      // Sawtooth-like pattern representing stick-slip cycles
      const cyclePos = (t * 3) % 1;
      const py = 350 - cyclePos * 250 * (drivingForce / 100);
      if (i === 0) {
        stressPathPoints.push(`M ${px.toFixed(1)} ${py.toFixed(1)}`);
      } else {
        stressPathPoints.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
    }
    const stressPath = stressPathPoints.join(' ');

    // Generate friction comparison path
    const frictionPathPoints: string[] = [];
    for (let i = 0; i <= 15; i++) {
      const t = i / 15;
      const px = 50 + t * 400;
      const py = 350 - (staticFriction * t * 180) + Math.sin(t * Math.PI * 4) * 30;
      if (i === 0) {
        frictionPathPoints.push(`M ${px.toFixed(1)} ${py.toFixed(1)}`);
      } else {
        frictionPathPoints.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
    }
    const frictionPath = frictionPathPoints.join(' ');

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 500 420"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
         role="img" aria-label="Stick Slip visualization">
          <defs>
            <linearGradient id="stslLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <linearGradient id="stslStressMeter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#84cc16" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="stslPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <radialGradient id="stslMarkerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <filter id="stslGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="stslShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="500" height="420" fill="url(#stslLabBg)" />

          {/* Grid lines group */}
          <g opacity="0.5">
            <line x1="50" y1="80" x2="450" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50" y1="140" x2="450" y2="140" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50" y1="200" x2="450" y2="200" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50" y1="260" x2="450" y2="260" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50" y1="320" x2="450" y2="320" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50" y1="350" x2="450" y2="350" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
          </g>

          {/* Title group */}
          <g>
            <text x="250" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold" letterSpacing="0.5">
              Stick-Slip Fault Model
            </text>
            <text x="250" y="46" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              F = {(drivingForce / 10).toFixed(1)} kN | {'\u03BC'}s = {staticFriction.toFixed(2)} | {'\u03BC'}k = {kineticFriction.toFixed(2)}
            </text>
          </g>

          {/* Formula display */}
          <text x="250" y="64" textAnchor="middle" fill="#60a5fa" fontSize="11">
            F = {'\u03BC'}s {'\u00D7'} N | E = {'\u00BD'}k{'\u00D7'}x{'\u00B2'}
          </text>

          {/* Y-axis labels */}
          <text x="22" y="88" fill={colors.textMuted} fontSize="11">High</text>
          <text x="22" y="208" fill={colors.textMuted} fontSize="11">Med</text>
          <text x="22" y="348" fill={colors.textMuted} fontSize="11">Low</text>

          {/* X-axis label */}
          <text x="250" y="374" textAnchor="middle" fill={colors.textMuted} fontSize="11">Time</text>

          {/* Paths group */}
          <g>
            {/* Stress path (sawtooth stick-slip pattern) */}
            <path
              d={stressPath}
              fill="none"
              stroke="url(#stslPathGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Friction comparison path */}
            <path
              d={frictionPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 3"
            />
          </g>

          {/* Threshold lines group */}
          <g>
            {/* Static friction threshold line */}
            <line x1="50" y1={350 - staticFriction * 200} x2="450" y2={350 - staticFriction * 200} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8 4" />
            <text x="458" y={346 - staticFriction * 200} fill="#f59e0b" fontSize="11">
              {'\u03BC'}s
            </text>

            {/* Kinetic friction line */}
            <line x1="50" y1={350 - kineticFriction * 200} x2="450" y2={350 - kineticFriction * 200} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" />
            <text x="458" y={346 - kineticFriction * 200} fill="#22c55e" fontSize="11">
              {'\u03BC'}k
            </text>
          </g>

          {/* Marker glow background */}
          <circle
            cx={markerX}
            cy={markerY}
            r="16"
            fill="url(#stslMarkerGlow)"
          />

          {/* Interactive marker circle that moves with drivingForce slider */}
          <circle
            cx={markerX}
            cy={markerY}
            r="8"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#stslGlowFilter)"
          />

          {/* Friction marker - moves with frictionStrength */}
          <circle
            cx={50 + (frictionStrength / 100) * 400}
            cy={350 - staticFriction * 200}
            r="6"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Roughness indicator - moves with surfaceRoughness */}
          <circle
            cx={50 + (surfaceRoughness / 100) * 400}
            cy={350 - kineticFriction * 200}
            r="5"
            fill="#22c55e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Legend / Comparison labels group */}
          <g>
            <rect x="60" y="384" width="12" height="12" rx="2" fill="#ef4444" />
            <text x="78" y="395" fill="#ef4444" fontSize="11">Current stress</text>
            <rect x="210" y="384" width="12" height="12" rx="2" fill="#3b82f6" />
            <text x="228" y="395" fill="#3b82f6" fontSize="11">Reference baseline</text>
            <rect x="370" y="384" width="12" height="12" rx="2" fill="#f59e0b" />
            <text x="388" y="395" fill="#f59e0b" fontSize="11">Threshold</text>
          </g>

          {/* State indicator */}
          <text x="250" y="412" textAnchor="middle" fill={isSlipping ? "#fca5a5" : "#86efac"} fontSize="12" fontWeight="bold">
            {isSlipping ? "SLIPPING - Earthquake!" : "LOCKED (Stick Phase)"}
          </text>
        </svg>
      </div>
    );
  };

  // ==================== RENDER CONTROLS ====================
  const renderControls = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: colors.bgCard,
      borderRadius: '12px',
      margin: '16px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        Control the Fault:
      </div>

      {/* Tectonic Driving Force */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Tectonic Force: {drivingForce}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={drivingForce}
          onChange={(e) => setDrivingForce(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0 (Min)</span>
          <span>100 (Max)</span>
        </div>
      </div>

      {/* Friction Strength */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Friction Strength: {frictionStrength}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={frictionStrength}
          onChange={(e) => setFrictionStrength(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0 (Min)</span>
          <span>100 (Max)</span>
        </div>
      </div>

      {/* Surface Roughness */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Surface Roughness: {surfaceRoughness}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={surfaceRoughness}
          onChange={(e) => setSurfaceRoughness(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0 (Min)</span>
          <span>100 (Max)</span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => {
          setStress(0);
          setSlipHistory([]);
          setDisplacement(0);
        }}
        style={{
          padding: '10px',
          background: 'rgba(71, 85, 105, 0.5)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Reset Simulation
      </button>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'weak', text: 'The friction is always constant during an earthquake' },
    { id: 'stronger', text: "More friction = smaller earthquakes because energy can't build up" },
    { id: 'threshold', text: 'Friction keeps plates locked until stress exceeds a threshold, then suddenly releases', correct: true },
    { id: 'none', text: "Friction doesn't affect earthquakes at all" },
  ];

  const twistPredictions = [
    { id: 'random', text: "They're completely random and unpredictable" },
    { id: 'regular', text: 'They follow a regular schedule like clockwork' },
    { id: 'pattern', text: 'They follow statistical patterns but timing of individual quakes is unpredictable', correct: true },
    { id: 'seasonal', text: 'They happen more during certain seasons' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What is the difference between static and kinetic friction?',
      options: [
        { id: 'a', text: "They're the same thing" },
        { id: 'b', text: 'Static friction prevents motion; kinetic friction opposes existing motion', correct: true },
        { id: 'c', text: 'Static friction only applies to earthquakes' },
        { id: 'd', text: 'Kinetic friction is always greater' },
      ],
    },
    {
      id: 2,
      question: 'Why does the stress suddenly drop during an earthquake?',
      options: [
        { id: 'a', text: 'The rocks melt' },
        { id: 'b', text: 'Gravity decreases momentarily' },
        { id: 'c', text: 'Static friction breaks and kinetic friction is lower', correct: true },
        { id: 'd', text: 'The plates stop moving' },
      ],
    },
    {
      id: 3,
      question: 'What determines the magnitude of an earthquake?',
      options: [
        { id: 'a', text: 'Only the depth of the fault' },
        { id: 'b', text: 'The amount of stored elastic energy released', correct: true },
        { id: 'c', text: 'The time of day' },
        { id: 'd', text: 'The color of the rocks' },
      ],
    },
    {
      id: 4,
      question: 'Why do faults that have been quiet for a long time often produce larger earthquakes?',
      options: [
        { id: 'a', text: "They don't - quiet faults produce smaller quakes" },
        { id: 'b', text: 'More time to accumulate stress = more energy to release', correct: true },
        { id: 'c', text: 'The rocks get harder over time' },
        { id: 'd', text: "It's just random chance" },
      ],
    },
    {
      id: 5,
      question: 'What everyday phenomenon also demonstrates stick-slip friction?',
      options: [
        { id: 'a', text: 'A squeaking door hinge', correct: true },
        { id: 'b', text: 'Boiling water' },
        { id: 'c', text: 'Light bulb turning on' },
        { id: 'd', text: 'Radio waves' },
      ],
    },
    {
      id: 6,
      question: 'In the stick-slip cycle, what happens during the "stick" phase?',
      options: [
        { id: 'a', text: 'The fault is moving smoothly' },
        { id: 'b', text: 'Elastic strain energy is building up', correct: true },
        { id: 'c', text: 'An earthquake is occurring' },
        { id: 'd', text: 'The plates are moving apart' },
      ],
    },
    {
      id: 7,
      question: "Why can't we predict exactly when an earthquake will occur?",
      options: [
        { id: 'a', text: "We don't try to predict them" },
        { id: 'b', text: "The breaking threshold varies and depends on microscopic details we can't measure", correct: true },
        { id: 'c', text: 'Earthquakes are caused by aliens' },
        { id: 'd', text: "Technology isn't advanced enough to detect faults" },
      ],
    },
    {
      id: 8,
      question: 'How does a violin bow create sound using stick-slip friction?',
      options: [
        { id: 'a', text: "It doesn't involve friction" },
        { id: 'b', text: 'Continuous smooth sliding vibrates the string' },
        { id: 'c', text: 'Repeated stick-slip cycles vibrate the string at audio frequencies', correct: true },
        { id: 'd', text: 'The bow hits the string like a drum' },
      ],
    },
    {
      id: 9,
      question: 'What is the role of asperities (bumps) on fault surfaces?',
      options: [
        { id: 'a', text: 'They have no effect' },
        { id: 'b', text: 'They smooth out over time' },
        { id: 'c', text: 'They grip together and resist movement until they snap apart', correct: true },
        { id: 'd', text: 'They cause the earth to heat up' },
      ],
    },
    {
      id: 10,
      question: 'If you could reduce the friction on a fault, what would likely happen?',
      options: [
        { id: 'a', text: 'Larger but less frequent earthquakes' },
        { id: 'b', text: 'More frequent but smaller earthquakes or smooth creeping', correct: true },
        { id: 'c', text: 'No change in earthquake patterns' },
        { id: 'd', text: 'The fault would stop completely' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = realWorldApps;

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showBack: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '12px 20px',
      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      zIndex: 1000,
      minHeight: '72px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    }}>
      {showBack ? (
        <button
          onClick={() => advancePhase()}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            backgroundColor: 'rgba(51, 65, 85, 0.5)',
            color: colors.textPrimary,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '48px',
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>
      ) : <div />}

      <button
        onClick={() => advancePhase()}
        disabled={!buttonEnabled}
        style={{
          padding: '14px 28px',
          background: buttonEnabled
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'rgba(71, 85, 105, 0.5)',
          border: 'none',
          borderRadius: '12px',
          color: buttonEnabled ? colors.textPrimary : colors.textSecondary,
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: buttonEnabled ? 'pointer' : 'not-allowed',
          opacity: buttonEnabled ? 1 : 0.5,
          minHeight: '52px',
          minWidth: '160px',
          boxShadow: buttonEnabled ? '0 4px 15px rgba(239, 68, 68, 0.3)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // ==================== OUTER WRAPPER ====================
  const outerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: theme.fontFamily,
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    color: colors.textPrimary,
  };

  const scrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto' as const,
    paddingTop: '60px',
    paddingBottom: '16px',
  };

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Discover: The Earth's Stutter
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '8px', lineHeight: '1.5' }}>
              Game 111: Stick-Slip Earthquakes
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: '1.5' }}>
              Welcome! Let's explore how friction causes earthquakes.
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
                Try This: Run Your Finger Across Glass
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
                Press your finger on a window and drag it slowly. Feel that stuttering vibration?
                Hear the squeak? That's <strong style={{ color: colors.fault }}>stick-slip friction</strong>
                {' '}- the exact same physics that causes earthquakes! This concept is important because
                it explains how energy builds up and is suddenly released in natural systems.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
                Same Physics, <span style={{ color: colors.accent }}>Different Scale</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                From squeaky door hinges to violin music to devastating earthquakes - they're all
                caused by friction that "sticks" until stress builds up, then suddenly "slips"
                and releases energy.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, "Start Exploring")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          {/* 1. STATIC GRAPHIC FIRST */}
          {renderVisualization(false)}

          {/* 2. WHAT YOU'RE LOOKING AT */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is a <strong>cross-section of a fault line</strong>. The top rock block is being
              pushed by tectonic forces (the driving force). Friction along the
              <span style={{ color: colors.fault }}> red fault line</span> resists motion. The
              <span style={{ color: colors.stored }}> spring</span> represents elastic strain energy
              building up in the rocks.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', lineHeight: '1.6' }}>
              <strong>mu</strong> is the friction coefficient. Static mu keeps things locked;
              kinetic mu applies once sliding begins.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px', maxWidth: '800px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.3' }}>
              How does friction relate to earthquakes?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    onPredictionMade?.(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #f87171' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '44px',
                    lineHeight: '1.5',
                  }}
                >
                  {p.text}
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
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Create Your Own Earthquakes!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
              Adjust the sliders to change fault parameters and observe how the fault behavior changes.
              This matters because understanding friction helps us predict real seismic events.
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

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              What to Watch For:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Watch how stress builds up - notice when the stress meter approaches the threshold</li>
              <li>Observe the sudden slip events - see how the fault unlocks and releases energy</li>
              <li>Pay attention to the seismograph - each spike represents an earthquake</li>
              <li>Notice that kinetic friction is less than static friction during slip events</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '\u{1F3AF}' : '\u{1F4A1}'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
              fontWeight: 'bold',
              lineHeight: '1.3',
            }}>
              {isCorrect ? 'Excellent Understanding!' : 'Interesting Thinking!'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
              You predicted: "{selectedPrediction?.text || 'No prediction made'}"
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              <strong style={{ color: colors.stressLow }}>Static friction</strong> is like a lock -
              it keeps the fault plates stuck together while elastic strain energy builds up in
              the surrounding rock. When the stress exceeds the friction threshold...
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              <strong style={{ color: colors.released }}>SNAP!</strong> The fault breaks loose.
              But here's the key: <strong style={{ color: colors.accent }}>kinetic friction is
              lower than static friction</strong>. Once sliding starts, it takes less force to
              keep it going. This allows rapid, violent slip - an earthquake!
            </p>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                The earthquake magnitude depends on how much elastic energy was stored before
                the slip. Longer quiet periods = more stored energy = bigger potential earthquake.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
              Can we predict earthquakes?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              The Prediction Problem:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              If earthquakes follow a physical mechanism (stick-slip), shouldn't we be able to
              predict exactly when they'll occur? We know stress is building. We know where the
              faults are. So why can't seismologists predict earthquakes?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px', maxWidth: '800px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.3' }}>
              Why can't we predict exactly when earthquakes occur?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '44px',
                    lineHeight: '1.5',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Learn The Truth')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Exploring Predictability
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
              Watch the earthquake timing patterns
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

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Watch the earthquake history - is timing regular?</li>
              <li>Notice the slight variation in magnitude</li>
              <li>The threshold varies slightly each time</li>
              <li>We know roughly when, but not exactly when</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See The Full Picture')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '\u{1F3AF}' : '\u{1F92F}'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
              fontWeight: 'bold',
              lineHeight: '1.3',
            }}>
              {isCorrect ? 'Scientific Insight!' : 'The Prediction Paradox!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Statistical Patterns, Not Schedules:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Earthquakes follow statistical patterns - we can say things like "there's a 30%
              chance of a major earthquake in the next 30 years." But the <strong style={{ color: colors.warning }}>
              exact timing</strong> is unpredictable because:
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Fault surfaces have microscopic variations</li>
              <li>Stress isn't perfectly uniform</li>
              <li>Small earthquakes can trigger (or delay) larger ones</li>
              <li>We can't directly measure stress deep underground</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              What We CAN Predict:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              <strong>Where:</strong> We know fault locations well<br />
              <strong>How big (maximum):</strong> Fault length limits magnitude<br />
              <strong>Probability:</strong> Statistical likelihood over decades<br />
              <strong>After first shake:</strong> Aftershock patterns are more predictable
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Stick Slip"
        applications={realWorldApps}
        onComplete={() => nextPhase()}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
              App {Math.min(transferCompleted.size + 1, transferApplications.length)} of {transferApplications.length} - Explore all to continue
            </p>
          </div>

          {transferApplications.map((app, idx) => (
            <div
              key={idx}
              style={{
                background: transferCompleted.has(idx)
                  ? 'rgba(16, 185, 129, 0.1)'
                  : colors.bgCard,
                border: transferCompleted.has(idx)
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                maxWidth: '800px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0, fontWeight: 'bold', lineHeight: '1.3' }}>
                  {app.icon} {app.title}
                </h3>
                {transferCompleted.has(idx) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>Completed</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>

              {/* Stats for each app */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                {app.stats.map((stat, si) => (
                  <div key={si} style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'center',
                    flex: '1',
                    minWidth: '80px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  }}>
                    <div style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '10px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTransferCompleted(prev => new Set([...prev, idx]));
                }}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: transferCompleted.has(idx)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                {transferCompleted.has(idx) ? 'Got It' : 'Got It'}
              </button>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test' : `Explore ${transferApplications.length - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={outerStyle}>
          {renderProgressBar()}
          <div style={scrollStyle}>
            {renderNavDots()}
            <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '\u{1F3C6}' : score >= 60 ? '\u{1F4DA}' : '\u{1F4AA}'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: '1.5' }}>
                You scored {correctCount}/{testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrectAnswer = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCorrectAnswer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCorrectAnswer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                    maxWidth: '800px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: isCorrectAnswer ? colors.success : colors.error, fontSize: '16px' }}>
                      {isCorrectAnswer ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Question {idx + 1} of {testQuestions.length}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                    {q.question}
                  </p>
                  {!isCorrectAnswer && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0, lineHeight: '1.5' }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete!' : 'Review & Continue')}
        </div>
      );
    }

    const optionLabels = ['A', 'B', 'C', 'D'];
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = currentQ ? testAnswers[currentQ.id] : undefined;
    const hasSelected = selectedAnswer !== undefined;

    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3', textAlign: 'center' }}>
              Stick-Slip Earthquake Knowledge Check
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
              Test your understanding of stick-slip friction, earthquake mechanics, elastic energy storage, static vs kinetic friction transitions, and how these principles apply to real-world seismic phenomena and engineering applications.
            </p>

            {/* Question counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: colors.textSecondary }}>Question</span>
                <span style={{ fontSize: '28px', fontWeight: 800, color: colors.accent }}>{testQuestion + 1}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: colors.textPrimary }}>of {testQuestions.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === testQuestion ? colors.accent : testAnswers[testQuestions[i].id] !== undefined ? colors.success : '#334155',
                  }} />
                ))}
              </div>
            </div>

            {/* Question text */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, color: colors.textPrimary, marginBottom: '20px' }}>
              {currentQ.question}
            </h3>

            {/* Answer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {currentQ.options.map((option, i) => {
                const isSelected = selectedAnswer === option.id;
                let borderColor = 'rgba(148, 163, 184, 0.2)';
                let bgColor = 'rgba(51, 65, 85, 0.5)';
                if (showExplanation) {
                  if (option.correct) { borderColor = colors.success; bgColor = 'rgba(16, 185, 129, 0.15)'; }
                  else if (isSelected && !option.correct) { borderColor = colors.error; bgColor = 'rgba(239, 68, 68, 0.15)'; }
                } else if (isSelected) {
                  borderColor = colors.accent; bgColor = 'rgba(239, 68, 68, 0.15)';
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (!showExplanation) {
                        setTestAnswers(prev => ({ ...prev, [currentQ.id]: option.id }));
                      }
                    }}
                    disabled={showExplanation}
                    style={{
                      padding: '14px 16px',
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px',
                      color: colors.textPrimary,
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: showExplanation ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      lineHeight: '1.5',
                    }}
                  >
                    {optionLabels[i]}) {option.text}
                  </button>
                );
              })}
            </div>

            {/* Explanation after confirming */}
            {showExplanation && (
              <div style={{
                background: selectedAnswer === currentQ.options.find(o => o.correct)?.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${selectedAnswer === currentQ.options.find(o => o.correct)?.id ? colors.success : colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: selectedAnswer === currentQ.options.find(o => o.correct)?.id ? colors.success : colors.error, margin: 0 }}>
                  {selectedAnswer === currentQ.options.find(o => o.correct)?.id ? 'Correct!' : `Incorrect - the answer is: ${currentQ.options.find(o => o.correct)?.text}`}
                </p>
              </div>
            )}

            {/* Navigation button */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (!showExplanation && hasSelected) {
                    setShowExplanation(true);
                  } else if (showExplanation && testQuestion < testQuestions.length - 1) {
                    setTestQuestion(testQuestion + 1);
                    setShowExplanation(false);
                  } else if (showExplanation && testQuestion === testQuestions.length - 1) {
                    setTestSubmitted(true);
                    onGameEvent?.({ type: 'game_completed', details: { score: testScore, total: testQuestions.length } });
                  }
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: showExplanation && testQuestion === testQuestions.length - 1
                    ? 'linear-gradient(135deg, #10b981, #0d9488)'
                    : (hasSelected || showExplanation)
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(71, 85, 105, 0.5)',
                  color: colors.textPrimary,
                  cursor: (hasSelected || showExplanation) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: '16px',
                  opacity: (hasSelected || showExplanation) ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                }}
              >
                {showExplanation
                  ? testQuestion === testQuestions.length - 1
                    ? 'Submit Test'
                    : 'Next Question'
                  : 'Confirm Answer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderNavDots()}
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>{'\u{1F3C6}'}</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Seismology Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px', lineHeight: '1.5' }}>
              You've mastered earthquake physics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', fontWeight: 'bold', lineHeight: '1.3' }}>
              What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Static friction locks faults until threshold</li>
              <li>Kinetic friction is less than static friction, allowing sudden slip</li>
              <li>Longer quiet periods = more stored energy</li>
              <li>Same physics: earthquakes to violin music</li>
              <li>Statistical prediction possible, exact timing isn't</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)',
            maxWidth: '800px',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>
              Feel It Around You:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Run your finger across a window pane, listen to a squeaky door, or watch a violin
              bow - you're now seeing the same stick-slip physics that shapes our planet's
              surface! Next time you hear about an earthquake, you'll understand the fundamental
              mechanism that caused it.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  // Default fallback - render hook phase
  return (
    <div style={outerStyle}>
      {renderProgressBar()}
      <div style={scrollStyle}>
        {renderNavDots()}
        <div style={{ padding: '20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px', fontWeight: 'bold', lineHeight: '1.3' }}>
            Discover: The Earth's Stutter
          </h1>
          <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '8px', lineHeight: '1.5' }}>
            Game 111: Stick-Slip Earthquakes
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: '1.5' }}>
            Welcome! Let's explore how friction causes earthquakes.
          </p>
        </div>
        {renderVisualization(false)}
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
              Stick-slip friction causes earthquakes. Press your finger on glass and drag slowly -
              that stuttering vibration uses the exact same physics!
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(false, true, "Start Exploring")}
    </div>
  );
};

export default StickSlipRenderer;
