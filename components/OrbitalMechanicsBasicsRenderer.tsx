import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface OrbitalMechanicsBasicsRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const OrbitalMechanicsBasicsRenderer: React.FC<OrbitalMechanicsBasicsRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Explore',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'New Variable',
    twist_play: 'Explore Twist',
    twist_review: 'Transfer',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const validPhases: Phase[] = phaseOrder;
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase)) return gamePhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 300);
  }, [onGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Simulation state
  const [altitude, setAltitude] = useState(400);
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showGravityVector, setShowGravityVector] = useState(true);
  const [orbitAngle, setOrbitAngle] = useState(45);
  const [isAnimating, setIsAnimating] = useState(false);
  const [trailPoints, setTrailPoints] = useState<{x: number, y: number}[]>([]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [transferGotIt, setTransferGotIt] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const EARTH_RADIUS = 6371;
  const G = 6.674e-11;
  const EARTH_MASS = 5.972e24;

  const calculateOrbitalParams = useCallback(() => {
    const r = (EARTH_RADIUS + altitude) * 1000;
    const velocity = Math.sqrt(G * EARTH_MASS / r) / 1000;
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * EARTH_MASS));
    const periodMinutes = periodSeconds / 60;
    const escapeVelocity = Math.sqrt(2 * G * EARTH_MASS / r) / 1000;
    const gravityAccel = (G * EARTH_MASS / Math.pow(r, 2));
    return {
      velocity: Math.round(velocity * 100) / 100,
      periodMinutes: Math.round(periodMinutes * 10) / 10,
      escapeVelocity: Math.round(escapeVelocity * 100) / 100,
      gravityAccel: Math.round(gravityAccel * 100) / 100,
      radiusRatio: (EARTH_RADIUS + altitude) / EARTH_RADIUS,
    };
  }, [altitude]);

  useEffect(() => {
    if (!isAnimating) return;
    const params = calculateOrbitalParams();
    const angularSpeed = 360 / (params.periodMinutes * 60);
    const interval = setInterval(() => {
      setOrbitAngle(prev => {
        const newAngle = (prev + angularSpeed * 0.1) % 360;
        const centerX = 250;
        const centerY = 180;
        const orbitRadius = 80 + (altitude / 10);
        const rad = (newAngle * Math.PI) / 180;
        const x = centerX + Math.cos(rad) * orbitRadius;
        const y = centerY + Math.sin(rad) * orbitRadius;
        setTrailPoints(points => [...points, { x, y }].slice(-100));
        return newAngle;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, altitude, calculateOrbitalParams]);

  const predictions = [
    { id: 'gravity', label: 'There\'s no gravity in space - that\'s why they float' },
    { id: 'falling', label: 'They ARE falling, but moving sideways fast enough to keep missing Earth' },
    { id: 'spinning', label: 'Earth\'s rotation keeps them up' },
    { id: 'engines', label: 'Satellite engines constantly push them up against gravity' },
  ];

  const twistPredictions = [
    { id: 'faster_higher', label: 'Higher orbits are faster - more potential energy converts to speed' },
    { id: 'slower_higher', label: 'Higher orbits are SLOWER - counterintuitive but true' },
    { id: 'same_speed', label: 'All orbits have the same speed' },
    { id: 'depends', label: 'It depends on the satellite\'s mass' },
  ];

  const testQuestions = [
    {
      scenario: 'The International Space Station orbits 400 km above Earth at 7.7 km/s. Gravity at that altitude is still 8.7 m/s², about 89% of surface gravity.',
      question: 'Satellites stay in orbit because:',
      options: [
        { text: 'There is no gravity in space', correct: false },
        { text: 'They are falling but moving sideways fast enough to miss Earth', correct: true },
        { text: 'Rocket engines constantly push them up', correct: false },
        { text: 'Earth\'s magnetic field supports them', correct: false },
      ],
    },
    {
      scenario: 'The ISS orbits at 400 km altitude at 7.7 km/s. GPS satellites orbit at 20,200 km altitude at 3.9 km/s. Geostationary satellites orbit at 35,786 km at 3.1 km/s.',
      question: 'As a satellite\'s orbital altitude increases, its orbital velocity:',
      options: [
        { text: 'Increases', correct: false },
        { text: 'Decreases', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: false },
      ],
    },
    {
      scenario: 'The ISS completes regular orbits around Earth, visible from the ground as a moving star. Each orbit covers different ground track due to Earth\'s rotation.',
      question: 'The ISS orbits at 400km altitude with a period of about:',
      options: [
        { text: '24 hours', correct: false },
        { text: '90 minutes', correct: true },
        { text: '12 hours', correct: false },
        { text: '1 week', correct: false },
      ],
    },
    {
      scenario: 'Two satellites are placed at the same 400 km altitude: one has a mass of 100 kg (CubeSat) and another has a mass of 20,000 kg (large station module).',
      question: 'Orbital velocity at a given altitude is determined by:',
      options: [
        { text: 'The satellite\'s mass', correct: false },
        { text: 'The central body\'s mass and orbital radius only', correct: true },
        { text: 'The satellite\'s fuel load', correct: false },
        { text: 'The satellite\'s shape', correct: false },
      ],
    },
    {
      scenario: 'A spacecraft in low Earth orbit at 300 km wants to rendezvous with the ISS at 400 km. Mission control needs to plan the orbital maneuver carefully.',
      question: 'To reach a higher orbit, a spacecraft must:',
      options: [
        { text: 'Slow down', correct: false },
        { text: 'Speed up, then slow down at the new altitude', correct: true },
        { text: 'Point straight up and fire engines', correct: false },
        { text: 'Do nothing - orbits naturally rise', correct: false },
      ],
    },
    {
      scenario: 'The New Horizons spacecraft was launched to escape Earth\'s gravity and travel to Pluto. It needed to reach a specific minimum velocity to break free of Earth\'s gravitational pull.',
      question: 'Escape velocity from Earth\'s surface is approximately:',
      options: [
        { text: '7.9 km/s (orbital velocity)', correct: false },
        { text: '11.2 km/s', correct: true },
        { text: '3 km/s', correct: false },
        { text: '300,000 km/s (speed of light)', correct: false },
      ],
    },
    {
      scenario: 'DirecTV and weather satellites like GOES appear to remain stationary above a fixed point on Earth, enabling continuous coverage of the same region.',
      question: 'A geostationary orbit requires an altitude of about:',
      options: [
        { text: '400 km', correct: false },
        { text: '2,000 km', correct: false },
        { text: '35,786 km', correct: true },
        { text: '100 km', correct: false },
      ],
    },
    {
      scenario: 'Johannes Kepler discovered mathematical relationships between orbital size and period by analyzing precise observations of planetary motion made by Tycho Brahe.',
      question: 'The orbital period of a satellite depends on:',
      options: [
        { text: 'Only its velocity', correct: false },
        { text: 'The semi-major axis of its orbit', correct: true },
        { text: 'The satellite\'s mass', correct: false },
        { text: 'The launch date', correct: false },
      ],
    },
    {
      scenario: 'As satellites are placed into higher and higher orbits, engineers must account for changes in the gravitational environment that affect station-keeping fuel requirements.',
      question: 'At higher orbits, gravitational acceleration:',
      options: [
        { text: 'Is stronger because you\'re closer to space', correct: false },
        { text: 'Is weaker because you\'re farther from Earth\'s center', correct: true },
        { text: 'Is the same at all altitudes', correct: false },
        { text: 'Becomes repulsive', correct: false },
      ],
    },
    {
      scenario: 'During a hypothetical emergency, engineers consider what would happen if the ISS thrusters fired in the wrong direction, completely canceling its orbital velocity.',
      question: 'If the ISS suddenly stopped moving sideways, it would:',
      options: [
        { text: 'Stay in place', correct: false },
        { text: 'Fall straight toward Earth', correct: true },
        { text: 'Drift slowly into deep space', correct: false },
        { text: 'Start spinning', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
  };

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #334155',
        backgroundColor: '#0f172a',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: i < currentIdx ? '#22c55e' : i === currentIdx ? '#3b82f6' : '#334155',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease'
                }}
                title={phaseLabels[p]}
                aria-label={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#3b82f6',
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomBar = (canGoNext: boolean = true, nextLabel: string = 'Next') => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;
    const isLastPhase = currentIdx === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0, left: 0, right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        backgroundColor: '#0f172a',
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '12px 24px', minHeight: '44px', borderRadius: '10px',
            fontWeight: 600, fontSize: '14px',
            backgroundColor: '#1e293b',
            color: canBack ? '#e2e8f0' : '#475569',
            border: '1px solid #334155',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5,
          }}
        >Back</button>

        <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        {!isLastPhase && (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            style={{
              padding: '12px 24px', minHeight: '44px', borderRadius: '10px',
              fontWeight: 700, fontSize: '14px',
              background: canGoNext ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
          >{nextLabel}</button>
        )}
        {isLastPhase && (
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '12px 24px', minHeight: '44px', borderRadius: '10px',
              fontWeight: 700, fontSize: '14px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff', border: 'none', cursor: 'pointer',
            }}
          >Start Over</button>
        )}
      </div>
    );
  };

  const renderVisualization = () => {
    const params = calculateOrbitalParams();
    const centerX = 250;
    const centerY = 180;
    const earthRadius = 60;
    const orbitRadius = 80 + (altitude / 10);

    const rad = (orbitAngle * Math.PI) / 180;
    const satX = centerX + Math.cos(rad) * orbitRadius;
    const satY = centerY + Math.sin(rad) * orbitRadius;

    const velAngle = rad + Math.PI / 2;
    const velLength = 28 * (params.velocity / 8);
    const velX = Math.cos(velAngle) * velLength;
    const velY = Math.sin(velAngle) * velLength;

    const gravAngle = rad + Math.PI;
    const gravLength = 18 * (params.gravityAccel / 10);
    const gravX = Math.cos(gravAngle) * gravLength;
    const gravY = Math.sin(gravAngle) * gravLength;

    // Position satellite indicator at a distinct location - top-right area
    const indicatorX = Math.max(20, Math.min(satX + 12, 400));
    const indicatorY = Math.max(20, satY - 20);

    return (
      <svg width="100%" height="400" viewBox="0 0 500 400" style={{ maxWidth: '600px', display: 'block', margin: '0 auto' }}>
        <defs>
          <radialGradient id="earthGrad2" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          <filter id="glowSat">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="400" fill="#0a0a1a" rx="12" />

        {/* Stars (deterministic) */}
        {[...Array(40)].map((_, i) => (
          <circle key={i} cx={(i * 127 + 50) % 490} cy={(i * 83 + 30) % 390} r={0.8 + (i % 3) * 0.4} fill="#fff" opacity={0.4 + (i % 5) * 0.1} />
        ))}

        {/* Grid lines */}
        <line x1="0" y1={centerY} x2="500" y2={centerY} stroke="rgba(148,163,184,0.7)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1={centerX} y1="0" x2={centerX} y2="400" stroke="rgba(148,163,184,0.7)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />

        {/* Orbit path */}
        <circle cx={centerX} cy={centerY} r={orbitRadius} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />

        {/* Trail */}
        {trailPoints.length > 1 && (
          <path d={`M ${trailPoints.map(p => `${p.x},${p.y}`).join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.5" />
        )}

        {/* Earth */}
        <circle cx={centerX} cy={centerY} r={earthRadius + 8} fill="rgba(96, 165, 250, 0.15)" />
        <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#earthGrad2)" />
        <ellipse cx={centerX - 12} cy={centerY - 8} rx="16" ry="12" fill="#22c55e" opacity="0.35" />
        <ellipse cx={centerX + 16} cy={centerY + 12} rx="12" ry="8" fill="#22c55e" opacity="0.35" />
        <text x={centerX} y={centerY + 5} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">Earth</text>

        {/* Satellite */}
        <g transform={`translate(${satX}, ${satY})`} filter="url(#glowSat)">
          <rect x="-22" y="-3" width="17" height="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
          <rect x="5" y="-3" width="17" height="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
          <rect x="-5" y="-5" width="10" height="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
          {/* Velocity vector */}
          {showVelocityVector && (
            <g>
              <line x1="0" y1="0" x2={velX} y2={velY} stroke="#22c55e" strokeWidth="2.5" />
              <polygon points="0,-4 -3,4 3,4" fill="#22c55e" transform={`translate(${velX},${velY}) rotate(${(velAngle * 180) / Math.PI + 90})`} />
            </g>
          )}
          {/* Gravity vector */}
          {showGravityVector && (
            <g>
              <line x1="0" y1="0" x2={gravX} y2={gravY} stroke="#ef4444" strokeWidth="2.5" />
              <polygon points="0,-4 -3,4 3,4" fill="#ef4444" transform={`translate(${gravX},${gravY}) rotate(${(gravAngle * 180) / Math.PI + 90})`} />
            </g>
          )}
        </g>

        {/* Vector labels - positioned away from satellite to avoid overlap */}
        {showVelocityVector && (
          <text
            x={Math.min(satX + Math.cos(velAngle) * velLength + 16, 470)}
            y={Math.max(satY + Math.sin(velAngle) * velLength, 20)}
            fill="#22c55e" fontSize="12" fontWeight="bold"
          >v</text>
        )}
        {showGravityVector && (
          <text
            x={Math.max(satX + Math.cos(gravAngle) * gravLength - 18, 10)}
            y={Math.min(satY + Math.sin(gravAngle) * gravLength + 5, 390)}
            fill="#ef4444" fontSize="12" fontWeight="bold"
          >g</text>
        )}

        {/* Formula display - top-left, no overlap */}
        <rect x="8" y="8" width="160" height="52" fill="rgba(15,23,42,0.85)" rx="6" />
        <text x="16" y="26" fill="#a855f7" fontSize="12" fontWeight="bold">v = √(GM/r)</text>
        <text x="16" y="42" fill="#94a3b8" fontSize="11">Alt: {altitude} km</text>
        <text x="16" y="56" fill="#22c55e" fontSize="11">v = {params.velocity} km/s</text>

        {/* Parameter display - bottom-left */}
        <rect x="8" y="300" width="145" height="90" fill="rgba(15,23,42,0.85)" rx="6" />
        <text x="16" y="318" fill="#f8fafc" fontSize="12" fontWeight="bold">Orbital Parameters</text>
        <text x="16" y="335" fill="#94a3b8" fontSize="11">Altitude: {altitude} km</text>
        <text x="16" y="351" fill="#22c55e" fontSize="11">Velocity: {params.velocity} km/s</text>
        <text x="16" y="367" fill="#f59e0b" fontSize="11">Period: {params.periodMinutes} min</text>
        <text x="16" y="383" fill="#ef4444" fontSize="11">Gravity: {params.gravityAccel} m/s²</text>

        {/* Key velocities - bottom-right */}
        <rect x="345" y="300" width="148" height="75" fill="rgba(15,23,42,0.85)" rx="6" />
        <text x="353" y="318" fill="#f8fafc" fontSize="12" fontWeight="bold">Key Velocities</text>
        <text x="353" y="334" fill="#22c55e" fontSize="11">Orbital: {params.velocity} km/s</text>
        <text x="353" y="350" fill="#a855f7" fontSize="11">Escape: {params.escapeVelocity} km/s</text>
        <text x="353" y="366" fill="#94a3b8" fontSize="11">Ratio: {(params.escapeVelocity / params.velocity).toFixed(2)}x</text>

        {/* Legend - top-right */}
        <rect x="360" y="8" width="132" height="60" fill="rgba(15,23,42,0.85)" rx="6" />
        <circle cx="374" cy="25" r="5" fill="#22c55e" />
        <text x="385" y="29" fill="#f8fafc" fontSize="11">Velocity vector</text>
        <circle cx="374" cy="48" r="5" fill="#ef4444" />
        <text x="385" y="52" fill="#f8fafc" fontSize="11">Gravity vector</text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Orbital Altitude: <strong>{altitude} km</strong>
        </label>
        <input
          type="range"
          min="200"
          max="40000"
          step="100"
          value={altitude}
          onChange={(e) => setAltitude(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '20px',
            accentColor: '#3b82f6',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
          <span>ISS ~400km</span>
          <span>GPS ~20,000km</span>
          <span>GEO ~36,000km</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowVelocityVector(!showVelocityVector)}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none',
            background: showVelocityVector ? '#22c55e' : '#475569',
            color: 'white', fontWeight: 'bold', cursor: 'pointer',
          }}
        >Velocity: {showVelocityVector ? 'ON' : 'OFF'}</button>

        <button
          onClick={() => setShowGravityVector(!showGravityVector)}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none',
            background: showGravityVector ? '#ef4444' : '#475569',
            color: 'white', fontWeight: 'bold', cursor: 'pointer',
          }}
        >Gravity: {showGravityVector ? 'ON' : 'OFF'}</button>

        <button
          onClick={() => { setIsAnimating(!isAnimating); if (!isAnimating) setTrailPoints([]); }}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none',
            background: isAnimating ? '#f59e0b' : '#3b82f6',
            color: 'white', fontWeight: 'bold', cursor: 'pointer',
          }}
        >{isAnimating ? 'Pause Orbit' : 'Animate Orbit'}</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[{label: 'ISS (400km)', alt: 400}, {label: 'GPS (20,200km)', alt: 20200}, {label: 'GEO (35,786km)', alt: 35786}].map(({label, alt}) => (
          <button key={alt} onClick={() => setAltitude(alt)}
            style={{
              padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569',
              background: altitude === alt ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: '#e2e8f0', cursor: 'pointer', fontSize: '12px',
            }}
          >{label}</button>
        ))}
      </div>
    </div>
  );

  const renderStaticVisualization = () => {
    const centerX = 250;
    const centerY = 180;
    const earthRadius = 60;
    const orbitRadius = 120;
    return (
      <svg width="100%" height="300" viewBox="0 0 500 360" style={{ maxWidth: '500px', margin: '0 auto', display: 'block' }}>
        <rect width="500" height="360" fill="#0a0a1a" rx="12" />
        {[...Array(25)].map((_, i) => (
          <circle key={i} cx={(i * 97 + 40) % 480} cy={(i * 61 + 20) % 340} r={0.8} fill="#fff" opacity={0.5} />
        ))}
        <circle cx={centerX} cy={centerY} r={orbitRadius} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="8 4" />
        <circle cx={centerX} cy={centerY} r={earthRadius} fill="#3b82f6" />
        <ellipse cx={centerX - 10} cy={centerY - 6} rx="14" ry="10" fill="#22c55e" opacity="0.4" />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">Earth</text>
        <g transform={`translate(${centerX}, ${centerY - orbitRadius})`}>
          <rect x="-18" y="-3" width="13" height="6" fill="#1e3a8a" stroke="#3b82f6" />
          <rect x="5" y="-3" width="13" height="6" fill="#1e3a8a" stroke="#3b82f6" />
          <rect x="-4" y="-4" width="8" height="8" fill="#f8fafc" stroke="#94a3b8" />
          {/* Interactive point */}
          <circle r="10" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="1.5" />
        </g>
        <text x={centerX} y={centerY - orbitRadius - 22} textAnchor="middle" fill="#e2e8f0" fontSize="13">ISS (400 km)</text>
        <text x={centerX + orbitRadius + 30} y={centerY} fill="#f59e0b" fontSize="30" fontWeight="bold">?</text>
        <text x={centerX + orbitRadius + 8} y={centerY + 22} fill="#e2e8f0" fontSize="12">Why no</text>
        <text x={centerX + orbitRadius + 8} y={centerY + 38} fill="#e2e8f0" fontSize="12">falling?</text>
        {/* Gravity arrow */}
        <line x1={centerX} y1={centerY - orbitRadius + 10} x2={centerX} y2={centerY - earthRadius - 5} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed)" />
        <text x={centerX + 8} y={centerY - (orbitRadius + earthRadius) / 2} fill="#ef4444" fontSize="12">g = 8.7 m/s²</text>
        <defs>
          <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderReviewVisualization = () => {
    return (
      <svg width="100%" height="220" viewBox="0 0 500 220" style={{ maxWidth: '540px', margin: '0 auto', display: 'block' }}>
        <rect width="500" height="220" fill="#0a0a1a" rx="10" />
        {/* Newton's cannonball illustration */}
        {/* Mountain */}
        <polygon points="160,190 230,80 300,190" fill="#374151" stroke="#4b5563" strokeWidth="1" />
        <text x="230" y="70" textAnchor="middle" fill="#94a3b8" fontSize="12">Mountain</text>
        {/* Earth curve */}
        <path d="M 30,190 Q 250,350 470,190" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" />
        <text x="250" y="210" textAnchor="middle" fill="#3b82f6" fontSize="12">Earth's curved surface</text>
        {/* Cannonball trajectories */}
        <path d="M 300,80 Q 340,130 380,190" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="380" cy="190" r="5" fill="#f59e0b" />
        <text x="385" y="185" fill="#f59e0b" fontSize="11">Slow</text>
        <path d="M 300,80 Q 360,100 420,110 Q 460,115 490,130" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <circle cx="490" cy="130" r="6" fill="#22c55e" filter="url(#glowOrbit)" />
        <text x="395" y="98" fill="#22c55e" fontSize="12" fontWeight="bold">Orbital velocity!</text>
        {/* Cannon */}
        <rect x="290" y="76" width="20" height="8" fill="#64748b" rx="3" />
        <text x="240" y="112" fill="#e2e8f0" fontSize="11">v = √(GM/r)</text>
        <text x="240" y="126" fill="#94a3b8" fontSize="11">= 7.7 km/s at 400 km</text>
        <defs>
          <filter id="glowOrbit">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    );
  };

  const renderTwistReviewVisualization = () => {
    const orbitData = [
      { alt: 400, vel: 7.67, label: 'ISS', color: '#22c55e', r: 50 },
      { alt: 20200, vel: 3.87, label: 'GPS', color: '#3b82f6', r: 90 },
      { alt: 35786, vel: 3.07, label: 'GEO', color: '#a855f7', r: 120 },
    ];
    const cx = 180;
    const cy = 120;
    return (
      <svg width="100%" height="240" viewBox="0 0 500 240" style={{ maxWidth: '540px', margin: '0 auto', display: 'block' }}>
        <rect width="500" height="240" fill="#0a0a1a" rx="10" />
        <circle cx={cx} cy={cy} r="30" fill="#3b82f6" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">Earth</text>
        {orbitData.map((d) => (
          <g key={d.label}>
            <circle cx={cx} cy={cy} r={d.r} fill="none" stroke={d.color} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
            <circle cx={cx} cy={cy - d.r} r="8" fill={d.color} opacity="0.9" />
          </g>
        ))}
        {/* Velocity bars */}
        <text x="310" y="25" fill="#f8fafc" fontSize="13" fontWeight="bold">Orbital Velocity</text>
        {orbitData.map((d, i) => (
          <g key={d.label} transform={`translate(305, ${50 + i * 55})`}>
            <text x="0" y="0" fill={d.color} fontSize="12" fontWeight="bold">{d.label}</text>
            <text x="0" y="14" fill="#94a3b8" fontSize="11">Alt: {d.alt < 1000 ? d.alt : (d.alt / 1000).toFixed(0) + 'k'} km</text>
            <rect x="0" y="20" width={d.vel * 22} height="14" fill={d.color} rx="3" opacity="0.8" />
            <text x={d.vel * 22 + 5} y="32" fill={d.color} fontSize="12">{d.vel} km/s</text>
          </g>
        ))}
        <text x="310" y="210" fill="#94a3b8" fontSize="11">Higher orbit = slower speed</text>
      </svg>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Space Physics</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Orbital Mechanics Basics
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px', fontWeight: 400 }}>Why don't satellites just fall down?</p>

            {renderVisualization()}

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '16px', lineHeight: 1.6, color: '#e2e8f0' }}>
                The International Space Station zooms around Earth at 7.7 km/s, completing an orbit every 90 minutes.
                But gravity at ISS altitude is still 90% of surface gravity. So why doesn't it fall?
              </p>
              <p style={{ color: '#3b82f6', fontSize: '14px', marginTop: '12px', fontWeight: 'bold' }}>
                The answer is one of physics' most beautiful insights — explore the visualization to find out.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Explore the Answer')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Make Your Prediction</h2>
            <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
              Look at the diagram below, then select your prediction.
            </p>

            {renderStaticVisualization()}

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px', marginTop: '16px' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px', color: '#e2e8f0' }}>
                At the ISS altitude (400 km), gravity is still about 8.7 m/s² — about 89% of surface gravity.
                Yet astronauts float weightlessly. Why don't they and the station fall to Earth?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px', minHeight: '44px', borderRadius: '12px',
                    border: prediction === p.id ? '2px solid #3b82f6' : '1px solid #475569',
                    background: prediction === p.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', fontSize: '15px',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(prediction !== null, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Orbital Mechanics</h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '8px' }}>
              The visualization displays how orbital velocity, period, and gravity change with altitude.
            </p>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px', fontSize: '13px' }}>
              Adjust the altitude slider to see how all orbital parameters respond in real time.
            </p>

            {/* Side-by-side layout: SVG left, controls right */}


            <div style={{


              display: 'flex',


              flexDirection: isMobile ? 'column' : 'row',


              gap: isMobile ? '12px' : '20px',


              width: '100%',


              alignItems: isMobile ? 'center' : 'flex-start',


            }}>


              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


                {renderVisualization()}


              </div>


              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


                {renderControls()}


              </div>


            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Physics Terms:</h3>
              <ul style={{ color: '#e2e8f0', lineHeight: 2, paddingLeft: '20px', fontSize: '14px' }}>
                <li><strong style={{ color: '#22c55e' }}>Orbital velocity</strong>: Speed needed to maintain circular orbit — v = √(GM/r)</li>
                <li><strong style={{ color: '#a855f7' }}>Escape velocity</strong>: Minimum speed to break free of gravity — v_esc = √(2GM/r) = 1.41 × v_orbital</li>
                <li><strong style={{ color: '#f59e0b' }}>Orbital period</strong>: Time for one complete orbit — T = 2π√(r³/GM)</li>
                <li><strong style={{ color: '#ef4444' }}>Gravitational acceleration</strong>: g decreases with altitude as g = GM/r²</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '20px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #3b82f6' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Why This Matters:</h3>
              <p style={{ color: '#e2e8f0', lineHeight: 1.7, fontSize: '14px' }}>
                Orbital mechanics governs every satellite in space — from the 31 GPS satellites that guide your navigation,
                to the 6,000+ Starlink satellites providing global internet, to the James Webb Space Telescope orbiting 1.5 million km away.
                Engineers use these equations daily to plan orbits, schedule maneuvers, and predict positions years in advance.
                Understanding how altitude, velocity, and period relate is the foundation of all space mission design.
              </p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginTop: '16px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Cause and Effect:</h4>
              <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px', fontSize: '14px' }}>
                <li>When altitude increases, orbital velocity decreases because weaker gravity requires less centripetal speed (v ∝ 1/√r)</li>
                <li>Higher altitude causes weaker gravity, which leads to a longer orbital period</li>
                <li>Escape velocity always = 1.41× orbital velocity at same altitude — this affects mission design</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Review the Concepts')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'falling';
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px', borderRadius: '12px', marginBottom: '24px',
              borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            }}>
              <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
                {wasCorrect ? 'Correct!' : 'The key insight:'}
              </h3>
              <p>Orbiting IS falling! The satellite falls toward Earth, but moves sideways so fast that the curve of its fall matches Earth's curve. It keeps missing the ground!</p>
            </div>

            {renderReviewVisualization()}

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px', marginTop: '16px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Newton's Cannonball</h3>
              <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
                <strong>The thought experiment:</strong> Imagine firing a cannon horizontally from a tall mountain.
                Fire faster, and the cannonball lands farther away. Fire at 7.9 km/s, and the ground curves away as fast as the ball falls.
              </p>
              <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
                <strong>The key insight:</strong> At orbital velocity, the object continuously falls toward Earth,
                but Earth's surface curves away at exactly the same rate. The object falls "around" Earth!
              </p>
              <p style={{ lineHeight: 1.7 }}>
                <strong>Weightlessness:</strong> Astronauts feel weightless because they and their spacecraft are both
                falling at exactly the same rate — they're in free fall together.
              </p>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: '#8b5cf6', marginBottom: '8px' }}>The Formula</h3>
              <p style={{ lineHeight: 1.7, fontFamily: 'monospace', color: '#e2e8f0' }}>
                Orbital velocity: v = √(GM/r)<br />
                For Earth at 400 km: v = 7.7 km/s<br />
                Relationship: Higher orbit → lower velocity
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Discover the Twist')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '16px' }}>The Twist</h2>

            {renderStaticVisualization()}

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', marginTop: '16px', borderLeft: '4px solid #a855f7' }}>
              <p style={{ fontSize: '16px', marginBottom: '12px' }}>
                Here's something counterintuitive: A satellite at 400 km orbits at 7.7 km/s.
                A GPS satellite at 20,200 km orbits at only 3.9 km/s.
                A geostationary satellite at 35,786 km orbits at just 3.1 km/s.
              </p>
              <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
                What happens to orbital velocity as you go higher?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px', borderRadius: '12px',
                    border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                    background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontSize: '15px',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(twistPrediction !== null, 'See the Answer')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Higher = Slower</h2>

            {/* Side-by-side layout: SVG left, controls right */}


            <div style={{


              display: 'flex',


              flexDirection: isMobile ? 'column' : 'row',


              gap: isMobile ? '12px' : '20px',


              width: '100%',


              alignItems: isMobile ? 'center' : 'flex-start',


            }}>


              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


                {renderVisualization()}


              </div>


              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


                {renderControls()}


              </div>


            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Low Orbit (ISS)</h4>
                <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.7 }}>
                  <li>400 km altitude</li>
                  <li>7.7 km/s velocity</li>
                  <li>90 minute period</li>
                  <li>Strong gravity (8.7 m/s²)</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ color: '#a855f7', marginBottom: '8px' }}>High Orbit (GEO)</h4>
                <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.7 }}>
                  <li>35,786 km altitude</li>
                  <li>3.1 km/s velocity</li>
                  <li>24 hour period</li>
                  <li>Weak gravity (0.22 m/s²)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Review the Discovery')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'slower_higher';
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px', borderRadius: '12px', marginBottom: '24px',
              borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            }}>
              <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
                {wasCorrect ? 'Exactly right!' : 'The counterintuitive truth:'}
              </h3>
              <p>Higher orbits are SLOWER! v = √(GM/r). Larger r means smaller v.</p>
            </div>

            {renderTwistReviewVisualization()}

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px', marginTop: '16px' }}>
              <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Orbital Maneuvers</h3>
              <div style={{ lineHeight: 1.8 }}>
                <p><strong style={{ color: '#22c55e' }}>To go higher:</strong> Speed up — you'll rise to a higher orbit where you actually move slower</p>
                <p><strong style={{ color: '#ef4444' }}>To go lower:</strong> Slow down — you'll drop to a lower orbit where you actually move faster</p>
                <p><strong style={{ color: '#3b82f6' }}>The paradox:</strong> Speeding up slows you down. Slowing down speeds you up!</p>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Kepler's Third Law</h4>
              <p style={{ color: '#e2e8f0', lineHeight: 1.6, fontFamily: 'monospace' }}>
                T² ∝ r³<br />
                Double r → period increases by 2.8×<br />
                Slower speed + longer path = much longer orbit
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Orbital Mechanics Basics"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
      />
    );
  }

  if (phase === 'transfer') {
    const transferApplications = [
      {
        title: 'International Space Station',
        description: 'The ISS orbits at about 400 km altitude, traveling at 7.7 km/s and completing one orbit every 90 minutes. It is the largest structure ever assembled in space, hosting international crews of up to 6 astronauts and conducting hundreds of experiments annually.',
        question: 'Why does the ISS occasionally need to boost its orbit?',
        answer: 'At 400 km, there\'s still trace atmosphere causing drag — about 2 km of altitude loss per month. Without periodic booster burns from visiting spacecraft, the ISS would gradually spiral down. NASA tracks this carefully, scheduling reboosts using Progress cargo ships or the station\'s own thrusters to maintain the desired 400 km orbit.',
      },
      {
        title: 'Geostationary Satellites',
        description: 'TV broadcast satellites (DirecTV, Dish) and weather observation platforms like NOAA\'s GOES satellites orbit at exactly 35,786 km. From the ground they appear motionless, enabling dish antennas to point permanently at one spot without tracking motors.',
        question: 'At what altitude must a satellite orbit to appear stationary?',
        answer: 'Exactly 35,786 km — at this altitude, the orbital period is precisely 24 hours, matching Earth\'s rotation. The satellite moves at 3.07 km/s (much slower than ISS at 7.7 km/s), keeping pace with Earth\'s surface rotation. This altitude is determined entirely by Kepler\'s third law: T² ∝ r³. Any deviation in altitude changes the period, causing the satellite to drift east or west.',
      },
      {
        title: 'GPS Constellation',
        description: 'The GPS network uses 31 operational satellites orbiting at 20,200 km in medium Earth orbit. Each satellite broadcasts atomic clock timing signals. Any receiver on Earth can see at least 4 satellites simultaneously, enabling triangulation to within 3 meters accuracy.',
        question: 'Why aren\'t GPS satellites geostationary?',
        answer: 'GPS requires simultaneous visibility of multiple satellites from different angles for accurate 3D positioning triangulation. A single geostationary satellite over the equator would be invisible near the poles. Medium Earth Orbit provides ideal ground coverage — each satellite orbits twice per day at 3.87 km/s, covering different regions. The 31-satellite constellation is carefully designed so that at least 4 satellites are always above the horizon from any point on Earth.',
      },
      {
        title: 'Escape Velocity',
        description: 'Every spacecraft bound for the Moon, Mars, or beyond must exceed escape velocity. NASA\'s New Horizons probe, launched in 2006, reached 16.26 km/s — far exceeding Earth\'s 11.2 km/s escape velocity — to reach Pluto in just 9.5 years.',
        question: 'Why does escape velocity decrease at higher altitudes?',
        answer: 'Escape velocity v_esc = √(2GM/r). At higher altitude r, you\'ve already climbed partway out of Earth\'s gravity well, requiring less additional kinetic energy to fully escape. This is why multi-stage rockets are so effective: the first stage climbs to higher altitude before the second stage fires, benefiting from lower escape velocity at altitude. At GEO orbit (35,786 km), escape velocity drops to 4.35 km/s — far less than the 11.2 km/s needed from the surface.',
      },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
              Complete all 4 to unlock the test ({transferCompleted.size}/4)
            </p>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '20px', borderRadius: '12px', marginBottom: '16px',
                  border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #334155',
                }}
              >
                <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{app.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
                </div>
                {transferGotIt.has(index) ? (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                  </div>
                ) : (
                  <div>
                    {transferCompleted.has(index) && (
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '8px' }}>
                        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {!transferCompleted.has(index) && (
                        <button
                          onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                          style={{
                            padding: '10px 20px', borderRadius: '8px',
                            border: '1px solid #3b82f6', background: 'transparent',
                            color: '#3b82f6', cursor: 'pointer',
                          }}
                        >Reveal Answer</button>
                      )}
                      <button
                        onClick={() => setTransferGotIt(new Set([...transferGotIt, index]))}
                        style={{
                          padding: '10px 20px', borderRadius: '8px',
                          border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                          color: 'white', cursor: 'pointer', fontWeight: 600,
                        }}
                      >Got It</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}
          <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '32px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px',
              }}>
                <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
                <p style={{ color: '#94a3b8' }}>
                  {testScore >= 8 ? 'You\'ve mastered orbital mechanics!' : 'Review the concepts and try again.'}
                </p>
              </div>

              {/* Answer review breakdown */}
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>Answer Review</h3>
                {testQuestions.map((q, i) => {
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                  const correctIdx = q.options.findIndex(o => o.correct);
                  return (
                    <div key={i} style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{isCorrect ? '✓' : '✗'}</span>
                        <div>
                          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Q{i + 1}: {q.question}</p>
                          {!isCorrect && (
                            <p style={{ fontSize: '12px', color: '#22c55e' }}>Correct: {q.options[correctIdx].text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }}
                style={{
                  width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold',
                  background: testScore >= 8 ? '#22c55e' : '#f59e0b',
                  border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer',
                }}
              >{testScore >= 8 ? 'Claim Mastery' : 'Try Again'}</button>
            </div>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Knowledge Test</h2>
              <span style={{ color: '#94a3b8' }}>Question {currentTestQuestion + 1} of 10</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1, height: '4px', borderRadius: '2px',
                    background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Scenario context */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '10px', marginBottom: '12px', borderLeft: '3px solid #3b82f6' }}>
              <p style={{ color: '#93c5fd', fontSize: '14px', lineHeight: 1.6 }}>{currentQ.scenario}</p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleTestAnswer(currentTestQuestion, i)}
                  style={{
                    padding: '16px', borderRadius: '12px',
                    border: testAnswers[currentTestQuestion] === i ? '2px solid #3b82f6' : '1px solid #475569',
                    background: testAnswers[currentTestQuestion] === i ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                  }}
                >{opt.text}</button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
                disabled={currentTestQuestion === 0}
                style={{
                  padding: '12px 24px', borderRadius: '8px',
                  border: '1px solid #475569', background: 'transparent',
                  color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                  cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >Previous</button>

              {currentTestQuestion < 9 ? (
                <button
                  onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                  style={{
                    padding: '12px 24px', borderRadius: '8px',
                    border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer',
                  }}
                >Next</button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={testAnswers.includes(null)}
                  style={{
                    padding: '12px 24px', borderRadius: '8px', border: 'none',
                    background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                    color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  }}
                >Submit</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a1a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: '24px', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛰️</div>
            <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Orbital Mechanics Expert!</h1>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
              You understand the elegant physics that keeps satellites in orbit
            </p>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
              <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
                <li>Orbital motion as continuous falling (Newton's cannonball)</li>
                <li>The relationship v = √(GM/r)</li>
                <li>Higher orbits = slower velocities (counterintuitive!)</li>
                <li>Kepler's laws: T² ∝ r³</li>
                <li>Escape velocity = 1.41× orbital velocity at same altitude</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>The Core Insight</h4>
              <p style={{ color: '#e2e8f0' }}>
                Orbits are a beautiful balance between gravity's pull and sideways motion.
                The mathematics that describes this — from Newton to Kepler — has enabled GPS navigation,
                global communications, and interplanetary exploration.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default OrbitalMechanicsBasicsRenderer;
