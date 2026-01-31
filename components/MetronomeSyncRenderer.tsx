import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 116: METRONOME SYNCHRONIZATION
// Multiple metronomes on a movable platform spontaneously synchronize
// Demonstrates coupled oscillators and self-organization
// ============================================================================

interface MetronomeSyncRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  metronome1: '#ef4444',
  metronome2: '#22c55e',
  metronome3: '#3b82f6',
  metronome4: '#f59e0b',
  platform: '#64748b',

  accent: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const MetronomeSyncRenderer: React.FC<MetronomeSyncRendererProps> = ({
  phase, onPhaseComplete, onPredictionMade,
}) => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Metronome states (phases)
  const [metronomes, setMetronomes] = useState([
    { phase: 0, frequency: 1.0 },
    { phase: Math.PI * 0.5, frequency: 1.0 },
    { phase: Math.PI, frequency: 1.0 },
    { phase: Math.PI * 1.5, frequency: 1.0 },
  ]);

  // Controls
  const [couplingStrength, setCouplingStrength] = useState(50);
  const [numMetronomes, setNumMetronomes] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [platformOffset, setPlatformOffset] = useState(0);

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Synchronization calculation
  const calculateSyncLevel = useCallback(() => {
    const phases = metronomes.slice(0, numMetronomes).map(m => m.phase);
    let sumCos = 0, sumSin = 0;
    phases.forEach(p => {
      sumCos += Math.cos(p);
      sumSin += Math.sin(p);
    });
    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / phases.length;
  }, [metronomes, numMetronomes]);

  // Animation & physics
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      if (isRunning) {
        setMetronomes(prev => {
          const coupling = couplingStrength / 1000;
          const newMetronomes = [...prev];

          // Calculate mean phase for coupling
          let sumSin = 0, sumCos = 0;
          for (let i = 0; i < numMetronomes; i++) {
            sumSin += Math.sin(newMetronomes[i].phase);
            sumCos += Math.cos(newMetronomes[i].phase);
          }

          // Update each metronome
          for (let i = 0; i < numMetronomes; i++) {
            const naturalFreq = newMetronomes[i].frequency * 2 * Math.PI;
            // Kuramoto model: phase advances + coupling toward mean
            const phaseChange = naturalFreq * 0.05 + coupling * (
              sumSin * Math.cos(newMetronomes[i].phase) -
              sumCos * Math.sin(newMetronomes[i].phase)
            );
            newMetronomes[i] = {
              ...newMetronomes[i],
              phase: (newMetronomes[i].phase + phaseChange) % (2 * Math.PI),
            };
          }

          return newMetronomes;
        });

        // Platform motion (average of metronome positions)
        const avgPhase = metronomes.slice(0, numMetronomes)
          .reduce((sum, m) => sum + Math.sin(m.phase), 0) / numMetronomes;
        setPlatformOffset(avgPhase * 5 * (couplingStrength / 50));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, isRunning, couplingStrength, numMetronomes, metronomes]);

  const startSimulation = () => {
    // Randomize starting phases
    setMetronomes(prev => prev.map(m => ({
      ...m,
      phase: Math.random() * 2 * Math.PI,
    })));
    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setMetronomes([
      { phase: 0, frequency: 1.0 },
      { phase: Math.PI * 0.5, frequency: 1.0 },
      { phase: Math.PI, frequency: 1.0 },
      { phase: Math.PI * 1.5, frequency: 1.0 },
    ]);
    setPlatformOffset(0);
  };

  const metronomeColors = [colors.metronome1, colors.metronome2, colors.metronome3, colors.metronome4];

  const renderVisualization = () => {
    const syncLevel = calculateSyncLevel();

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <svg viewBox="0 0 500 400" style={{ width: '100%', height: 'auto', borderRadius: '12px' }}>
          <defs>
            {/* Premium wooden metronome housing gradient */}
            <linearGradient id="msyncWoodGrain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B4513" />
              <stop offset="20%" stopColor="#A0522D" />
              <stop offset="40%" stopColor="#8B4513" />
              <stop offset="60%" stopColor="#CD853F" />
              <stop offset="80%" stopColor="#8B4513" />
              <stop offset="100%" stopColor="#5D3A1A" />
            </linearGradient>

            {/* Darker wood for side panels */}
            <linearGradient id="msyncWoodDark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5D3A1A" />
              <stop offset="30%" stopColor="#4A2E14" />
              <stop offset="70%" stopColor="#3D2510" />
              <stop offset="100%" stopColor="#2D1B0C" />
            </linearGradient>

            {/* Metallic pendulum rod gradient */}
            <linearGradient id="msyncMetalRod" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="25%" stopColor="#D1D5DB" />
              <stop offset="50%" stopColor="#F3F4F6" />
              <stop offset="75%" stopColor="#D1D5DB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </linearGradient>

            {/* Brass metallic bob gradient */}
            <radialGradient id="msyncBrassBob" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="30%" stopColor="#DAA520" />
              <stop offset="60%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#8B7355" />
            </radialGradient>

            {/* Premium platform wood gradient */}
            <linearGradient id="msyncPlatformWood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#654321" />
              <stop offset="20%" stopColor="#8B5A2B" />
              <stop offset="50%" stopColor="#A0522D" />
              <stop offset="80%" stopColor="#8B5A2B" />
              <stop offset="100%" stopColor="#654321" />
            </linearGradient>

            {/* Roller chrome gradient */}
            <radialGradient id="msyncChrome" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#F5F5F5" />
              <stop offset="30%" stopColor="#C0C0C0" />
              <stop offset="60%" stopColor="#808080" />
              <stop offset="100%" stopColor="#4A4A4A" />
            </radialGradient>

            {/* Sync indicator glow - green */}
            <radialGradient id="msyncGlowGreen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="40%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#047857" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
            </radialGradient>

            {/* Sync indicator glow - amber */}
            <radialGradient id="msyncGlowAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="40%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#b45309" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* Sync indicator glow - red */}
            <radialGradient id="msyncGlowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
            </radialGradient>

            {/* Dark lab background gradient */}
            <linearGradient id="msyncLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Phase circle gradient */}
            <radialGradient id="msyncPhaseBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Sync meter bar gradient */}
            <linearGradient id="msyncMeterBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Premium pendulum bob glow filter */}
            <filter id="msyncBobGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="msyncShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feOffset in="blur" dx="2" dy="4" result="offsetBlur" />
              <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sync indicator pulse glow */}
            <filter id="msyncPulseGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for metronome body */}
            <filter id="msyncInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="msyncLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Premium dark lab background */}
          <rect width="500" height="400" fill="url(#msyncLabBg)" />
          <rect width="500" height="400" fill="url(#msyncLabGrid)" />

          {/* Title with premium styling */}
          <text x="250" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="18" fontWeight="bold" style={{ letterSpacing: '0.5px' }}>
            Metronome Synchronization
          </text>
          <text x="250" y="45" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Coupled Oscillators &amp; Self-Organization
          </text>

          {/* Platform (movable) with premium wood */}
          <g transform={`translate(${platformOffset}, 0)`}>
            {/* Platform shadow */}
            <rect x="35" y="262" width="330" height="18" rx="4" fill="#000" opacity="0.3" />

            {/* Main platform board */}
            <rect x="30" y="255" width="340" height="20" rx="4" fill="url(#msyncPlatformWood)" stroke="#4A3728" strokeWidth="1.5" />

            {/* Platform highlight */}
            <rect x="32" y="257" width="336" height="3" rx="1" fill="#A0522D" opacity="0.5" />

            {/* Platform edge detail */}
            <rect x="30" y="272" width="340" height="3" rx="1" fill="#3D2510" />

            {/* Rollers under platform with chrome effect */}
            {[80, 200, 320].map((x, idx) => (
              <g key={idx}>
                {/* Roller shadow */}
                <ellipse cx={x} cy="290" rx="14" ry="4" fill="#000" opacity="0.4" />
                {/* Main roller */}
                <circle cx={x} cy="285" r="10" fill="url(#msyncChrome)" stroke="#374151" strokeWidth="1" />
                {/* Roller highlight */}
                <ellipse cx={x - 3} cy="282" rx="4" ry="3" fill="#fff" opacity="0.4" />
                {/* Axle */}
                <rect x={x - 15} y="283" width="30" height="4" rx="2" fill="#4B5563" />
              </g>
            ))}

            {/* Metronomes */}
            {metronomes.slice(0, numMetronomes).map((m, i) => {
              const baseX = 80 + i * (280 / numMetronomes);
              const angle = Math.sin(m.phase) * 30;
              const pendulumLength = 120;
              const metronomeColor = metronomeColors[i];

              return (
                <g key={i} transform={`translate(${baseX}, 255)`} filter="url(#msyncShadow)">
                  {/* Metronome body - trapezoid shape wooden housing */}
                  <path
                    d={`M-18,-35 L-25,-145 L25,-145 L18,-35 Z`}
                    fill="url(#msyncWoodGrain)"
                    stroke="#5D3A1A"
                    strokeWidth="1.5"
                  />

                  {/* Wood grain texture lines */}
                  <path d="M-20,-50 Q0,-55 20,-50" stroke="#654321" strokeWidth="0.5" fill="none" opacity="0.5" />
                  <path d="M-22,-80 Q0,-85 22,-80" stroke="#654321" strokeWidth="0.5" fill="none" opacity="0.5" />
                  <path d="M-24,-110 Q0,-115 24,-110" stroke="#654321" strokeWidth="0.5" fill="none" opacity="0.5" />

                  {/* Left side panel */}
                  <path
                    d={`M-25,-145 L-28,-145 L-22,-35 L-18,-35 Z`}
                    fill="url(#msyncWoodDark)"
                  />

                  {/* Decorative top cap */}
                  <rect x="-27" y="-150" width="54" height="8" rx="2" fill="#4A3728" stroke="#3D2510" strokeWidth="1" />

                  {/* Scale markings on face */}
                  {[-130, -115, -100, -85, -70, -55].map((y, idx) => (
                    <g key={idx}>
                      <line x1="-12" y1={y} x2="-8" y2={y} stroke="#FFD700" strokeWidth="1" />
                      <line x1="8" y1={y} x2="12" y2={y} stroke="#FFD700" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Tempo indicator window */}
                  <rect x="-10" y="-55" width="20" height="12" rx="2" fill="#1a1a1a" stroke="#8B7355" strokeWidth="1" />
                  <text x="0" y="-46" textAnchor="middle" fill="#FFD700" fontSize="8" fontFamily="monospace">
                    {Math.round(60 + i * 0)}
                  </text>

                  {/* Colored indicator ring */}
                  <circle cx="0" cy="-38" r="3" fill={metronomeColor} filter="url(#msyncBobGlow)" />

                  {/* Pendulum assembly */}
                  <g transform={`rotate(${angle}, 0, -140)`}>
                    {/* Pendulum rod with metallic gradient */}
                    <rect x="-2" y="-140" width="4" height={pendulumLength * 0.85} rx="1" fill="url(#msyncMetalRod)" />

                    {/* Rod highlight */}
                    <line x1="0" y1="-140" x2="0" y2={-140 + pendulumLength * 0.85} stroke="#fff" strokeWidth="0.5" opacity="0.3" />

                    {/* Brass weight/bob */}
                    <g transform={`translate(0, ${-140 + pendulumLength * 0.65})`}>
                      {/* Bob shadow */}
                      <ellipse cx="2" cy="3" rx="14" ry="5" fill="#000" opacity="0.3" />
                      {/* Main bob */}
                      <circle cx="0" cy="0" r="14" fill="url(#msyncBrassBob)" filter="url(#msyncBobGlow)" />
                      {/* Bob highlight */}
                      <ellipse cx="-4" cy="-4" rx="5" ry="4" fill="#fff" opacity="0.4" />
                      {/* Colored accent ring */}
                      <circle cx="0" cy="0" r="16" fill="none" stroke={metronomeColor} strokeWidth="2" opacity="0.7" />
                    </g>

                    {/* Weight adjustment slider track */}
                    <rect x="-1.5" y="-135" width="3" height="40" rx="1" fill="#4B5563" opacity="0.5" />
                  </g>

                  {/* Pivot point with brass fitting */}
                  <circle cx="0" cy="-140" r="6" fill="#B8860B" stroke="#8B7355" strokeWidth="1" />
                  <circle cx="0" cy="-140" r="3" fill="#DAA520" />

                  {/* Metronome base */}
                  <rect x="-22" y="-38" width="44" height="8" rx="2" fill="#3D2510" stroke="#2D1B0C" strokeWidth="1" />

                  {/* Metronome number label */}
                  <text x="0" y="15" textAnchor="middle" fill={metronomeColor} fontSize="10" fontWeight="bold">
                    M{i + 1}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Ground/table surface */}
          <rect x="10" y="295" width="480" height="8" fill="#1e293b" rx="2" />
          <line x1="10" y1="295" x2="490" y2="295" stroke="#334155" strokeWidth="1" />

          {/* === SYNC INDICATOR VISUALIZATION === */}
          <g transform="translate(250, 340)">
            {/* Indicator background */}
            <rect x="-200" y="-15" width="400" height="50" rx="8" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />

            {/* Label */}
            <text x="-185" y="2" fill={colors.textMuted} fontSize="10" fontWeight="500">
              Synchronization Level:
            </text>

            {/* Sync meter track */}
            <rect x="-185" y="10" width="280" height="14" rx="7" fill="url(#msyncMeterBg)" stroke="#475569" strokeWidth="0.5" />

            {/* Sync meter fill with dynamic color */}
            <rect
              x="-185"
              y="10"
              width={280 * syncLevel}
              height="14"
              rx="7"
              fill={syncLevel > 0.9 ? 'url(#msyncGlowGreen)' : syncLevel > 0.7 ? 'url(#msyncGlowAmber)' : 'url(#msyncGlowRed)'}
            />

            {/* Meter tick marks */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick, idx) => (
              <line
                key={idx}
                x1={-185 + 280 * tick}
                y1="8"
                x2={-185 + 280 * tick}
                y2="26"
                stroke="#64748b"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}

            {/* Percentage display */}
            <rect x="105" y="2" width="55" height="24" rx="4" fill={syncLevel > 0.9 ? 'rgba(16, 185, 129, 0.2)' : syncLevel > 0.7 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'} stroke={syncLevel > 0.9 ? colors.success : syncLevel > 0.7 ? colors.warning : colors.error} strokeWidth="1" />
            <text x="132" y="20" textAnchor="middle" fill={syncLevel > 0.9 ? colors.success : syncLevel > 0.7 ? colors.warning : colors.error} fontSize="14" fontWeight="bold">
              {(syncLevel * 100).toFixed(0)}%
            </text>

            {/* Sync status indicator light */}
            <g transform="translate(175, 14)">
              <circle
                cx="0"
                cy="0"
                r="10"
                fill={syncLevel > 0.9 ? 'url(#msyncGlowGreen)' : syncLevel > 0.7 ? 'url(#msyncGlowAmber)' : 'url(#msyncGlowRed)'}
                filter="url(#msyncPulseGlow)"
              >
                {syncLevel > 0.9 && (
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
                )}
              </circle>
              <circle cx="0" cy="0" r="5" fill={syncLevel > 0.9 ? '#10b981' : syncLevel > 0.7 ? '#f59e0b' : '#ef4444'} />
            </g>
          </g>

          {/* === PHASE DIAGRAM === */}
          <g transform="translate(445, 90)">
            {/* Phase diagram background */}
            <circle cx="0" cy="0" r="42" fill="url(#msyncPhaseBg)" stroke="#334155" strokeWidth="1" />

            {/* Phase circle guide */}
            <circle cx="0" cy="0" r="32" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />

            {/* Axis lines */}
            <line x1="-35" y1="0" x2="35" y2="0" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
            <line x1="0" y1="-35" x2="0" y2="35" stroke="#475569" strokeWidth="0.5" opacity="0.5" />

            {/* Phase indicators for each metronome */}
            {metronomes.slice(0, numMetronomes).map((m, i) => {
              const x = Math.cos(m.phase - Math.PI/2) * 28;
              const y = Math.sin(m.phase - Math.PI/2) * 28;
              return (
                <g key={i}>
                  {/* Connection line to center */}
                  <line x1="0" y1="0" x2={x} y2={y} stroke={metronomeColors[i]} strokeWidth="1" opacity="0.4" />
                  {/* Phase dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill={metronomeColors[i]}
                    filter="url(#msyncBobGlow)"
                  />
                  <circle cx={x} cy={y} r="3" fill="#fff" opacity="0.5" />
                </g>
              );
            })}

            {/* Center point */}
            <circle cx="0" cy="0" r="3" fill="#64748b" />

            {/* Label */}
            <text x="0" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="9" fontWeight="500">
              Phase Diagram
            </text>
          </g>

          {/* Legend for metronomes */}
          <g transform="translate(15, 70)">
            <text x="0" y="0" fill={colors.textMuted} fontSize="9" fontWeight="500">Legend:</text>
            {metronomes.slice(0, numMetronomes).map((_, i) => (
              <g key={i} transform={`translate(0, ${15 + i * 16})`}>
                <circle cx="6" cy="0" r="5" fill={metronomeColors[i]} />
                <text x="16" y="3" fill={colors.textSecondary} fontSize="9">M{i + 1}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button onClick={isRunning ? reset : startSimulation}
        style={{ padding: '14px', background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
        {isRunning ? '🔄 Reset' : '▶️ Start (Random Phases)'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>🔗 Platform Coupling: {couplingStrength}%</label>
        <input type="range" min="0" max="100" value={couplingStrength}
          onChange={(e) => setCouplingStrength(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Fixed (no sync)</span>
          <span>Loose (fast sync)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>🎵 Number of Metronomes: {numMetronomes}</label>
        <input type="range" min="2" max="4" value={numMetronomes}
          onChange={(e) => { setNumMetronomes(Number(e.target.value)); reset(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>
    </div>
  );

  const predictions = [
    { id: 'chaos', text: 'They continue swinging randomly forever' },
    { id: 'stop', text: 'They eventually all stop' },
    { id: 'sync', text: 'They spontaneously synchronize!', correct: true },
    { id: 'faster', text: 'One speeds up and the others slow down' },
  ];

  const twistPredictions = [
    { id: 'magnetic', text: 'Magnetic attraction between the metronomes' },
    { id: 'sound', text: 'Sound waves from the ticking' },
    { id: 'platform', text: 'The movable platform transfers momentum between them', correct: true },
    { id: 'air', text: 'Air currents push them together' },
  ];

  const testQuestions = [
    { id: 1, question: 'What allows metronomes to synchronize?', options: [
      { id: 'a', text: 'Direct contact between them' },
      { id: 'b', text: 'A shared movable platform that transfers momentum', correct: true },
      { id: 'c', text: 'Magnetic fields' },
      { id: 'd', text: 'Sound waves' },
    ]},
    { id: 2, question: 'If the platform were completely fixed (bolted down), would they sync?', options: [
      { id: 'a', text: 'Yes, faster' },
      { id: 'b', text: 'No - no coupling means no synchronization', correct: true },
      { id: 'c', text: 'Yes, but slower' },
      { id: 'd', text: 'They would sync randomly' },
    ]},
    { id: 3, question: 'This phenomenon is an example of:', options: [
      { id: 'a', text: 'Chaos theory' },
      { id: 'b', text: 'Self-organization in coupled oscillators', correct: true },
      { id: 'c', text: 'Quantum mechanics' },
      { id: 'd', text: 'Magnetic resonance' },
    ]},
    { id: 4, question: 'More coupling (looser platform) leads to:', options: [
      { id: 'a', text: 'Slower synchronization' },
      { id: 'b', text: 'Faster synchronization', correct: true },
      { id: 'c', text: 'No change' },
      { id: 'd', text: 'The metronomes stop' },
    ]},
    { id: 5, question: 'The mathematical model for this is called:', options: [
      { id: 'a', text: 'Newton\'s laws' },
      { id: 'b', text: 'The Kuramoto model', correct: true },
      { id: 'c', text: 'Einstein\'s equations' },
      { id: 'd', text: 'The Schrödinger equation' },
    ]},
    { id: 6, question: 'Fireflies flashing in unison use:', options: [
      { id: 'a', text: 'A leader firefly' },
      { id: 'b', text: 'Similar coupled oscillator synchronization', correct: true },
      { id: 'c', text: 'Radio waves' },
      { id: 'd', text: 'Predetermined genetic timing' },
    ]},
    { id: 7, question: 'What determines the final synchronized frequency?', options: [
      { id: 'a', text: 'The fastest metronome' },
      { id: 'b', text: 'The slowest metronome' },
      { id: 'c', text: 'Close to the average natural frequency', correct: true },
      { id: 'd', text: 'Completely random' },
    ]},
    { id: 8, question: 'Can metronomes with different natural frequencies synchronize?', options: [
      { id: 'a', text: 'Never' },
      { id: 'b', text: 'Yes, if coupling is strong enough', correct: true },
      { id: 'c', text: 'Only if exactly the same' },
      { id: 'd', text: 'Only in space' },
    ]},
    { id: 9, question: 'The human heart\'s pacemaker cells synchronize using:', options: [
      { id: 'a', text: 'Electrical coupling similar to metronomes', correct: true },
      { id: 'b', text: 'A single master cell' },
      { id: 'c', text: 'Brain signals' },
      { id: 'd', text: 'They don\'t synchronize' },
    ]},
    { id: 10, question: 'Why is this called "self-organization"?', options: [
      { id: 'a', text: 'Someone organizes them' },
      { id: 'b', text: 'Order emerges spontaneously without external control', correct: true },
      { id: 'c', text: 'The metronomes have AI' },
      { id: 'd', text: 'It\'s predetermined' },
    ]},
  ];

  const transferApplications = [
    { id: 0, title: '💓 Heart Pacemaker Cells', description: 'Your heart has thousands of pacemaker cells that synchronize through electrical coupling. When they fall out of sync, it causes arrhythmia.', insight: 'Pacemaker devices work by providing a regular pulse to re-synchronize heart cells.' },
    { id: 1, title: '🌉 Millennium Bridge', description: 'In 2000, London\'s Millennium Bridge swayed dangerously as pedestrians unconsciously synchronized their footsteps with the bridge motion - a feedback loop!', insight: 'Engineers added dampers to break the coupling and prevent synchronization.' },
    { id: 2, title: '🔦 Firefly Synchronization', description: 'Certain firefly species flash in perfect unison across entire forests. Each firefly adjusts its timing based on neighbors\' flashes.', insight: 'Scientists use firefly synchronization as a model for distributed computing algorithms!' },
    { id: 3, title: '🌐 Power Grid Synchronization', description: 'All generators in a power grid must be phase-locked at exactly 60 Hz (or 50 Hz). Loss of synchronization can cause cascading blackouts.', insight: 'The 2003 Northeast blackout affected 55 million people when generators fell out of sync.' },
  ];

  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
      {showButton && (
        <button onClick={() => onPhaseComplete?.()} disabled={!buttonEnabled}
          style={{ width: '100%', padding: '14px 24px', background: buttonEnabled ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(71, 85, 105, 0.5)', border: 'none', borderRadius: '12px', color: buttonEnabled ? colors.textPrimary : colors.textMuted, fontSize: '16px', fontWeight: 'bold', cursor: buttonEnabled ? 'pointer' : 'not-allowed' }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // Phase renderers (condensed)
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>🎵 The Dancing Metronomes</h1>
            <p style={{ color: colors.accent, fontSize: '18px' }}>Game 116: Metronome Synchronization</p>
          </div>
          {renderVisualization()}
          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>🤯 Spontaneous Order!</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Place several metronomes on a movable board, start them at random times,
                and watch them <strong style={{ color: colors.accent }}>spontaneously synchronize</strong> within minutes!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Multiple metronomes set to the same tempo are placed on a platform that can slide freely.
              They start at completely random phases. What happens over time?
            </p>
          </div>
          <div style={{ padding: '0 16px' }}>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', marginBottom: '12px', background: prediction === p.id ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(51, 65, 85, 0.7)', border: prediction === p.id ? '2px solid #c4b5fd' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, textAlign: 'left', cursor: 'pointer' }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>🔬 Watch Them Sync!</h2>
          </div>
          {renderVisualization()}
          {renderControls()}
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  if (phase === 'review') {
    const isCorrect = predictions.find(p => p.id === prediction)?.correct;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>{isCorrect ? 'Excellent!' : 'Amazing Phenomenon!'}</h2>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The metronomes <strong style={{ color: colors.accent }}>synchronize through the platform</strong>!
              Each swing pushes the platform slightly, which in turn nudges all the other metronomes.
              Over time, this coupling brings them into phase!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // Twist phases
  if (phase === 'twist_predict' || phase === 'twist_play' || phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>🌀 The Coupling Mechanism</h2>
          </div>
          {renderVisualization()}
          {phase === 'twist_predict' && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>What physically couples the metronomes?</h3>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                  style={{ display: 'block', width: '100%', padding: '14px', marginBottom: '10px', background: twistPrediction === p.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.7)', border: 'none', borderRadius: '10px', color: colors.textPrimary, cursor: 'pointer' }}>
                  {p.text}
                </button>
              ))}
            </div>
          )}
          {(phase === 'twist_play' || phase === 'twist_review') && renderControls()}
        </div>
        {renderBottomBar(true, phase === 'twist_predict' ? !!twistPrediction : true,
          phase === 'twist_predict' ? 'See The Answer →' : phase === 'twist_play' ? 'Learn More →' : 'See Applications →')}
      </div>
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>🌍 Real Applications</h2>
          </div>
          {transferApplications.map((app) => (
            <div key={app.id} onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
              style={{ background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard, border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent', margin: '12px 16px', padding: '16px', borderRadius: '12px', cursor: 'pointer' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>{app.description}</p>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px' }}>{correctCount >= 8 ? '🏆' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>{Math.round(correctCount / 10 * 100)}%</h2>
            </div>
          </div>
          {renderBottomBar(true, true, 'Complete! 🎉')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>📝 Test</h2>
          </div>
          {testQuestions.map((q, idx) => (
            <div key={q.id} style={{ background: colors.bgCard, margin: '12px 16px', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{idx + 1}. {q.question}</p>
              {q.options.map(opt => (
                <button key={opt.id} onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Synchronization Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary }}>🎓 Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
              <li>Coupled oscillators spontaneously synchronize</li>
              <li>A shared platform transfers momentum</li>
              <li>Same physics in hearts, fireflies, power grids</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading: {phase}</p></div>;
};

export default MetronomeSyncRenderer;
