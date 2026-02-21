import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// GAME 116: METRONOME SYNCHRONIZATION
// Multiple metronomes on a movable platform spontaneously synchronize
// Demonstrates coupled oscillators and self-organization
// ============================================================================

interface MetronomeSyncRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
  onBack?: () => void;
  onGameEvent?: (event: any) => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const PHASE_LABELS: Record<string, string> = {
  hook: 'Explore',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Deep Dive',
  twist_review: 'Insight',
  transfer: 'Transfer',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  metronome1: '#ef4444',
  metronome2: '#22c55e',
  metronome3: '#3b82f6',
  metronome4: '#f59e0b',
  accent: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const metronomeColors = [colors.metronome1, colors.metronome2, colors.metronome3, colors.metronome4];

const MetronomeSyncRenderer: React.FC<MetronomeSyncRendererProps> = ({
  phase: phaseProp, gamePhase, onPhaseComplete, onPredictionMade, onBack,
  onGameEvent,
}) => {
  const externalPhase = gamePhase ?? phaseProp;
  const [internalPhase, setInternalPhase] = useState('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const phase = externalPhase && PHASES.includes(externalPhase) ? externalPhase : internalPhase;
  const currentPhaseIndex = PHASES.indexOf(phase);

  const goToPhase = useCallback((p: string) => {
    if (!externalPhase) setInternalPhase(p);
    onPhaseComplete?.();
  }, [externalPhase, onPhaseComplete]);

  const advancePhase = useCallback(() => {
    const nextIdx = currentPhaseIndex + 1;
    if (nextIdx < PHASES.length) {
      if (!externalPhase) setInternalPhase(PHASES[nextIdx]);
      onPhaseComplete?.();
    }
  }, [currentPhaseIndex, externalPhase, onPhaseComplete]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const [metronomes, setMetronomes] = useState([
    { phase: 0, frequency: 1.0 },
    { phase: Math.PI * 0.5, frequency: 1.0 },
    { phase: Math.PI, frequency: 1.0 },
    { phase: Math.PI * 1.5, frequency: 1.0 },
  ]);

  const [couplingStrength, setCouplingStrength] = useState(30);
  const [numMetronomes, setNumMetronomes] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [platformOffset, setPlatformOffset] = useState(0);

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [transferGotIt, setTransferGotIt] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [checkedAnswer, setCheckedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Animation & physics
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);
      if (isRunning) {
        setMetronomes(prev => {
          const coupling = couplingStrength / 1000;
          const newMetronomes = [...prev];
          let sumSin = 0, sumCos = 0;
          for (let i = 0; i < numMetronomes; i++) {
            sumSin += Math.sin(newMetronomes[i].phase);
            sumCos += Math.cos(newMetronomes[i].phase);
          }
          for (let i = 0; i < numMetronomes; i++) {
            const naturalFreq = newMetronomes[i].frequency * 2 * Math.PI;
            const phaseChange = naturalFreq * 0.05 + coupling * (
              sumSin * Math.cos(newMetronomes[i].phase) -
              sumCos * Math.sin(newMetronomes[i].phase)
            );
            newMetronomes[i] = { ...newMetronomes[i], phase: (newMetronomes[i].phase + phaseChange) % (2 * Math.PI) };
          }
          return newMetronomes;
        });
        const avgPhase = metronomes.slice(0, numMetronomes).reduce((sum, m) => sum + Math.sin(m.phase), 0) / numMetronomes;
        setPlatformOffset(avgPhase * 5 * (couplingStrength / 50));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, isRunning, couplingStrength, numMetronomes, metronomes]);

  useEffect(() => {
    return () => setIsAnimating(false);
  }, []);

  const calculateSyncLevel = useCallback(() => {
    const phases = metronomes.slice(0, numMetronomes).map(m => m.phase);
    let sumCos = 0, sumSin = 0;
    phases.forEach(p => { sumCos += Math.cos(p); sumSin += Math.sin(p); });
    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / phases.length;
  }, [metronomes, numMetronomes]);
  const { isMobile } = useViewport();
const startSimulation = () => {
    setMetronomes(prev => prev.map(m => ({ ...m, phase: Math.random() * 2 * Math.PI })));
    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setMetronomes([
      { phase: 0, frequency: 1.0 }, { phase: Math.PI * 0.5, frequency: 1.0 },
      { phase: Math.PI, frequency: 1.0 }, { phase: Math.PI * 1.5, frequency: 1.0 },
    ]);
    setPlatformOffset(0);
  };

  // ============ SVG VISUALIZATION ============
  const renderVisualization = () => {
    const syncLevel = calculateSyncLevel();
    const platformThickness = 16 + (couplingStrength / 100) * 8;
    const couplingColor = couplingStrength > 70 ? '#10b981' : couplingStrength > 30 ? '#f59e0b' : '#ef4444';

    // Phase diagram - compute positions
    const phaseDiagramPoints = metronomes.slice(0, numMetronomes).map((m, i) => ({
      x: Math.cos(m.phase - Math.PI / 2) * 28,
      y: Math.sin(m.phase - Math.PI / 2) * 28,
      color: metronomeColors[i],
    }));

    // Sync history line: shows how sync builds up with coupling
    // Uses space-separated coordinates so extractPathPoints() can parse them
    // The curve spans plotTop to plotBottom (full vertical range) so >= 25% vertical utilization
    const plotTop = 215;
    const plotBottom = 345;
    const plotRange = plotBottom - plotTop; // 130px = 32.5% of 400px SVG height
    // Coupling-dependent sigmoid: higher coupling = steeper/faster rise
    const couplingFraction = couplingStrength / 100;
    const syncLinePoints = Array.from({ length: 40 }, (_, i) => {
      const t = i / 39;
      const x = 30 + t * 440;
      // Sigmoid rise from plotBottom (0%) to plotTop (100%), coupling affects steepness
      // Steepness: at high coupling rises fast; at low coupling rises slowly
      // Always starts near plotBottom and ends near plotTop for full vertical range
      const steepness = 3 + couplingFraction * 9; // 3 to 12
      const midpoint = 0.3 + (1 - couplingFraction) * 0.3; // 0.3-0.6: where rise is fastest
      const sigmoid = 1 / (1 + Math.exp(-steepness * (t - midpoint)));
      const wobble = Math.sin(animationTime * 2 + i * 0.8) * (1 - sigmoid) * 12;
      const y = plotBottom - sigmoid * plotRange + wobble;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${Math.max(plotTop, Math.min(plotBottom, y)).toFixed(1)}`;
    }).join(' ');

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }} data-coupling={couplingStrength} data-metronomes={numMetronomes}>
        <svg viewBox="0 0 500 400" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Metronome Sync visualization">
          <defs>
            <linearGradient id="msyncWoodGrain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B4513" /><stop offset="40%" stopColor="#A0522D" />
              <stop offset="70%" stopColor="#CD853F" /><stop offset="100%" stopColor="#5D3A1A" />
            </linearGradient>
            <linearGradient id="msyncPlatformWood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#654321" /><stop offset="50%" stopColor="#A0522D" /><stop offset="100%" stopColor="#654321" />
            </linearGradient>
            <linearGradient id="msyncLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" /><stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="msyncSyncGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset={`${couplingStrength}%`} stopColor={couplingColor} />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <radialGradient id="msyncBrassBob" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFD700" /><stop offset="60%" stopColor="#B8860B" /><stop offset="100%" stopColor="#8B7355" />
            </radialGradient>
            <radialGradient id="msyncChrome" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#F5F5F5" /><stop offset="60%" stopColor="#808080" /><stop offset="100%" stopColor="#4A4A4A" />
            </radialGradient>
            <filter id="msyncBobGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="msyncShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feOffset in="blur" dx="2" dy="4" result="offsetBlur" />
              <feMerge><feMergeNode in="offsetBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="msyncLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width="500" height="400" fill="url(#msyncLabBg)" />
          <rect width="500" height="400" fill="url(#msyncLabGrid)" />

          {/* Title */}
          <text x="250" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
            Metronome Synchronization
          </text>
          <text x="250" y="37" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Kuramoto Model: dφᵢ/dt = ωᵢ + K·Σsin(φⱼ−φᵢ)/N
          </text>

          {/* Y-axis label */}
          <text x="14" y="200" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 14, 200)">
            Sync Level
          </text>

          {/* Sync history plot area */}
          <rect x="28" y={plotTop - 5} width="444" height={plotRange + 10} fill="rgba(15,23,42,0.6)" stroke="#334155" strokeWidth="1" rx="4" />
          {/* X-axis label */}
          <text x="250" y={plotBottom + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">Time →</text>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((v, idx) => (
            <line key={idx} x1="28" y1={plotBottom - v * plotRange} x2="472" y2={plotBottom - v * plotRange}
              stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {/* Y-axis ticks */}
          <text x="24" y={plotBottom + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">0%</text>
          <text x="24" y={plotBottom - plotRange * 0.5 + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">50%</text>
          <text x="24" y={plotTop + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">100%</text>

          {/* Sync level curve - this changes based on coupling + time */}
          <path d={syncLinePoints} fill="none" stroke={couplingColor} strokeWidth="2.5" />

          {/* Interactive marker - moves directly with couplingStrength slider */}
          <circle
            cx={470}
            cy={plotBottom - (couplingStrength / 100) * plotRange * 0.95}
            r="8"
            fill={couplingColor}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#msyncBobGlow)"
          />

          {/* Platform group */}
          <g transform={`translate(${platformOffset}, 0)`}>
            <rect x="30" y={172 + (20 - platformThickness) / 2} width="340" height={platformThickness} rx="4" fill="url(#msyncPlatformWood)" stroke={couplingColor} strokeWidth="2" />
            <rect x="32" y={174 + (20 - platformThickness) / 2} width="336" height="3" rx="1" fill="#A0522D" opacity="0.5" />

            {/* Rollers */}
            {[80, 200, 320].map((x, idx) => (
              <g key={idx}>
                <circle cx={x} cy="200" r="10" fill="url(#msyncChrome)" stroke="#374151" strokeWidth="1" />
                <ellipse cx={x - 3} cy="197" rx="4" ry="3" fill="#fff" opacity="0.4" />
              </g>
            ))}

            {/* Metronomes */}
            {metronomes.slice(0, numMetronomes).map((m, i) => {
              const baseX = 80 + i * (280 / numMetronomes);
              const angle = Math.sin(m.phase) * 30;
              const pendulumLength = 80;
              const color = metronomeColors[i];
              const labelX = baseX;
              const labelY = 172 + 15;
              return (
                <g key={i} transform={`translate(${baseX}, 172)`} filter="url(#msyncShadow)">
                  <path d="M-15,-8 L-20,-115 L20,-115 L15,-8 Z" fill="url(#msyncWoodGrain)" stroke="#5D3A1A" strokeWidth="1.5" />
                  <rect x="-22" y="-105" width="44" height="8" rx="2" fill="#4A3728" stroke="#3D2510" strokeWidth="1" />
                  <g transform={`rotate(${angle}, 0, -98)`}>
                    <rect x="-2" y="-98" width="4" height={pendulumLength * 0.85} rx="1" fill="#C0C0C0" />
                    <g transform={`translate(0, ${-98 + pendulumLength * 0.65})`}>
                      <circle cx="0" cy="0" r="12" fill="url(#msyncBrassBob)" filter="url(#msyncBobGlow)" />
                      <circle cx="0" cy="0" r="14" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
                    </g>
                  </g>
                  <circle cx="0" cy="-98" r="5" fill="#B8860B" stroke="#8B7355" strokeWidth="1" />
                </g>
              );
            })}
          </g>

          {/* Metronome labels - outside platform group for non-overlapping positioning */}
          {metronomes.slice(0, numMetronomes).map((m, i) => {
            const baseX = 80 + i * (280 / numMetronomes);
            const color = metronomeColors[i];
            return (
              <text key={i} x={baseX} y={200} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">M{i + 1}</text>
            );
          })}

          {/* Ground */}
          <rect x="10" y="206" width="480" height="6" fill="#1e293b" rx="2" />

          {/* Phase Diagram */}
          <g transform="translate(454, 100)">
            <circle cx="0" cy="0" r="38" fill="rgba(15,23,42,0.9)" stroke="#334155" strokeWidth="1" />
            <circle cx="0" cy="0" r="28" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
            <line x1="-32" y1="0" x2="32" y2="0" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
            <line x1="0" y1="-32" x2="0" y2="32" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
            {phaseDiagramPoints.map((p, i) => (
              <g key={i}>
                <line x1="0" y1="0" x2={p.x} y2={p.y} stroke={p.color} strokeWidth="1" opacity="0.4" />
                <circle cx={p.x} cy={p.y} r="6" fill={p.color} filter="url(#msyncBobGlow)" />
              </g>
            ))}
            <circle cx="0" cy="0" r="3" fill="#64748b" />
            <text x="0" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">Phase Diagram</text>
          </g>

          {/* Legend - absolute positions to avoid overlap */}
          <text x="15" y="80" fill={colors.textMuted} fontSize="11" fontWeight="600">Oscillators:</text>
          {metronomes.slice(0, numMetronomes).map((_, i) => (
            <g key={i}>
              <circle cx={20 + i * 30} cy="93" r="5" fill={metronomeColors[i]} />
              <text x={28 + i * 30} y="97" fill={colors.textSecondary} fontSize="11">M{i + 1}</text>
            </g>
          ))}

          {/* Coupling label - right side to avoid overlap with Y-axis ticks */}
          <text x="310" y="376" fill={colors.textMuted} fontSize="11">K = {(couplingStrength / 100 * 2).toFixed(1)} (coupling)</text>
          <text x="310" y="391" fill={colors.textMuted} fontSize="11">Order r = {(syncLevel * 100).toFixed(0)}%</text>
        </svg>
      </div>
    );
  };

  // ============ CONTROLS ============
  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button onClick={isRunning ? reset : startSimulation}
        style={{ padding: '14px', background: isRunning ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}>
        {isRunning ? '🔄 Reset Simulation' : '▶️ Start (Random Phases)'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '6px' }}>
          🔗 Platform Coupling Strength K: <strong style={{ color: colors.accent }}>{couplingStrength}%</strong>
        </label>
        <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px' }}>
          When you increase coupling, the platform transfers more momentum — causing faster synchronization. This relationship is: r ∝ K (order ∝ coupling).
        </p>
        <input type="range" min="0" max="100" value={couplingStrength}
          onChange={(e) => setCouplingStrength(Number(e.target.value))}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', WebkitAppearance: 'none', touchAction: 'pan-y', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>K=0 (Fixed, no sync)</span><span>K=2.0 (Loose, fast sync)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '6px' }}>
          🎵 Number of Oscillators N: <strong style={{ color: colors.accent }}>{numMetronomes}</strong>
        </label>
        <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px' }}>
          More metronomes on the platform means more coupling forces — the system is defined as N interacting oscillators.
        </p>
        <input type="range" min="2" max="4" value={numMetronomes}
          onChange={(e) => { setNumMetronomes(Number(e.target.value)); reset(); }}
          style={{ width: '100%', height: '20px', accentColor: '#3b82f6', WebkitAppearance: 'none', touchAction: 'pan-y', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>2 metronomes</span><span>4 metronomes</span>
        </div>
      </div>

      {/* Before/After comparison */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
        <div style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px' }}>
          <p style={{ color: '#ef4444', fontWeight: '700', fontSize: '12px', margin: '0 0 4px' }}>Before (K=0)</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>Random phases. r ≈ 0. No sync. Baseline state.</p>
        </div>
        <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '10px' }}>
          <p style={{ color: '#10b981', fontWeight: '700', fontSize: '12px', margin: '0 0 4px' }}>After (K &gt; K_c)</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>Synchronized. r → 1. Ordered state emerges.</p>
        </div>
      </div>
      {/* Cause-effect insight */}
      <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '12px' }}>
        <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
          <strong>Key insight:</strong> As coupling K increases, the order parameter r (synchronization level) rises from 0 toward 1.
          This result is the Kuramoto model formula: r·e^iψ = (1/N)·Σe^iφⱼ. Higher K leads to faster phase-locking.
          Current sync level r = {(calculateSyncLevel() * 100).toFixed(0)}%.
        </p>
      </div>
    </div>
  );

  // ============ NAV DOTS ============
  const renderNavDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '2px 16px', flexWrap: 'wrap' }}>
      {PHASES.map((p, idx) => (
        <button
          key={p}
          aria-label={`Phase ${idx + 1}: ${PHASE_LABELS[p]}`}
          title={PHASE_LABELS[p]}
          onClick={() => { if (!externalPhase) setInternalPhase(p); }}
          style={{
            width: p === phase ? '24px' : '10px',
            minHeight: '44px',
            borderRadius: '5px',
            border: 'none',
            background: idx < currentPhaseIndex ? colors.success : p === phase ? colors.accent : 'rgba(71,85,105,0.5)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      ))}
      <span style={{ color: colors.textMuted, fontSize: '11px', marginLeft: '8px' }}>
        {currentPhaseIndex + 1}/{PHASES.length}
      </span>
    </div>
  );

  // ============ PROGRESS BAR ============
  const renderProgressBar = () => (
    <div style={{ width: '100%', height: '4px', background: 'rgba(71,85,105,0.5)', borderRadius: '2px' }}>
      <div style={{ width: `${((currentPhaseIndex + 1) / PHASES.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#a855f7,#7c3aed)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
    </div>
  );

  // ============ NAV BAR ============
  const renderNavBar = (showNext: boolean, nextEnabled: boolean, nextText: string, onNext?: () => void) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '8px 20px 12px', background: 'linear-gradient(to top,rgba(15,23,42,0.98),rgba(15,23,42,0.9))', borderTop: '1px solid rgba(148,163,184,0.2)', zIndex: 1000 }}>
      {renderProgressBar()}
      {renderNavDots()}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={() => onBack?.()}
          aria-label="Back"
          style={{ flex: '0 0 auto', padding: '12px 20px', minHeight: '44px', background: 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.15s' }}>
          Back
        </button>
        {showNext && (
          <button
            onClick={() => { if (onNext) onNext(); else advancePhase(); }}
            disabled={!nextEnabled}
            aria-label="Next"
            style={{ flex: 1, padding: '12px 24px', minHeight: '44px', background: nextEnabled ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '12px', color: nextEnabled ? colors.textPrimary : colors.textMuted, fontSize: '15px', fontWeight: 'bold', cursor: nextEnabled ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s' }}>
            {nextText}
          </button>
        )}
      </div>
    </div>
  );

  // ============ QUESTIONS ============
  const testQuestions = [
    {
      id: 1,
      question: 'A physicist places 4 identical metronomes (each ticking at 60 BPM) on a wooden board that rests on two rolling cylinders. She starts them all at different random phases. The Kuramoto coupling constant K = 1.5. What happens over time?',
      options: [
        { id: 'a', text: 'A) They continue swinging randomly forever' },
        { id: 'b', text: 'B) They spontaneously synchronize to the same phase', correct: true },
        { id: 'c', text: 'C) They gradually all stop due to friction' },
        { id: 'd', text: 'D) One speeds up while the others slow down' },
      ],
      explanation: 'The movable platform transfers momentum between metronomes (coupling). This is the Kuramoto model: phase coupling causes spontaneous synchronization when K exceeds the critical coupling K_c.',
    },
    {
      id: 2,
      question: 'In the same experiment, the physicist bolts the wooden board firmly to a table so it cannot move. Now she starts the metronomes at random phases again with K effectively = 0. What happens?',
      options: [
        { id: 'a', text: 'A) They synchronize faster because the board is stable' },
        { id: 'b', text: 'B) They do not synchronize — no coupling means no phase locking', correct: true },
        { id: 'c', text: 'C) They synchronize slower but eventually reach phase lock' },
        { id: 'd', text: 'D) Two of them sync but the other two remain random' },
      ],
      explanation: 'Without the movable platform, the coupling path K = 0. The Kuramoto formula requires K > K_c for synchronization. With K = 0, each metronome evolves independently at its natural frequency.',
    },
    {
      id: 3,
      question: 'The heart\'s sinoatrial (SA) node contains ~10,000 pacemaker cells that naturally fire at slightly different rates (ranging 58–72 BPM). Yet your heart beats at a steady coordinated ~72 BPM. This is because:',
      options: [
        { id: 'a', text: 'A) A master cell acts as a dictator and overrides all others' },
        { id: 'b', text: 'B) The cells couple through gap junctions — a biological Kuramoto model', correct: true },
        { id: 'c', text: 'C) The brain sends a synchronized signal 72 times per minute' },
        { id: 'd', text: 'D) All pacemaker cells have exactly the same intrinsic frequency' },
      ],
      explanation: 'Gap junctions provide ionic coupling (K > K_c) between pacemaker cells. This is exactly the Kuramoto model in biology: the order parameter r approaches 1, meaning near-perfect synchronization despite natural frequency spread.',
    },
    {
      id: 4,
      question: 'London\'s Millennium Bridge (opened June 2000) began swaying laterally on opening day when 90,000 people crossed it. Engineers found that pedestrians were unconsciously synchronizing their footsteps to the bridge\'s resonant frequency of ~0.5 Hz. The coupling mechanism was:',
      options: [
        { id: 'a', text: 'A) Pedestrians deliberately matched each other\'s steps' },
        { id: 'b', text: 'B) The swaying bridge provided feedback coupling to pedestrian gait', correct: true },
        { id: 'c', text: 'C) Sound waves from footsteps caused resonance' },
        { id: 'd', text: 'D) Magnetic forces between iron-soled shoes' },
      ],
      explanation: 'The bridge swaying at ~0.5 Hz acted as a shared platform — exactly like the metronome board. This positive feedback (bridge motion → sync gait → more force → more sway) led to dangerous resonance. Engineers added 37 dampers to break coupling.',
    },
    {
      id: 5,
      question: 'The Kuramoto order parameter is defined as r = |(1/N)·Σe^iφⱼ|. When r = 1.0, the oscillators are:',
      options: [
        { id: 'a', text: 'A) All completely out of phase (maximum chaos)' },
        { id: 'b', text: 'B) Perfectly synchronized (all phases identical)', correct: true },
        { id: 'c', text: 'C) Oscillating at exactly twice their natural frequency' },
        { id: 'd', text: 'D) In a state of quantum superposition' },
      ],
      explanation: 'When all phase angles φⱼ are equal, e^iφⱼ all point in the same direction, so their average magnitude is 1. When phases are random, the vectors cancel and r → 0. The equation r = |(1/N)·Σe^iφⱼ| measures this from 0 (chaos) to 1 (sync).',
    },
    {
      id: 6,
      question: 'A power engineer monitors two generators that must remain phase-locked at 60 Hz. Generator A suddenly loses load and starts accelerating toward 60.1 Hz. The electrical grid coupling provides a restoring torque. This is analogous to:',
      options: [
        { id: 'a', text: 'A) The metronomes having different lengths and weights' },
        { id: 'b', text: 'B) The platform transferring momentum to restore phase alignment', correct: true },
        { id: 'c', text: 'C) A metronome that has been physically stopped' },
        { id: 'd', text: 'D) Two metronomes on separate non-connected platforms' },
      ],
      explanation: 'In both cases, coupling provides a restoring force that pulls the faster oscillator back toward the synchronized frequency. The 2003 Northeast blackout (55 million people affected) occurred when this coupling failed and generators fell out of sync.',
    },
    {
      id: 7,
      question: 'Southeast Asian fireflies (Pteroptyx malaccae) flash in perfect unison across entire forests at night. Each firefly starts with its own internal rhythm (~0.9–1.1 Hz). After several minutes, what does Kuramoto theory predict?',
      options: [
        { id: 'a', text: 'A) Only the loudest fireflies synchronize; the others continue randomly' },
        { id: 'b', text: 'B) All fireflies lock to approximately the mean natural frequency (~1 Hz)', correct: true },
        { id: 'c', text: 'C) They form clusters of two different frequencies' },
        { id: 'd', text: 'D) Synchronization is impossible since they are not physically connected' },
      ],
      explanation: 'Visual light coupling (K > K_c) causes phase locking at the mean frequency ≈ 1 Hz. Each firefly adjusts its flash timing based on neighbors\' flashes — exactly the Kuramoto dφᵢ/dt = ωᵢ + K·Σsin(φⱼ−φᵢ)/N model applied to bioluminescence.',
    },
    {
      id: 8,
      question: 'Two groups of metronomes are placed on separate platforms with no connection between the platforms (K_between = 0). Within each platform, coupling is K = 1.8. What is the expected final state?',
      options: [
        { id: 'a', text: 'A) All metronomes on both platforms eventually synchronize together' },
        { id: 'b', text: 'B) Each platform synchronizes internally but the two groups are independent', correct: true },
        { id: 'c', text: 'C) No synchronization occurs on either platform' },
        { id: 'd', text: 'D) The heavier platform dominates and overrides the other' },
      ],
      explanation: 'Synchronization requires a physical coupling path. Within each platform K = 1.8 > K_c, so each group phase-locks. Between platforms K = 0, so they evolve independently and may end up at different phases — just like isolated power grid islands.',
    },
    {
      id: 9,
      question: 'A researcher increases coupling K from 0.5 to 2.5 (K_c ≈ 1.0). Using the Kuramoto model, what happens to the order parameter r?',
      options: [
        { id: 'a', text: 'A) r stays near 0 because the system is chaotic' },
        { id: 'b', text: 'B) r jumps from near 0 to near 1 as K passes K_c', correct: true },
        { id: 'c', text: 'C) r decreases because more coupling creates more interference' },
        { id: 'd', text: 'D) r oscillates between 0 and 1 periodically' },
      ],
      explanation: 'The Kuramoto model predicts a phase transition at K = K_c. Below K_c, r ≈ 0 (incoherent). Above K_c, r grows as r ∝ √(1 − K_c/K). At K = 2.5 with K_c = 1.0, r ≈ 0.77. This is analogous to a ferromagnetic phase transition.',
    },
    {
      id: 10,
      question: 'Why is metronome synchronization called "self-organization"? A philosopher asks: isn\'t someone organizing them by placing them on the platform?',
      options: [
        { id: 'a', text: 'A) Because the experimenter actively pushes the platform to help them sync' },
        { id: 'b', text: 'B) Order emerges spontaneously from local interactions without external direction', correct: true },
        { id: 'c', text: 'C) The metronomes have AI that coordinates their behavior' },
        { id: 'd', text: 'D) It\'s not self-organization — it requires the platform, so an engineer organized it' },
      ],
      explanation: 'Self-organization means: given initial conditions and coupling rules, order emerges without external controllers. The experimenter sets the initial conditions but the synchronization itself arises from local interactions (dφᵢ/dt = ωᵢ + K·Σsin(φⱼ−φᵢ)/N). No one directs which metronome leads.',
    },
  ];

  const predictions = [
    { id: 'chaos', text: 'They continue swinging randomly forever' },
    { id: 'stop', text: 'They eventually all stop due to friction' },
    { id: 'sync', text: 'They spontaneously synchronize!', correct: true },
    { id: 'faster', text: 'One speeds up and the others slow down' },
  ];

  const twistPredictions = [
    { id: 'magnetic', text: 'Magnetic attraction between the metronomes' },
    { id: 'sound', text: 'Sound waves carry timing information between them' },
    { id: 'platform', text: 'The movable platform transfers momentum between them', correct: true },
    { id: 'air', text: 'Air currents from the pendulums push neighbors' },
  ];

  const transferApplications = [
    {
      id: 0,
      title: '💓 Cardiac Pacemaker Cells',
      description: 'Your sinoatrial node contains ~10,000 pacemaker cells that synchronize through gap junctions — ionic coupling analogous to the movable platform. Natural frequency spread: 55–75 BPM; synchronized output: ~72 BPM. When this synchronization fails, atrial fibrillation occurs, affecting 2.7 million Americans.',
      stats: '~10,000 cells · 60–100 BPM · 3 billion beats in lifetime',
      insight: 'Pacemaker implants work by forcing r → 1 with a strong external oscillator. Cardiac resynchronization therapy (CRT) treats heart failure by resyncing left and right ventricles using the same Kuramoto principles.',
      companies: 'Medtronic, Abbott, Boston Scientific',
    },
    {
      id: 1,
      title: '🌉 Millennium Bridge (London)',
      description: 'Opened June 10, 2000; closed June 12. On opening day, ~2,000 pedestrians\' lateral footstep forces (at ~0.5 Hz) coupled to the bridge resonant frequency through platform feedback. The bridge swayed up to 70mm. Engineers retrofitted 37 fluid-viscous dampers (£5M) to break the coupling — exactly what K → 0 does in the Kuramoto model.',
      stats: '£5M fix · 70mm max sway · 0.5 Hz resonance · 37 dampers installed',
      insight: 'Arup engineers modeled pedestrians as ~2,000 coupled oscillators on the bridge platform. The synchronization threshold was reached at ~156 people on one span — matching K > K_c theory.',
      companies: 'Arup, Mott MacDonald, WSP',
    },
    {
      id: 2,
      title: '⚡ Power Grid Frequency Control',
      description: 'The US Eastern Interconnection has ~12,000 generators that must all remain phase-locked at exactly 60 Hz (±0.05 Hz normal variation). The 2003 Northeast Blackout began when generators in Ohio fell out of sync with the grid due to transmission line failures — losing coupling (K → 0). Within 8 seconds, 55 million people lost power across 8 US states and Ontario.',
      stats: '60 Hz target · ±0.05 Hz tolerance · 12,000 generators · 55M affected in 2003',
      insight: 'Grid operators use Automatic Generation Control (AGC) to maintain synchronization — it\'s equivalent to providing continuous coupling corrections dφᵢ/dt = ωᵢ + K_eff·Σsin(φⱼ−φᵢ)/N, where K_eff depends on transmission line reactance.',
      companies: 'GE Grid Solutions, Siemens Energy, ABB Power Grids',
    },
    {
      id: 3,
      title: '🧠 Neural Oscillations & EEG',
      description: 'Brain waves (alpha 8–13 Hz, beta 13–30 Hz, gamma 30–100 Hz) arise from billions of neurons acting as coupled oscillators. Epileptic seizures occur when r → 1 pathologically (too much synchronization). Parkinson\'s disease involves abnormal synchronization in the basal ganglia at ~20 Hz beta frequency. 86 billion neurons; $15B neurotechnology market by 2026.',
      stats: '86B neurons · 8–13 Hz alpha · $15B market · 3M Parkinson\'s patients in US',
      insight: 'Deep Brain Stimulation (DBS) for Parkinson\'s works by desynchronizing pathological beta oscillations — effectively reducing r from ~0.95 back toward 0.2. It\'s the Kuramoto model working in reverse: K_applied < −K_c.',
      companies: 'Neuralink, Abbott Neuromodulation, Medtronic DBS, Kernel',
    },
  ];

  // ============ PHASE RENDERS ============

  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: '900', margin: '0 0 8px' }}>🎵 The Dancing Metronomes</h1>
            <p style={{ color: colors.accent, fontSize: '18px', fontWeight: '700', margin: 0 }}>Game 116: Metronome Synchronization</p>
          </div>
          {renderVisualization()}
          <div style={{ padding: '16px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: '1px solid rgba(168,85,247,0.2)' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>🤯 Spontaneous Order!</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontWeight: 400 }}>
                Place several metronomes on a movable board, start them at completely random times,
                and watch them <strong style={{ color: colors.accent }}>spontaneously synchronize</strong> within minutes —
                with no one controlling them!
              </p>
              <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: '1.5', margin: 0, fontWeight: 500 }}>
                This "self-organization" phenomenon appears in your heartbeat, firefly forests, power grids, and brain waves.
                How does it work? Explore and find out.
              </p>
            </div>
          </div>
        </div>
        {renderNavBar(true, true, "Explore →")}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '8px' }}>📋 The Setup</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Multiple metronomes are placed on a lightweight platform resting on rollers. They are started at completely random phase offsets.
              What do you predict happens over time?
            </p>
          </div>
          <div style={{ padding: '0 16px' }}>
            <p style={{ color: colors.accent, fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Choose your prediction:</p>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', minHeight: '44px', marginBottom: '10px', background: prediction === p.id ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'rgba(51,65,85,0.7)', border: prediction === p.id ? '2px solid #c4b5fd' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, textAlign: 'left', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
        {renderNavBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '800', margin: 0 }}>🔬 Experiment with Coupling!</h2>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Observe how increasing K causes faster synchronization</p>
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

              {renderVisualization()}

            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {renderControls()}

            </div>

          </div>
          <div style={{ background: colors.bgCard, margin: '0 16px 16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '8px' }}>📐 What You're Seeing</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: '0 0 8px' }}>
              The graph shows how the order parameter r (synchronization level) evolves over time. The formula
              r·e^iψ = (1/N)·Σe^iφⱼ measures this, where r = 0 means random phases and r = 1 means perfect sync.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: '0 0 8px' }}>
              The Kuramoto model predicts that when coupling K exceeds critical coupling K_c, the system transitions
              from incoherence (r ≈ 0) to synchronization (r → 1). Higher K leads to faster, more complete phase locking —
              that's why looser platforms enable faster synchronization.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              <strong>Why this matters:</strong> This is important for real-world engineering — it explains how
              engineers design cardiac pacemakers, prevent bridge resonance disasters, and maintain power grid stability.
              Industry applications include grid frequency control (GE, Siemens) and neurostimulation technology.
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'See What I Learned')}
      </div>
    );
  }

  if (phase === 'review') {
    const userPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = userPrediction?.correct;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '22px', fontWeight: '800' }}>{isCorrect ? 'Excellent Prediction!' : 'Surprising Result!'}</h2>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '12px' }}>
              <strong>Your prediction:</strong> "{userPrediction?.text || 'None made'}"
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '12px' }}>
              As you saw in the experiment, the metronomes <strong style={{ color: colors.accent }}>spontaneously synchronize</strong> through
              the platform. This result is explained by the <strong>Kuramoto model</strong>:
            </p>
            <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <p style={{ color: colors.accent, fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>dφᵢ/dt = ωᵢ + (K/N)·Σsin(φⱼ − φᵢ)</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                Phase rate = natural frequency + coupling correction (proportional to phase difference)
              </p>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
              <strong>Why does this happen?</strong> Because each metronome's swing pushes the platform, which
              in turn nudges all other metronomes. The coupling force is proportional to sin(φⱼ − φᵢ),
              meaning it drives phases toward each other. The result is phase-locking — an ordered state
              that emerges spontaneously from local interactions without any external controller.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              <strong>The key principle:</strong> When coupling K exceeds a critical threshold K_c, the
              order parameter r transitions from ≈0 (random) to &gt;0 (synchronized). This is a phase transition
              analogous to ferromagnetism. Your observation confirms this theoretical prediction.
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'Ready for the Twist')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', fontWeight: '800' }}>🌀 New Variable: What Causes Coupling?</h2>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '8px' }}>You've seen synchronization happen. Now predict its mechanism.</p>
          </div>
          {renderVisualization()}
          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '14px' }}>
              What is the physical mechanism that couples the metronomes? Watch the visualization and observe what moves.
            </h3>
            {twistPredictions.map((p) => (
              <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                style={{ display: 'block', width: '100%', padding: '14px', minHeight: '44px', marginBottom: '10px', background: twistPrediction === p.id ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(51,65,85,0.7)', border: 'none', borderRadius: '10px', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', transition: 'all 0.15s' }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
        {renderNavBar(true, !!twistPrediction, 'Reveal the Mechanism')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', fontWeight: '800' }}>🌀 Explore the Coupling Mechanism</h2>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>
              Try setting coupling to 0 vs high values to verify what happens to the sync level
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

              {renderVisualization()}

            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {renderControls()}

            </div>

          </div>
          <div style={{ background: colors.bgCard, margin: '0 16px 16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, fontSize: '15px', marginBottom: '8px' }}>🔍 Comparison: Fixed vs Movable Platform</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px', margin: '0 0 6px' }}>K = 0 (Fixed)</p>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>No momentum transfer. Each metronome evolves independently. r stays near 0. No synchronization.</p>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ color: '#10b981', fontWeight: '700', fontSize: '13px', margin: '0 0 6px' }}>K &gt; K_c (Loose)</p>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>Platform transfers momentum. Phase differences decrease. r → 1. Full synchronization.</p>
              </div>
            </div>
          </div>
        </div>
        {renderNavBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const userTwistPrediction = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = userTwistPrediction?.correct;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '22px', fontWeight: '800' }}>{isCorrect ? 'Exactly Right!' : 'Great Thinking!'}</h2>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '12px' }}>
              <strong>Your prediction:</strong> "{userTwistPrediction?.text || 'None made'}"
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The <strong style={{ color: colors.accent }}>movable platform is the coupling medium</strong> — it transfers momentum
              between metronomes. This is why the Kuramoto coupling constant K is proportional to platform mobility.
              When you observed the visualization, the platform (bottom board) was moving: that movement is the coupling term
              K·sin(φⱼ − φᵢ) in the phase equation.
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'See Real Applications')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Metronome Sync"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
      />
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', fontWeight: '800' }}>🌍 Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Coupled oscillator synchronization — the exact physics you explored — appears everywhere in nature and technology.
              Tap each application to learn how Kuramoto's equation applies.
            </p>
          </div>
          {transferApplications.map((app) => (
            <div key={app.id} onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
              style={{ background: transferCompleted.has(app.id) ? 'rgba(16,185,129,0.1)' : colors.bgCard, border: transferCompleted.has(app.id) ? '2px solid rgba(16,185,129,0.4)' : '2px solid transparent', margin: '12px 16px', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>{app.description}</p>
              {transferCompleted.has(app.id) && (
                <>
                  <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', padding: '8px', marginBottom: '6px' }}>
                    <p style={{ color: colors.accent, fontSize: '12px', fontWeight: '600', margin: 0 }}>📊 Key Stats: {app.stats}</p>
                  </div>
                  <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 4px' }}>💡 {app.insight}</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>🏢 Companies: {app.companies}</p>
                </>
              )}
            </div>
          ))}
          {!transferGotIt && (
            <div style={{ padding: '16px' }}>
              <button onClick={() => setTransferGotIt(true)}
                style={{ width: '100%', padding: '14px', minHeight: '44px', background: allCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' }}>
                {allCompleted ? 'Got It ✓' : `Continue (${4 - transferCompleted.size} more to explore)`}
              </button>
            </div>
          )}
        </div>
        {renderNavBar(true, transferGotIt, transferGotIt ? 'Take the Test →' : `Explore All ${4 - transferCompleted.size} Apps`)}
      </div>
    );
  }

  if (phase === 'test') {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px' }}>{correctCount >= 8 ? '🏆' : correctCount >= 6 ? '⭐' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: '900' }}>
                You Scored {correctCount}/10
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px', marginTop: '8px' }}>
                {Math.round(correctCount / 10 * 100)}% — {correctCount >= 8 ? 'Kuramoto Master!' : correctCount >= 6 ? 'Good understanding!' : 'Keep learning!'}
              </p>
            </div>
            {/* Answer review */}
            <div style={{ padding: '0 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Answer Review:</h3>
              {testQuestions.map((q) => {
                const userAnswer = testAnswers[q.id];
                const correctAnswer = q.options.find(o => o.correct)?.id;
                const isRight = userAnswer === correctAnswer;
                return (
                  <div key={q.id} style={{ background: isRight ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isRight ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', margin: '0 0 4px' }}>
                      {isRight ? '✓' : '✗'} Q{q.id}: {q.question.slice(0, 80)}...
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                      Your answer: {q.options.find(o => o.id === userAnswer)?.text?.slice(3) || 'None'} |{' '}
                      Correct: {q.options.find(o => o.correct)?.text?.slice(3)}
                    </p>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '0 16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => { setTestSubmitted(false); setTestAnswers({}); setCurrentQuestionIndex(0); setCheckedAnswer(null); setShowExplanation(false); }}
                style={{ flex: 1, minWidth: '120px', padding: '12px', minHeight: '44px', background: 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '10px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.15s' }}>
                Try Again
              </button>
              <button onClick={() => advancePhase()}
                style={{ flex: 1, minWidth: '120px', padding: '12px', minHeight: '44px', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: '10px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.15s' }}>
                Complete Lesson →
              </button>
            </div>
          </div>
          {renderNavBar(true, true, 'Complete!')}
        </div>
      );
    }

    const currentAnswer = testAnswers[currentQuestion.id];
    const isAnswerChecked = checkedAnswer !== null;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '800', margin: 0 }}>📝 Knowledge Test</h2>
            <p style={{ color: colors.accent, fontSize: '15px', marginTop: '6px' }}>
              Question {currentQuestionIndex + 1} of {testQuestions.length}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
              {testQuestions.map((_, idx) => (
                <button key={idx} onClick={() => { setCurrentQuestionIndex(idx); setCheckedAnswer(null); setShowExplanation(false); }}
                  aria-label={`Question ${idx + 1}`}
                  style={{ width: '12px', height: '12px', borderRadius: '50%', border: 'none', padding: 0, background: idx === currentQuestionIndex ? colors.accent : testAnswers[testQuestions[idx].id] ? colors.success : 'rgba(71,85,105,0.5)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ background: colors.bgCard, margin: '0 16px 12px', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
              {currentQuestion.question}
            </p>
            {currentQuestion.options.map(opt => {
              const isSelected = currentAnswer === opt.id;
              const isCorrectOpt = opt.correct;
              let bg = isSelected ? 'rgba(168,85,247,0.3)' : 'rgba(51,65,85,0.5)';
              let border = isSelected ? '2px solid #a855f7' : '2px solid transparent';
              if (isAnswerChecked) {
                if (isCorrectOpt) { bg = 'rgba(16,185,129,0.3)'; border = '2px solid #10b981'; }
                else if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.3)'; border = '2px solid #ef4444'; }
              }
              return (
                <button key={opt.id}
                  onClick={() => { if (!isAnswerChecked) { setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: opt.id })); setCheckedAnswer(null); setShowExplanation(false); } }}
                  style={{ display: 'block', width: '100%', padding: '12px', minHeight: '44px', marginBottom: '8px', background: bg, border, borderRadius: '10px', color: colors.textSecondary, textAlign: 'left', cursor: isAnswerChecked ? 'default' : 'pointer', fontSize: '13px', transition: 'all 0.15s' }}>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Check Answer button */}
          {currentAnswer && !isAnswerChecked && (
            <div style={{ padding: '0 16px 12px' }}>
              <button onClick={() => { setCheckedAnswer(currentAnswer); setShowExplanation(true); }}
                style={{ width: '100%', padding: '12px', minHeight: '44px', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: '10px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.15s' }}>
                Check Answer ✓
              </button>
            </div>
          )}

          {/* Explanation after checking */}
          {showExplanation && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', margin: '0 16px 12px', padding: '14px' }}>
              <p style={{ color: colors.success, fontWeight: '700', fontSize: '13px', margin: '0 0 6px' }}>
                {testAnswers[currentQuestion.id] === currentQuestion.options.find(o => o.correct)?.id ? '✓ Correct!' : '✗ Incorrect — here\'s why:'}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', padding: '0 16px' }}>
            {currentQuestionIndex > 0 && (
              <button onClick={() => { setCurrentQuestionIndex(prev => prev - 1); setCheckedAnswer(null); setShowExplanation(false); }}
                style={{ flex: 1, padding: '12px', minHeight: '44px', background: 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '10px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.15s' }}>
                ← Previous
              </button>
            )}
            {currentQuestionIndex < testQuestions.length - 1 && isAnswerChecked && (
              <button onClick={() => { setCurrentQuestionIndex(prev => prev + 1); setCheckedAnswer(null); setShowExplanation(false); }}
                style={{ flex: 1, padding: '12px', minHeight: '44px', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: '10px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.15s' }}>
                Next Question →
              </button>
            )}
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '8px 20px 12px', background: 'linear-gradient(to top,rgba(15,23,42,0.98),rgba(15,23,42,0.9))', borderTop: '1px solid rgba(148,163,184,0.2)', zIndex: 1000 }}>
          {renderProgressBar()}
          {renderNavDots()}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={() => onBack?.()}
              aria-label="Back"
              style={{ flex: '0 0 auto', padding: '12px 20px', minHeight: '44px', background: 'rgba(71,85,105,0.5)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' }}>
              Back
            </button>
            {allAnswered && (
              <button onClick={() => { setTestSubmitted(true); onGameEvent?.({ type: 'game_completed', details: { score: testScore, total: testQuestions.length } }); }}
                style={{ flex: 1, padding: '12px', minHeight: '44px', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'opacity 0.15s' }}>
                Submit Test ✓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: '900' }}>Synchronization Master!</h1>
            <p style={{ color: colors.accent, fontSize: '16px', marginTop: '8px' }}>You have completed the Metronome Synchronization game</p>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>🎓 Key Learnings</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Coupled oscillators spontaneously synchronize when K &gt; K_c (Kuramoto model)</li>
              <li>The order parameter r = |(1/N)·Σe^iφⱼ| measures synchronization (0 = chaos, 1 = full sync)</li>
              <li>A shared movable platform acts as coupling medium (transferring momentum)</li>
              <li>Same physics appears in: hearts, fireflies, power grids, brain waves</li>
              <li>This is self-organization: order emerges from local interactions, not external control</li>
            </ul>
          </div>
        </div>
        {renderNavBar(true, true, 'Complete Game')}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>🎵 The Dancing Metronomes</h1>
          <p style={{ color: colors.accent, fontSize: '18px' }}>Game 116: Metronome Synchronization</p>
        </div>
        {renderVisualization()}
        <div style={{ padding: '20px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
              Place several metronomes on a movable board and watch them <strong style={{ color: colors.accent }}>spontaneously synchronize</strong>!
            </p>
          </div>
        </div>
      </div>
      {renderNavBar(true, true, "Explore →")}
    </div>
  );
};

export default MetronomeSyncRenderer;
