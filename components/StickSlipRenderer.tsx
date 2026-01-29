import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 111: STICK-SLIP EARTHQUAKES
// The sudden release of stored elastic energy when friction breaks
// Demonstrates static vs kinetic friction, energy storage, and seismic events
// ============================================================================

interface StickSlipRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

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
  phase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [drivingForce, setDrivingForce] = useState(50); // 0-100 (tectonic plate movement)
  const [frictionStrength, setFrictionStrength] = useState(50); // 0-100
  const [surfaceRoughness, setSurfaceRoughness] = useState(50); // 0-100

  // Simulation state
  const [stress, setStress] = useState(0);
  const [isSlipping, setIsSlipping] = useState(false);
  const [slipHistory, setSlipHistory] = useState<Array<{ time: number; magnitude: number }>>([]);
  const [displacement, setDisplacement] = useState(0);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

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
  useEffect(() => {
    if (!isAnimating) return;

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
  }, [isAnimating, drivingForce, calculateBreakThreshold, isSlipping, animationTime]);

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

    // Displacement visualization
    const topBlockOffset = isSlipping ? (Math.sin(animationTime * 50) * 3) : 0;
    const bottomBlockOffset = isSlipping ? (-Math.sin(animationTime * 50) * 3) : 0;

    // Stored elastic energy visualization
    const storedEnergy = stress / threshold;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Rock texture patterns */}
            <pattern id="rockPatternTop" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill={colors.rockLight} />
              <circle cx="5" cy="5" r="2" fill={colors.rockHighlight} opacity="0.3" />
              <circle cx="15" cy="15" r="3" fill={colors.rockDark} opacity="0.3" />
            </pattern>

            <pattern id="rockPatternBottom" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill={colors.rockDark} />
              <circle cx="10" cy="5" r="2" fill={colors.rockHighlight} opacity="0.3" />
              <circle cx="3" cy="15" r="3" fill={colors.rockLight} opacity="0.3" />
            </pattern>

            {/* Stress gradient */}
            <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.stressLow} />
              <stop offset="50%" stopColor={colors.stressMedium} />
              <stop offset="100%" stopColor={colors.stressHigh} />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Stick-Slip Fault Model
          </text>

          {/* Cross-section view */}
          <g transform="translate(50, 50)">
            {/* Ground surface indicator */}
            <line x1="0" y1="0" x2="300" y2="0" stroke={colors.textMuted} strokeWidth="2" />
            <text x="150" y="-8" textAnchor="middle" fill={colors.textMuted} fontSize="10">
              Surface
            </text>

            {/* Top block (moving right) */}
            <g transform={`translate(${topBlockOffset + displacement * 0.5}, 0)`}>
              <rect
                x="0"
                y="5"
                width="300"
                height="80"
                fill="url(#rockPatternTop)"
                stroke={colors.rockHighlight}
                strokeWidth="1"
              />

              {/* Driving force arrow */}
              <path
                d={`M 320,45 L ${340 + drivingForce / 5},45`}
                fill="none"
                stroke={colors.stored}
                strokeWidth="3"
              />
              <polygon
                points={`${340 + drivingForce / 5},40 ${350 + drivingForce / 5},45 ${340 + drivingForce / 5},50`}
                fill={colors.stored}
              />
              <text x="330" y="35" fill={colors.stored} fontSize="9">Force</text>

              {/* Elastic strain visualization (compressed spring) */}
              <g transform="translate(-30, 30)">
                {[0, 1, 2, 3, 4].map(i => {
                  const compression = storedEnergy * 0.7;
                  const x = i * (6 - compression * 3);
                  return (
                    <line
                      key={i}
                      x1={x}
                      y1={i % 2 === 0 ? 0 : 20}
                      x2={x + (6 - compression * 3)}
                      y2={i % 2 === 0 ? 20 : 0}
                      stroke={stressColor}
                      strokeWidth="2"
                    />
                  );
                })}
              </g>
            </g>

            {/* Fault line */}
            <line
              x1="0"
              y1="85"
              x2="300"
              y2="85"
              stroke={isSlipping ? colors.released : colors.fault}
              strokeWidth={isSlipping ? 6 : 3}
              strokeDasharray={isSlipping ? "none" : "10,5"}
            />

            {/* Slip indicator */}
            {isSlipping && (
              <g>
                <text x="150" y="95" textAnchor="middle" fill={colors.released} fontSize="12" fontWeight="bold">
                  ⚡ SLIP! ⚡
                </text>
                {/* Seismic waves */}
                {[0, 1, 2].map(i => {
                  const waveRadius = 20 + i * 20 + (animationTime % 1) * 30;
                  return (
                    <circle
                      key={i}
                      cx="150"
                      cy="85"
                      r={waveRadius}
                      fill="none"
                      stroke={colors.released}
                      strokeWidth="2"
                      opacity={0.5 - i * 0.15}
                    />
                  );
                })}
              </g>
            )}

            {/* Bottom block (stationary reference) */}
            <g transform={`translate(${bottomBlockOffset}, 0)`}>
              <rect
                x="0"
                y="90"
                width="300"
                height="80"
                fill="url(#rockPatternBottom)"
                stroke={colors.rockDark}
                strokeWidth="1"
              />

              {/* Fixed anchor indicator */}
              <text x="-20" y="130" fill={colors.textMuted} fontSize="10">⚓</text>
            </g>

            {/* Friction indicators at fault */}
            {!isSlipping && (
              <g>
                {[0, 1, 2, 3, 4].map(i => (
                  <g key={i} transform={`translate(${30 + i * 60}, 85)`}>
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke={colors.textMuted} strokeWidth="1" />
                    <line x1="5" y1="-5" x2="-5" y2="5" stroke={colors.textMuted} strokeWidth="1" />
                  </g>
                ))}
              </g>
            )}
          </g>

          {/* Stress meter */}
          <g transform="translate(20, 230)">
            <rect x="0" y="0" width="170" height="55" fill={colors.bgCard} rx="6" />
            <text x="85" y="15" textAnchor="middle" fill={colors.textMuted} fontSize="10">
              Stress Level
            </text>
            <rect x="10" y="22" width="150" height="12" fill="rgba(71, 85, 105, 0.5)" rx="6" />
            <rect
              x="10"
              y="22"
              width={150 * (stressPercent / 100)}
              height="12"
              fill={stressColor}
              rx="6"
            />
            <text x="85" y="48" textAnchor="middle" fill={colors.textPrimary} fontSize="11">
              {stressPercent.toFixed(0)}% of threshold
            </text>
          </g>

          {/* Friction info */}
          <g transform="translate(210, 230)">
            <rect x="0" y="0" width="170" height="55" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Static μ:</text>
            <text x="70" y="15" fill={colors.textPrimary} fontSize="9">{staticFriction.toFixed(2)}</text>
            <text x="100" y="15" fill={colors.textMuted} fontSize="9">Kinetic μ:</text>
            <text x="155" y="15" fill={colors.textPrimary} fontSize="9">{kineticFriction.toFixed(2)}</text>

            <text x="85" y="32" textAnchor="middle" fill={colors.textMuted} fontSize="9">
              Status:
            </text>
            <text
              x="85"
              y="48"
              textAnchor="middle"
              fill={isSlipping ? colors.released : colors.stored}
              fontSize="12"
              fontWeight="bold"
            >
              {isSlipping ? '🔴 SLIPPING' : '🟢 LOCKED'}
            </text>
          </g>

          {/* Slip history (seismograph) */}
          <g transform="translate(20, 295)">
            <rect x="0" y="0" width="360" height="50" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Earthquake History:</text>

            {/* Seismograph trace */}
            <line x1="10" y1="35" x2="350" y2="35" stroke={colors.textMuted} strokeWidth="1" />

            {slipHistory.map((slip, i) => {
              const x = 30 + i * 35;
              const height = slip.magnitude * 15;
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={35}
                    x2={x}
                    y2={35 - height}
                    stroke={colors.accent}
                    strokeWidth="3"
                  />
                  <text x={x} y={45} textAnchor="middle" fill={colors.textMuted} fontSize="7">
                    M{slip.magnitude.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {slipHistory.length === 0 && (
              <text x="180" y="38" textAnchor="middle" fill={colors.textMuted} fontSize="10">
                No earthquakes yet...
              </text>
            )}
          </g>
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
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        🎮 Control the Fault:
      </div>

      {/* Tectonic Driving Force */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🌍 Tectonic Force: {drivingForce}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={drivingForce}
          onChange={(e) => setDrivingForce(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Slow (rare quakes)</span>
          <span>Fast (frequent quakes)</span>
        </div>
      </div>

      {/* Friction Strength */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🔒 Friction Strength: {frictionStrength}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={frictionStrength}
          onChange={(e) => setFrictionStrength(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Weak (smaller quakes)</span>
          <span>Strong (bigger quakes)</span>
        </div>
      </div>

      {/* Surface Roughness */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Surface Roughness: {surfaceRoughness}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={surfaceRoughness}
          onChange={(e) => setSurfaceRoughness(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Smooth</span>
          <span>Rough</span>
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
        }}
      >
        🔄 Reset Simulation
      </button>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'weak', text: 'The friction is always constant during an earthquake' },
    { id: 'stronger', text: 'More friction = smaller earthquakes because energy can\'t build up' },
    { id: 'threshold', text: 'Friction keeps plates locked until stress exceeds a threshold, then suddenly releases', correct: true },
    { id: 'none', text: 'Friction doesn\'t affect earthquakes at all' },
  ];

  const twistPredictions = [
    { id: 'random', text: 'They\'re completely random and unpredictable' },
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
        { id: 'a', text: 'They\'re the same thing' },
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
        { id: 'a', text: 'They don\'t - quiet faults produce smaller quakes' },
        { id: 'b', text: 'More time to accumulate stress = more energy to release', correct: true },
        { id: 'c', text: 'The rocks get harder over time' },
        { id: 'd', text: 'It\'s just random chance' },
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
      question: 'Why can\'t we predict exactly when an earthquake will occur?',
      options: [
        { id: 'a', text: 'We don\'t try to predict them' },
        { id: 'b', text: 'The breaking threshold varies and depends on microscopic details we can\'t measure', correct: true },
        { id: 'c', text: 'Earthquakes are caused by aliens' },
        { id: 'd', text: 'Technology isn\'t advanced enough to detect faults' },
      ],
    },
    {
      id: 8,
      question: 'How does a violin bow create sound using stick-slip friction?',
      options: [
        { id: 'a', text: 'It doesn\'t involve friction' },
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
        { id: 'c', text: 'They interlock and resist sliding until they break', correct: true },
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
  const transferApplications = [
    {
      id: 0,
      title: '🎻 Violin Bowing',
      description: 'A violin bow creates sound through thousands of tiny stick-slip events per second! Rosin increases friction so the bow "sticks" to the string, then releases, vibrating the string at audible frequencies.',
      insight: 'Professional violinists control the speed and pressure to vary the stick-slip frequency - that\'s how they play different notes and dynamics.',
    },
    {
      id: 1,
      title: '🚗 Brake Squeal',
      description: 'That annoying squeal from car brakes is stick-slip friction between the brake pad and rotor. The pad catches, releases, catches, releases - thousands of times per second, creating high-pitched sound.',
      insight: 'Engineers design brake pads with specific materials to minimize stick-slip and prevent squealing while maintaining stopping power.',
    },
    {
      id: 2,
      title: '🚪 Squeaky Hinges',
      description: 'A squeaky door hinge demonstrates stick-slip perfectly. The metal surfaces catch and release, creating that characteristic sound. Oil smooths the motion, eliminating the stick-slip cycle.',
      insight: 'The squeak frequency tells you about the friction coefficient and contact pressure - you can "tune" a squeak by changing the door\'s weight!',
    },
    {
      id: 3,
      title: '🏔️ Induced Seismicity',
      description: 'Injecting fluids into the ground (for wastewater disposal or fracking) can trigger earthquakes by reducing friction on faults. Understanding stick-slip helps predict and manage this risk.',
      insight: 'The 2011 Prague, Oklahoma earthquake (M 5.7) was likely triggered by wastewater injection - showing how changing friction can release stored tectonic stress.',
    },
  ];

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 20px',
      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      zIndex: 1000,
    }}>
      {showButton && (
        <button
          onClick={() => onPhaseComplete?.()}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: buttonEnabled
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '12px',
            color: buttonEnabled ? colors.textPrimary : colors.textMuted,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: buttonEnabled ? 'pointer' : 'not-allowed',
            opacity: buttonEnabled ? 1 : 0.5,
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              ⚡ The Earth's Stutter
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 111: Stick-Slip Earthquakes
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '20px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>
                🤯 Try This: Run Your Finger Across Glass
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Press your finger on a window and drag it slowly. Feel that stuttering vibration?
                Hear the squeak? That's <strong style={{ color: colors.fault }}>stick-slip friction</strong>
                - the exact same physics that causes earthquakes!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
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
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* 1. STATIC GRAPHIC FIRST */}
          {renderVisualization(false)}

          {/* 2. WHAT YOU'RE LOOKING AT */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📋 What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is a <strong>cross-section of a fault line</strong>. The top rock block is being
              pushed by tectonic forces (the driving force). Friction along the
              <span style={{ color: colors.fault }}> red fault line</span> resists motion. The
              <span style={{ color: colors.stored }}> spring</span> represents elastic strain energy
              building up in the rocks.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              <strong>μ (mu)</strong> is the friction coefficient. Static μ keeps things locked;
              kinetic μ applies once sliding begins.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 How does friction relate to earthquakes?
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
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Create Your Own Earthquakes!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters and watch the fault behavior
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              🎯 Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>High driving force → frequent smaller quakes</li>
              <li>High friction → rare but larger quakes</li>
              <li>Watch the stress meter build up between slips</li>
              <li>Notice: kinetic friction {"<"} static friction</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '💡'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Understanding!' : 'Interesting Thinking!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📚 The Physics Explained:
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
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                The earthquake magnitude depends on how much elastic energy was stored before
                the slip. Longer quiet periods = more stored energy = bigger potential earthquake.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔄 The Stick-Slip Cycle:
            </h3>
            <ol style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li><strong>STICK:</strong> Plates lock, stress builds</li>
              <li><strong>BUILD:</strong> Elastic strain energy accumulates</li>
              <li><strong>BREAK:</strong> Stress exceeds static friction</li>
              <li><strong>SLIP:</strong> Rapid motion, energy released</li>
              <li><strong>STOP:</strong> Kinetic friction slows motion</li>
              <li><strong>REPEAT:</strong> Plates re-lock, cycle begins again</li>
            </ol>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              🌀 Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Can we predict earthquakes?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔮 The Prediction Problem:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              If earthquakes follow a physical mechanism (stick-slip), shouldn't we be able to
              predict exactly when they'll occur? We know stress is building. We know where the
              faults are. So why can't seismologists predict earthquakes?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Why can't we predict exactly when earthquakes occur?
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
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Learn The Truth →')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Exploring Predictability
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the earthquake timing patterns
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              💡 Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Watch the earthquake history - is timing regular?</li>
              <li>Notice the slight variation in magnitude</li>
              <li>The threshold varies slightly each time</li>
              <li>We know roughly when, but not exactly when</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See The Full Picture →')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '🤯'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Scientific Insight!' : 'The Prediction Paradox!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🎲 Statistical Patterns, Not Schedules:
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
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🏆 What We CAN Predict:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              • <strong>Where:</strong> We know fault locations well<br />
              • <strong>How big (maximum):</strong> Fault length limits magnitude<br />
              • <strong>Probability:</strong> Statistical likelihood over decades<br />
              • <strong>After first shake:</strong> Aftershock patterns are more predictable
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore all {transferApplications.length} applications to continue
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
            }}>
              {transferApplications.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: transferCompleted.has(i) ? colors.success : 'rgba(71, 85, 105, 0.5)',
                  }}
                />
              ))}
            </div>
          </div>

          {transferApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => {
                setTransferCompleted(prev => new Set([...prev, app.id]));
              }}
              style={{
                background: transferCompleted.has(app.id)
                  ? 'rgba(16, 185, 129, 0.1)'
                  : colors.bgCard,
                border: transferCompleted.has(app.id)
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  💡 {app.insight}
                </p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
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
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '🏆' : score >= 60 ? '📚' : '💪'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount} of {testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrect = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Q{idx + 1}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete! 🎉' : 'Review & Continue →')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              📝 Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {answeredCount} of {testQuestions.length} answered
            </p>
          </div>

          {testQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {idx + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    style={{
                      padding: '10px 14px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered ? (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            zIndex: 1000,
          }}>
            <button
              onClick={() => setTestSubmitted(true)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          renderBottomBar(false, false, '')
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Seismology Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered earthquake physics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              🎓 What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Static friction locks faults until threshold</li>
              <li>Kinetic friction {"<"} static friction = sudden slip</li>
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
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Feel It Around You:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Run your finger across a window pane, listen to a squeaky door, or watch a violin
              bow - you're now seeing the same stick-slip physics that shapes our planet's
              surface! Next time you hear about an earthquake, you'll understand the fundamental
              mechanism that caused it.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default StickSlipRenderer;
