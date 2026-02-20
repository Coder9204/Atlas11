import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 113: RATTLEBACK REVERSAL
// The mysterious spinning top that reverses direction
// Demonstrates coupled oscillations, asymmetric inertia, and energy transfer
// ============================================================================

const realWorldApps = [
  {
    icon: '\u{1F6F8}',
    title: 'Spacecraft Attitude Dynamics',
    short: 'Understanding how satellites can unexpectedly tumble due to asymmetric mass distributions',
    tagline: 'When spacecraft develop a mind of their own',
    description: 'Satellites and space probes with asymmetric mass distributions can exhibit rattleback-like behavior, where intended spin about one axis couples into unwanted rotation about others. This has caused mission-threatening tumbles in spacecraft when solar panels deploy asymmetrically or fuel sloshes unpredictably. Understanding coupled oscillations is critical for attitude control system design.',
    connection: 'The rattleback physics of coupled oscillations and asymmetric inertia directly applies to predicting and preventing unwanted spacecraft dynamics.',
    howItWorks: 'Spacecraft designers use moment of inertia tensors and coupled dynamics analysis to predict potential instabilities. Attitude control systems monitor for unexpected oscillations and can dampen them using reaction wheels or thrusters before they grow into full reversals.',
    stats: [
      { value: '6-DOF', label: 'Rotational degrees of freedom', icon: '\u{1F504}' },
      { value: '$400M', label: 'Average satellite value', icon: '\u{1F4B0}' },
      { value: '<0.01\u00B0', label: 'Pointing accuracy required', icon: '\u{1F3AF}' }
    ],
    examples: ['Explorer 1 spin stabilization', 'Intelsat fuel slosh issues', 'ISS solar array dynamics', 'Mars Climate Orbiter attitude'],
    companies: ['SpaceX', 'Boeing Satellites', 'Lockheed Martin Space', 'Northrop Grumman'],
    futureImpact: 'Mega-constellations with thousands of satellites require reliable attitude control. Understanding rattleback-like dynamics helps prevent on-orbit failures.',
    color: '#6366F1'
  },
  {
    icon: '\u{1F3CC}\uFE0F',
    title: 'Golf Ball Dimple Design',
    short: 'Optimizing asymmetric ball surfaces to control spin-coupling effects during flight',
    tagline: 'Engineering the perfect dimple pattern',
    description: 'Golf ball dimple patterns must be carefully designed to avoid rattleback-like spin instabilities during flight. Asymmetric wear patterns or manufacturing defects can cause the ball to develop coupled oscillations that hurt accuracy. Premium balls use sophisticated dimple geometries that maintain stable spin throughout their trajectory.',
    connection: 'Like a rattleback, a spinning golf ball with asymmetries can develop coupled oscillations that transfer energy between spin axes - affecting distance and accuracy.',
    howItWorks: 'Modern golf balls use dimple patterns optimized through computational fluid dynamics and high-speed camera analysis. The patterns maintain symmetric drag even as the ball spins at 2000-3000 RPM, preventing the coupling effects that could destabilize flight.',
    stats: [
      { value: '300-500', label: 'Dimples per ball', icon: '\u26F3' },
      { value: '3000 RPM', label: 'Typical spin rate', icon: '\u{1F300}' },
      { value: '$1.8B', label: 'Global golf ball market', icon: '\u{1F4C8}' }
    ],
    examples: ['Titleist Pro V1', 'Callaway Chrome Soft', 'TaylorMade TP5', 'Bridgestone Tour B'],
    companies: ['Titleist', 'Callaway', 'TaylorMade', 'Bridgestone Golf'],
    futureImpact: 'AI-designed dimple patterns and new materials could further reduce spin instabilities, helping golfers achieve more consistent ball flight.',
    color: '#10B981'
  },
  {
    icon: '\u{1F504}',
    title: 'Washing Machine Balancing',
    short: 'Preventing spin reversals and violent oscillations in high-speed drum appliances',
    tagline: 'Taming the wild spin cycle',
    description: 'Washing machine drums spinning at 1000+ RPM with unbalanced loads can exhibit rattleback-like dynamics where rotational energy couples into violent oscillations. Unbalanced loads create asymmetric mass distributions that lead to walking machines, bearing damage, and dangerous vibrations. Modern machines use sophisticated detection and compensation systems.',
    connection: 'An unbalanced washing machine drum is essentially a giant rattleback - asymmetric mass distribution causes energy to transfer between rotation and oscillation modes.',
    howItWorks: 'Sensors detect vibration patterns during spin-up. When coupling oscillations are detected, the machine pauses, redistributes the load, and restarts. Some machines use counterbalance weights that automatically shift to compensate for uneven loads.',
    stats: [
      { value: '1400 RPM', label: 'Maximum spin speeds', icon: '\u{1F4A8}' },
      { value: '10+ kg', label: 'Unbalanced load tolerance', icon: '\u2696\uFE0F' },
      { value: '$50B', label: 'Global appliance market', icon: '\u{1F3ED}' }
    ],
    examples: ['Samsung FlexWash', 'LG TurboWash', 'Miele W1', 'Bosch Serie 8'],
    companies: ['Samsung', 'LG Electronics', 'Whirlpool', 'BSH (Bosch/Siemens)'],
    futureImpact: 'Machine learning algorithms will better predict and prevent oscillation modes, enabling faster spin speeds and more efficient water extraction.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F3A8}',
    title: 'Physics Toys and Education',
    short: 'Using rattlebacks to demonstrate counterintuitive physics of angular momentum',
    tagline: 'The toy that defies intuition',
    description: 'Rattlebacks have been used for centuries to demonstrate that physics can surprise us. They serve as hands-on examples of coupled oscillations, non-principal axis rotation, and energy transfer between modes. From ancient Celtic stones to modern science museum exhibits, rattlebacks challenge students to think deeply about rotational dynamics.',
    connection: 'Rattlebacks are direct physical demonstrations of the coupled oscillation physics explored in this game - showing how asymmetric inertia leads to spin reversal.',
    howItWorks: 'The rattleback shape has principal inertia axes that are tilted relative to its geometric axes. When spun in the unstable direction, small wobbles grow through feedback until enough energy has transferred to reverse the spin direction entirely.',
    stats: [
      { value: '5000+', label: 'Years of known history', icon: '\u{1F4DC}' },
      { value: 'Millions', label: 'Sold as physics toys', icon: '\u{1F381}' },
      { value: '100+', label: 'Research papers published', icon: '\u{1F4DA}' }
    ],
    examples: ['Celtic stones', 'Celt tops', 'Science museum exhibits', 'Physics classroom demos'],
    companies: ['Grand Illusions', 'Educational Innovations', 'Arbor Scientific', 'TEDCO Toys'],
    futureImpact: 'Virtual reality and haptic feedback technologies may soon allow students to feel and explore rattleback physics without physical toys.',
    color: '#8B5CF6'
  }
];

interface RattlebackRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
  gamePhase?: string;
}

// All 10 phases in order
const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Color palette with proper contrast - HIGH CONTRAST text colors
const colors = {
  // Text colors - HIGH CONTRAST (brightness >= 180)
  textPrimary: '#f8fafc',    // brightness ~250
  textSecondary: '#e2e8f0',  // brightness ~228
  textMuted: '#cbd5e1',      // brightness ~210

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Rattleback colors
  stoneTop: '#a78bfa',
  stoneSide: '#7c3aed',
  stoneHighlight: '#c4b5fd',
  stoneShadow: '#5b21b6',

  // Rotation indicators
  spinCW: '#22c55e',
  spinCCW: '#ef4444',
  wobble: '#f59e0b',

  // Surface
  surface: '#334155',
  surfaceHighlight: '#475569',

  // UI colors
  accent: '#a78bfa',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const RattlebackRenderer: React.FC<RattlebackRendererProps> = ({
  phase: propPhase,
  onPhaseComplete,
  onPredictionMade,
  gamePhase,
}) => {
  // Use gamePhase if provided, otherwise propPhase, default to hook
  const [internalPhase, setInternalPhase] = useState<string>('hook');

  // Determine effective phase
  const effectivePhase = gamePhase || propPhase || internalPhase;
  const phase = PHASES.includes(effectivePhase) ? effectivePhase : 'hook';

  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [asymmetry, setAsymmetry] = useState(35); // 0-100 (shape asymmetry)
  const [initialSpin, setInitialSpin] = useState(50); // 0-100 (initial angular velocity)
  const [spinDirection, setSpinDirection] = useState<'preferred' | 'reverse'>('preferred');

  // Simulation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpin, setCurrentSpin] = useState(0);
  const [wobbleAmount, setWobbleAmount] = useState(0);
  const [hasReversed, setHasReversed] = useState(false);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // SVG ref for dynamic content tracking
  const svgContentRef = useRef<string>('');

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

  // ==================== NAVIGATION ====================
  const currentPhaseIndex = PHASES.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < PHASES.length - 1 && phase !== 'test';

  const goToNextPhase = useCallback(() => {
    if (canGoNext) {
      const nextPhase = PHASES[currentPhaseIndex + 1];
      setInternalPhase(nextPhase);
      onPhaseComplete?.();
    }
  }, [currentPhaseIndex, canGoNext, onPhaseComplete]);

  const goToPrevPhase = useCallback(() => {
    if (canGoBack) {
      setInternalPhase(PHASES[currentPhaseIndex - 1]);
    }
  }, [currentPhaseIndex, canGoBack]);

  const goToPhase = useCallback((index: number) => {
    if (index >= 0 && index < PHASES.length) {
      setInternalPhase(PHASES[index]);
    }
  }, []);

  // ==================== PHYSICS SIMULATION ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.04);

      if (isSpinning) {
        const asymmetryFactor = asymmetry / 100;
        const friction = 0.995;

        setCurrentSpin(prev => {
          let newSpin = prev * friction;

          if (spinDirection === 'reverse' && asymmetryFactor > 0.2) {
            setWobbleAmount(w => {
              const newWobble = w + Math.abs(prev) * 0.1 * asymmetryFactor;
              if (newWobble > 0.5 && !hasReversed && prev < 0) {
                setHasReversed(true);
                return newWobble * 0.3;
              }
              return Math.min(newWobble, 1);
            });
            newSpin *= (1 - asymmetryFactor * 0.1);
          } else {
            setWobbleAmount(w => w * 0.95);
          }

          if (hasReversed && newSpin < 0.1) {
            return Math.abs(newSpin) + 0.2;
          }

          if (Math.abs(newSpin) < 0.01) {
            setIsSpinning(false);
            return 0;
          }

          return newSpin;
        });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isAnimating, isSpinning, asymmetry, spinDirection, hasReversed]);

  // Start spinning
  const startSpin = () => {
    const spinValue = (initialSpin / 100) * 2;
    setCurrentSpin(spinDirection === 'preferred' ? spinValue : -spinValue);
    setWobbleAmount(0);
    setHasReversed(false);
    setIsSpinning(true);
  };

  // ==================== COMPUTED VALUES ====================
  // These depend on slider values so the SVG updates synchronously
  const asymmetryOffset = (asymmetry / 100) * 20;
  const couplingStrength = (asymmetry / 100);
  const reversalTime = asymmetry > 20 ? (100 / asymmetry * 2).toFixed(1) : 'N/A';
  const wobbleFreq = (3 + asymmetry * 0.05).toFixed(1);
  const energyTransfer = (asymmetry * initialSpin / 100).toFixed(1);

  // ==================== RENDER NAVIGATION BAR ====================
  const renderNavigationBar = () => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
      role="navigation"
      aria-label="Game navigation"
    >
      {/* Back Button */}
      <button
        onClick={goToPrevPhase}
        disabled={!canGoBack}
        aria-label="Back"
        style={{
          minHeight: '44px',
          minWidth: '44px',
          padding: '8px 16px',
          background: canGoBack ? 'rgba(71, 85, 105, 0.6)' : 'rgba(71, 85, 105, 0.3)',
          border: 'none',
          borderRadius: '8px',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          fontSize: '14px',
          fontWeight: '600',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          opacity: canGoBack ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
        }}
      >
        <span aria-hidden="true">{'\u2190'}</span> Back
      </button>

      {/* Progress Dots */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}
        role="tablist"
        aria-label="Phase navigation"
      >
        {PHASES.map((p, idx) => (
          <button
            key={p}
            onClick={() => goToPhase(idx)}
            role="tab"
            aria-selected={idx === currentPhaseIndex}
            aria-label={`Phase ${idx + 1}: ${p.replace('_', ' ')}`}
            style={{
              width: idx === currentPhaseIndex ? '24px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: idx < currentPhaseIndex
                ? colors.success
                : idx === currentPhaseIndex
                ? colors.accent
                : 'rgba(71, 85, 105, 0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={goToNextPhase}
        disabled={!canGoNext}
        aria-label="Next"
        style={{
          minHeight: '44px',
          minWidth: '44px',
          padding: '8px 16px',
          background: canGoNext
            ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
            : 'rgba(71, 85, 105, 0.3)',
          border: 'none',
          borderRadius: '8px',
          color: canGoNext ? colors.textPrimary : colors.textMuted,
          fontSize: '14px',
          fontWeight: '600',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : (phase === 'test' ? 0.4 : 0.5),
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
        }}
      >
        Next <span aria-hidden="true">{'\u2192'}</span>
      </button>
    </nav>
  );

  // ==================== RENDER PROGRESS BAR ====================
  const renderProgressBar = () => {
    const progress = ((currentPhaseIndex + 1) / PHASES.length) * 100;
    return (
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${Math.round(progress)}%`}
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(71, 85, 105, 0.4)',
          zIndex: 999,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    );
  };

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    // Physics graph data: coupling strength curve as function of asymmetry
    // Generates a smooth curve with many L-command points
    const graphPoints: string[] = [];
    const graphX0 = 40;
    const graphY0 = 330;
    const graphW = 320;
    const graphH = 120;
    for (let i = 0; i <= 30; i++) {
      const frac = i / 30;
      const x = graphX0 + frac * graphW;
      // Coupling strength rises non-linearly with asymmetry, scaled by spin
      const spinScale = 0.5 + (initialSpin / 100) * 0.5;
      const val = Math.pow(frac, 1.5) * spinScale;
      const y = graphY0 - val * graphH;
      graphPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = graphPoints.join(' ');

    // Interactive marker position on curve based on asymmetry slider
    const markerFrac = asymmetry / 100;
    const spinScale = 0.5 + (initialSpin / 100) * 0.5;
    const markerX = graphX0 + markerFrac * graphW;
    const markerVal = Math.pow(markerFrac, 1.5) * spinScale;
    const markerY = graphY0 - markerVal * graphH;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
          data-testid="rattleback-svg"
          data-svg-state={`asymmetry-${asymmetry}-spin-${initialSpin}`}
        >
          <defs>
            <linearGradient id="stoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.stoneHighlight} />
              <stop offset="50%" stopColor={colors.stoneTop} />
              <stop offset="100%" stopColor={colors.stoneShadow} />
            </linearGradient>
            <linearGradient id="surfaceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.surfaceHighlight} />
              <stop offset="100%" stopColor={colors.surface} />
            </linearGradient>
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <g>
            <text x="200" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
              Rattleback Coupling Diagram
            </text>
          </g>

          {/* Rattleback Top View Group */}
          <g>
            <text x="200" y="40" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="normal">
              Top View
            </text>
            <ellipse
              cx={200 + asymmetryOffset * 0.5}
              cy={80}
              rx={70 + asymmetry * 0.15}
              ry={30 - asymmetry * 0.05}
              fill="url(#stoneGradient)"
              stroke={colors.stoneShadow}
              strokeWidth="2"
              transform={`rotate(${asymmetry / 5}, ${200 + asymmetryOffset * 0.5}, 80)`}
              data-asymmetry={asymmetry}
            />
            <line
              x1={140}
              y1={80}
              x2={260 + asymmetryOffset}
              y2={80}
              stroke={colors.stoneHighlight}
              strokeWidth="1.5"
              strokeDasharray="5,5"
              opacity="0.5"
            />
            <circle
              cx={200 + asymmetryOffset * 0.3}
              cy={80 + asymmetryOffset * 0.15}
              r="4"
              fill={colors.wobble}
              opacity="0.8"
            />
            <text x={216 + asymmetryOffset * 0.3} y={74} fill={colors.wobble} fontSize="11">
              CoM
            </text>
          </g>

          {/* Side view group */}
          <g>
            <text x="200" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="normal">
              Side Profile
            </text>
            <line x1={130} y1={160} x2={270 + asymmetryOffset * 0.5} y2={160} stroke={colors.surface} strokeWidth="1" opacity="0.5" />
            <path
              d={`M 130 160 Q ${200 + asymmetryOffset * 0.3} ${50 - asymmetry * 0.3} ${270 + asymmetryOffset * 0.5} 160`}
              fill="none"
              stroke={colors.stoneTop}
              strokeWidth="3"
            />
          </g>

          {/* Divider */}
          <line x1={40} y1={170} x2={360} y2={170} stroke={colors.surface} strokeWidth="0.5" opacity="0.3" />

          {/* Graph Group */}
          <g>
            <text x="200" y="185" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              Coupling Strength vs Asymmetry
            </text>

            {/* Formula */}
            <text x="200" y="200" textAnchor="middle" fill={colors.accent} fontSize="11">
              E = I{'\u00B2'} {'\u00D7'} {'\u03C9'} {'\u00D7'} sin({'\u03B1'}) | coupling {'\u221D'} asymmetry{'\u00B3'}{'\u00B2'}
            </text>

            {/* Y-axis label */}
            <text x="14" y="270" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90, 14, 270)">
              Energy Transfer
            </text>

            {/* X-axis label */}
            <text x="200" y="358" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              Asymmetry (%)
            </text>

            {/* Grid lines (horizontal) */}
            <line x1={graphX0} y1={graphY0} x2={graphX0 + graphW} y2={graphY0} stroke={colors.surface} strokeWidth="1" opacity="0.6" />
            <line x1={graphX0} y1={graphY0 - graphH * 0.25} x2={graphX0 + graphW} y2={graphY0 - graphH * 0.25} stroke={colors.surface} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
            <line x1={graphX0} y1={graphY0 - graphH * 0.5} x2={graphX0 + graphW} y2={graphY0 - graphH * 0.5} stroke={colors.surface} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
            <line x1={graphX0} y1={graphY0 - graphH * 0.75} x2={graphX0 + graphW} y2={graphY0 - graphH * 0.75} stroke={colors.surface} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
            <line x1={graphX0} y1={graphY0 - graphH} x2={graphX0 + graphW} y2={graphY0 - graphH} stroke={colors.surface} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />

            {/* Vertical axis */}
            <line x1={graphX0} y1={graphY0} x2={graphX0} y2={graphY0 - graphH} stroke={colors.textMuted} strokeWidth="1" opacity="0.6" />

            {/* Tick marks on X-axis */}
            <line x1={graphX0 + graphW * 0.25} y1={graphY0} x2={graphX0 + graphW * 0.25} y2={graphY0 + 5} stroke={colors.textMuted} strokeWidth="1" opacity="0.5" />
            <line x1={graphX0 + graphW * 0.5} y1={graphY0} x2={graphX0 + graphW * 0.5} y2={graphY0 + 5} stroke={colors.textMuted} strokeWidth="1" opacity="0.5" />
            <line x1={graphX0 + graphW * 0.75} y1={graphY0} x2={graphX0 + graphW * 0.75} y2={graphY0 + 5} stroke={colors.textMuted} strokeWidth="1" opacity="0.5" />

            {/* X-axis tick labels */}
            <text x={graphX0} y={graphY0 + 14} textAnchor="middle" fill={colors.textMuted} fontSize="11">0</text>
            <text x={graphX0 + graphW * 0.5} y={graphY0 + 14} textAnchor="middle" fill={colors.textMuted} fontSize="11">50</text>
            <text x={graphX0 + graphW} y={graphY0 + 14} textAnchor="middle" fill={colors.textMuted} fontSize="11">100</text>

            {/* Coupling strength curve - 31 points */}
            <path
              d={curvePath}
              fill="none"
              stroke={colors.accent}
              strokeWidth="2.5"
            />

            {/* Reference line at current asymmetry */}
            <line
              x1={markerX}
              y1={graphY0}
              x2={markerX}
              y2={markerY}
              stroke={colors.wobble}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.7"
            />

            {/* Interactive marker - highlighted with glow filter */}
            <circle
              cx={markerX}
              cy={markerY}
              r="8"
              fill={colors.wobble}
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#glowFilter)"
            />

            {/* Value readout near marker */}
            <text
              x={markerX > 300 ? markerX - 40 : markerX + 14}
              y={markerY - 12}
              fill={colors.textPrimary}
              fontSize="11"
              fontWeight="bold"
            >
              {(markerVal * 100).toFixed(0)}%
            </text>
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
      boxShadow: '0 0 15px rgba(167, 139, 250, 0.15)',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        Control the Rattleback:
      </div>

      {/* Direction Selection */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
        <button
          onClick={() => setSpinDirection('preferred')}
          style={{
            flex: 1,
            padding: '12px',
            minHeight: '44px',
            background: spinDirection === 'preferred'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '13px',
            fontWeight: spinDirection === 'preferred' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Preferred (CW)
        </button>
        <button
          onClick={() => setSpinDirection('reverse')}
          style={{
            flex: 1,
            padding: '12px',
            minHeight: '44px',
            background: spinDirection === 'reverse'
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '13px',
            fontWeight: spinDirection === 'reverse' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Reverse (CCW)
        </button>
      </div>

      {/* Spin Button */}
      <button
        onClick={startSpin}
        disabled={isSpinning}
        style={{
          padding: '14px',
          minHeight: '44px',
          background: isSpinning
            ? 'rgba(71, 85, 105, 0.5)'
            : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isSpinning ? 'not-allowed' : 'pointer',
          opacity: isSpinning ? 0.7 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {isSpinning ? 'Spinning...' : 'Spin It!'}
      </button>

      {/* Asymmetry Control - first slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: '500' }}>
          Shape Asymmetry: {asymmetry}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={asymmetry}
          onChange={(e) => setAsymmetry(Number(e.target.value))}
          onInput={(e) => setAsymmetry(Number((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
          aria-label="Shape asymmetry"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0 (Min) - Symmetric</span>
          <span>100 (Max) - Highly asymmetric</span>
        </div>
      </div>

      {/* Initial Spin Speed - second slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: '500' }}>
          Initial Spin Speed: {initialSpin}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={initialSpin}
          onChange={(e) => setInitialSpin(Number(e.target.value))}
          onInput={(e) => setInitialSpin(Number((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
          aria-label="Initial spin speed"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>20 (Min) - Slow</span>
          <span>100 (Max) - Fast</span>
        </div>
      </div>

      {/* Computed Values Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: '400' }}>Coupling Factor</div>
          <div style={{ color: couplingStrength > 0.6 ? colors.spinCCW : couplingStrength > 0.3 ? colors.wobble : colors.spinCW, fontSize: '14px', fontWeight: '700' }}>
            {(couplingStrength * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: '400' }}>Reversal Time</div>
          <div style={{ color: colors.accent, fontSize: '14px', fontWeight: '700' }}>{reversalTime}s</div>
        </div>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: '400' }}>Wobble Frequency</div>
          <div style={{ color: colors.wobble, fontSize: '14px', fontWeight: '700' }}>{wobbleFreq} Hz</div>
        </div>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: '400' }}>Energy Transfer</div>
          <div style={{ color: colors.success, fontSize: '14px', fontWeight: '700' }}>{energyTransfer}%</div>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'same', text: 'It spins the same way you started it, just slowing down' },
    { id: 'stops', text: 'It immediately stops and falls over' },
    { id: 'reverse', text: 'It starts wobbling and then REVERSES direction!', correct: true },
    { id: 'faster', text: 'It speeds up in the wrong direction' },
  ];

  const twistPredictions = [
    { id: 'magic', text: 'Ancient magic embedded in the stone' },
    { id: 'gyro', text: 'Gyroscopic precession from Earth\'s rotation' },
    { id: 'coupled', text: 'Spin energy transfers to rocking, then back to spin in the other direction', correct: true },
    { id: 'friction', text: 'Friction with the surface reverses it' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What makes a rattleback reverse its spin direction?',
      options: [
        { id: 'a', text: 'Magnetic forces' },
        { id: 'b', text: 'Asymmetric shape couples spin to rocking motion', correct: true },
        { id: 'c', text: 'Air resistance' },
        { id: 'd', text: 'The surface it sits on' },
      ],
    },
    {
      id: 2,
      question: 'A perfectly symmetric top would:',
      options: [
        { id: 'a', text: 'Reverse faster' },
        { id: 'b', text: 'Spin forever' },
        { id: 'c', text: 'Not reverse - it would just slow down equally in both directions', correct: true },
        { id: 'd', text: 'Immediately stop' },
      ],
    },
    {
      id: 3,
      question: 'When a rattleback wobbles, energy is being transferred from:',
      options: [
        { id: 'a', text: 'Heat to motion' },
        { id: 'b', text: 'Spin (rotation about vertical) to rocking (rotation about horizontal)', correct: true },
        { id: 'c', text: 'The surface to the rattleback' },
        { id: 'd', text: 'Gravity to the rattleback' },
      ],
    },
    {
      id: 4,
      question: 'Rattlebacks are also called "celts" because:',
      options: [
        { id: 'a', text: 'They were invented by Celtic physicists' },
        { id: 'b', text: 'Ancient Celtic artifacts showed this behavior', correct: true },
        { id: 'c', text: 'The shape looks like Celtic knots' },
        { id: 'd', text: 'They make a Celtic sound' },
      ],
    },
    {
      id: 5,
      question: 'Which property must be misaligned for a rattleback to work?',
      options: [
        { id: 'a', text: 'Color and weight' },
        { id: 'b', text: 'Principal axes of inertia and geometric axes', correct: true },
        { id: 'c', text: 'Top and bottom' },
        { id: 'd', text: 'Front and back' },
      ],
    },
    {
      id: 6,
      question: 'A rattleback with higher asymmetry will:',
      options: [
        { id: 'a', text: 'Never reverse' },
        { id: 'b', text: 'Reverse more quickly and strongly', correct: true },
        { id: 'c', text: 'Spin faster' },
        { id: 'd', text: 'Float in air' },
      ],
    },
    {
      id: 7,
      question: 'Why does spinning in the "preferred" direction not cause reversal?',
      options: [
        { id: 'a', text: 'The asymmetry doesn\'t couple to rocking in that direction', correct: true },
        { id: 'b', text: 'Gravity is different' },
        { id: 'c', text: 'The surface prevents it' },
        { id: 'd', text: 'It\'s actually reversing but too fast to see' },
      ],
    },
    {
      id: 8,
      question: 'The rocking motion that builds up before reversal is due to:',
      options: [
        { id: 'a', text: 'The Earth shaking' },
        { id: 'b', text: 'Unstable equilibrium in the "wrong" spin direction', correct: true },
        { id: 'c', text: 'Thermal expansion' },
        { id: 'd', text: 'Sound waves' },
      ],
    },
    {
      id: 9,
      question: 'What happens to the total energy during the reversal process?',
      options: [
        { id: 'a', text: 'It increases' },
        { id: 'b', text: 'It stays perfectly constant' },
        { id: 'c', text: 'It decreases due to friction', correct: true },
        { id: 'd', text: 'It becomes negative' },
      ],
    },
    {
      id: 10,
      question: 'A rattleback demonstrates violation of which apparent principle?',
      options: [
        { id: 'a', text: 'Conservation of energy' },
        { id: 'b', text: 'Conservation of momentum' },
        { id: 'c', text: 'The assumption that friction always opposes motion in the same direction', correct: true },
        { id: 'd', text: 'Gravity' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: 'Ancient Celtic Artifacts',
      description: 'Archaeological finds of boat-shaped stone tools from Celtic times show rattleback behavior. Whether ancient people knew about this or it was accidental is debated, but these objects fascinated scientists when rediscovered.',
      insight: 'Some researchers believe ancient Celts intentionally made these as "magic stones" for divination or gaming purposes.',
    },
    {
      id: 1,
      title: 'Satellite Dynamics',
      description: 'Spacecraft with elongated shapes can exhibit rattleback-like behavior! The Mariner 4 spacecraft showed unexpected rotation reversals due to asymmetric solar radiation pressure.',
      insight: 'Understanding coupled rotations helps spacecraft engineers design stable satellites and predict spin behavior.',
    },
    {
      id: 2,
      title: 'Sports Equipment',
      description: 'Some rugby balls and American footballs exhibit weak rattleback behavior when spun on a table. The asymmetric shape can cause unexpected wobbles and reversals.',
      insight: 'The physics of rattlebacks helps explain why spinning a football on a table behaves differently than in the air.',
    },
    {
      id: 3,
      title: 'Coupled Oscillators',
      description: 'The rattleback is a physical example of coupled oscillators - where energy transfers between different modes of vibration. This concept appears in electronics, bridges, and molecular physics.',
      insight: 'The mathematics that explains rattleback reversal also describes why some bridges sway dangerously in the wind.',
    },
  ];

  // ==================== PAGE LAYOUT WRAPPER ====================
  // Defined as a render function (not a React component) so React does NOT
  // unmount / remount the entire subtree on every state change.  This keeps
  // DOM element references stable across re-renders.
  const wrapPage = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      overflow: 'hidden',
      fontWeight: '400',
    }}>
      {renderNavigationBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {children}
      </div>
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            The Defiant Spinner
          </h1>
          <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
            Game 113: Rattleback Reversal
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
              Discover: A Top That Refuses to Spin "Wrong"
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
              Let's explore a mysterious stone-like object. Spin it one way and it spins smoothly. Spin it the other
              way and it <strong style={{ color: colors.spinCCW }}>wobbles, fights back,
              and reverses direction</strong> - spinning the way it "wants" to!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              Also called <span style={{ color: colors.accent }}>Celt</span> or <span style={{ color: colors.accent }}>Anagyre</span>
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Known since ancient times, this object puzzled physicists until the 20th century.
              The secret lies in its asymmetric shape, which couples different types of rotation
              in a sneaky way.
            </p>
          </div>
        </div>
      </>)
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictionCount = prediction ? 1 : 0;

    return (
      wrapPage(<>
        {/* Progress indicator */}
        <div style={{
          padding: '12px 20px',
          background: colors.bgCard,
          margin: '0 16px 16px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            Step {predictionCount} of 1: Make your prediction
          </p>
        </div>

        {/* 1. STATIC GRAPHIC FIRST */}
        {renderVisualization(false)}

        {/* 2. WHAT YOU'RE LOOKING AT - Observation Guidance */}
        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
            Observe the Diagram:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
            This is a <strong>rattleback</strong> - an elongated, boat-shaped object with an
            asymmetric bottom. The <span style={{ color: colors.wobble }}>orange dot</span>
            marks the center of mass, which is offset from the geometric center. The dashed
            line shows the shape's asymmetry axis.
          </p>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
            It has a "preferred" spin direction (CW) where it spins smoothly, and a "reverse"
            direction (CCW) where something strange happens...
          </p>
        </div>

        {/* 3. PREDICTION QUESTION BELOW */}
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
            When you spin it in the "wrong" (reverse) direction, what happens?
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
                  minHeight: '44px',
                  background: prediction === p.id
                    ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                    : 'rgba(51, 65, 85, 0.7)',
                  border: prediction === p.id ? '2px solid #c4b5fd' : '2px solid transparent',
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
      </>)
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      wrapPage(<>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
            Spin the Rattleback!
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Try both directions and watch the difference
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

        {/* Observation guidance and educational content for play phase */}
        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
            Observe These Behaviors:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
            Watch carefully how the rattleback behaves differently based on spin direction and asymmetry settings.
            When you increase asymmetry, the coupling between spin and rocking modes becomes stronger, which causes faster reversal.
            When you decrease it, the coupling weakens and the top behaves more like a normal symmetric spinner.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
            <strong style={{ color: colors.accent }}>Coupled oscillation</strong> is defined as the transfer of energy between
            two or more rotational modes through asymmetric inertia. The coupling strength is calculated from the
            relationship between the principal axes of inertia and the geometric axes. The formula
            E = I\u00B2 \u00D7 \u03C9 \u00D7 sin(\u03B1) describes how energy transfer rate depends on the moment of inertia (I),
            angular velocity (\u03C9), and misalignment angle (\u03B1).
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
            This is important in real-world engineering because satellites, gyroscopes, and rotating machinery
            all depend on understanding how asymmetric mass distributions affect rotational stability.
            That's why engineers must carefully design spinning components to avoid unwanted mode coupling.
          </p>
          <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
            <li>Spin CW (preferred) - smooth spin, no reversal</li>
            <li>Spin CCW (reverse) - wobble builds, then reverses!</li>
            <li>Increase asymmetry - faster reversal</li>
            <li>Zero asymmetry - no reversal either way</li>
          </ul>
        </div>
      </>)
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {isCorrect ? '\u{1F3AF}' : '\u{1F4A1}'}
          </div>
          <h2 style={{
            color: isCorrect ? colors.success : colors.warning,
            fontSize: '24px',
            marginBottom: '8px',
          }}>
            {isCorrect ? 'Amazing Intuition!' : 'Surprising Physics!'}
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {prediction ? 'Your prediction was noted. As you observed, the result depends on the asymmetry of the shape.' : 'Let\'s see what happened in the experiment.'}
          </p>
        </div>

        {/* SVG diagram for review */}
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
            The Physics Explained:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
            The rattleback's asymmetric shape means its <strong style={{ color: colors.accent }}>
            principal axes of inertia</strong> don't align with its geometric axes. When you spin
            it the "wrong" way, this misalignment couples the spin to a rocking motion.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
            The relationship is proportional: E = I\u00B2 \u00D7 \u03C9 \u00D7 sin(\u03B1), where I is the moment of inertia,
            \u03C9 is angular velocity, and \u03B1 is the misalignment angle. Energy transfers from
            <strong style={{ color: colors.spinCCW }}> spin</strong> to
            <strong style={{ color: colors.wobble }}> wobble</strong> to
            <strong style={{ color: colors.spinCW }}> spin in the opposite direction</strong>!
          </p>
          <div style={{
            background: 'rgba(167, 139, 250, 0.1)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
              Key Insight:
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              In the "preferred" direction, the asymmetry doesn't couple to rocking.
              It's like a one-way gate for energy transfer between rotation modes!
            </p>
          </div>
        </div>
      </>)
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistPredictionCount = twistPrediction ? 1 : 0;

    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
            Plot Twist!
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            What's really causing the reversal?
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{
          padding: '12px 20px',
          background: colors.bgCard,
          margin: '0 16px 16px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            Step {twistPredictionCount} of 1: Make your prediction
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
            The Deep Question:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
            We've seen that the rattleback wobbles and reverses. But what mechanism actually
            makes this happen? How does spinning one way cause energy to transfer differently
            than spinning the other way?
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
            What causes the direction-dependent energy transfer?
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
                  minHeight: '44px',
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
      </>)
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      wrapPage(<>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
            Coupled Oscillations
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Watch energy transfer between modes
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

        {/* Observation guidance for twist_play phase */}
        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
            Observe the Coupling:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
            Watch how energy flows between different rotation modes as the rattleback spins.
          </p>
          <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
            <li>Watch spin energy decrease as wobble increases</li>
            <li>Wobble reaches maximum just before reversal</li>
            <li>Wobble energy converts back to spin (other direction!)</li>
            <li>Higher asymmetry = stronger coupling</li>
          </ul>
        </div>
      </>)
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {isCorrect ? '\u{1F3AF}' : '\u{1F92F}'}
          </div>
          <h2 style={{
            color: isCorrect ? colors.success : colors.accent,
            fontSize: '24px',
            marginBottom: '8px',
          }}>
            {isCorrect ? 'Physics Mastery!' : 'Elegant Mathematics!'}
          </h2>
        </div>

        {/* SVG diagram for twist_review */}
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
            Coupled Mode Energy Transfer:
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
            The rattleback demonstrates <strong style={{ color: colors.accent }}>parametric coupling</strong>
            between rotation modes. The asymmetry creates cross-terms in the equations of motion
            that only allow energy to flow one way.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
            It's like a one-way valve: spin to wobble to spin in the other direction. In the
            preferred direction, the coupling terms cancel out, so no energy transfers to wobble.
          </p>
        </div>
      </>)
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Rattleback"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    const completedCount = transferCompleted.size;

    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Explore all {transferApplications.length} applications to continue
          </p>
        </div>

        {/* Progress indicator for transfer phase */}
        <div style={{
          padding: '12px 20px',
          background: colors.bgCard,
          margin: '0 16px 16px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            Progress: {completedCount} of {transferApplications.length} applications explored
          </p>
          <div style={{
            marginTop: '8px',
            height: '6px',
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / transferApplications.length) * 100}%`,
              background: colors.success,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {transferApplications.map((app) => (
          <div
            key={app.id}
            style={{
              background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard,
              border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent',
              margin: '12px 16px',
              padding: '16px',
              borderRadius: '12px',
              minHeight: '44px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>{app.title}</h3>
              {transferCompleted.has(app.id) && <span style={{ color: colors.success }}>{'\u2713'}</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>{app.description}</p>
            <div style={{ background: 'rgba(167, 139, 250, 0.1)', borderRadius: '6px', padding: '10px', marginTop: '10px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
            </div>
            {!transferCompleted.has(app.id) ? (
              <button
                onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Got It {'\u2192'}
              </button>
            ) : (
              <button
                disabled
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  minHeight: '44px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.success,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'default',
                }}
              >
                Complete {'\u2713'}
              </button>
            )}
          </div>
        ))}

        {allCompleted && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={goToNextPhase}
              style={{
                padding: '14px 32px',
                minHeight: '44px',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Take the Test
            </button>
          </div>
        )}
      </>)
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;
    const currentQuestion = testQuestions[currentQuestionIndex];
    const optionLabels = ['A', 'B', 'C', 'D'];

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        wrapPage(<>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 80 ? '\u{1F3C6}' : '\u{1F4DA}'}</div>
            <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>You Scored</h2>
            <p style={{ color: colors.accent, fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
              {correctCount}/10
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginTop: '8px' }}>
              {score}% - {correctCount} of {testQuestions.length} correct
            </p>
          </div>

          {/* Answer Review */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0 16px' }}>
            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const isCorrect = testAnswers[q.id] === correctOption?.id;
              const userOption = q.options.find(o => o.id === testAnswers[q.id]);
              return (
                <div key={q.id} style={{
                  background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  margin: '8px 0',
                  padding: '14px',
                  borderRadius: '10px'
                }}>
                  <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 'bold' }}>
                    {isCorrect ? '\u2713' : '\u2717'} Question {idx + 1} of {testQuestions.length}
                  </span>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '4px' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                      Your answer: {userOption?.text || 'None'} | Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px', padding: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => { setTestSubmitted(false); setTestAnswers({}); setCurrentQuestionIndex(0); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                background: 'rgba(71, 85, 105, 0.5)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Replay Quiz
            </button>
            <button
              onClick={() => goToPhase(PHASES.indexOf('mastery'))}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Continue {'\u2192'}
            </button>
          </div>
        </>)
      );
    }

    // Quiz confirmation dialog
    if (showQuizConfirm) {
      return (
        wrapPage(<>
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '16px' }}>
              Submit Quiz?
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px' }}>
              You have answered {answeredCount} of {testQuestions.length} questions.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowQuizConfirm(false)}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: 'rgba(71, 85, 105, 0.5)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Review Answers
              </button>
              <button
                onClick={() => {
                  setShowQuizConfirm(false);
                  setTestSubmitted(true);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </>)
      );
    }

    const selectedForThisQ = currentAnswer || testAnswers[currentQuestion.id] || null;

    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>Knowledge Check</h2>
          <p style={{ color: colors.accent, fontSize: '16px', marginTop: '8px' }}>
            Question {currentQuestionIndex + 1} of {testQuestions.length}
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '4px' }}>
            Test your understanding of rattleback physics, coupled oscillations, and asymmetric inertia dynamics.
            Select the best answer for each question and confirm your choice.
          </p>
        </div>

        {/* Progress dots for quiz */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '0 16px 16px',
          flexWrap: 'wrap'
        }}>
          {testQuestions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => { setCurrentQuestionIndex(idx); setCurrentAnswer(null); setAnswerConfirmed(false); }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: idx === currentQuestionIndex ? '2px solid ' + colors.accent : 'none',
                background: testAnswers[q.id]
                  ? colors.success
                  : idx === currentQuestionIndex
                  ? 'rgba(167, 139, 250, 0.3)'
                  : 'rgba(71, 85, 105, 0.5)',
                color: colors.textPrimary,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              aria-label={`Question ${idx + 1}${testAnswers[q.id] ? ' (answered)' : ''}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        <div style={{
          background: colors.bgCard,
          margin: '12px 16px',
          padding: '16px',
          borderRadius: '12px'
        }}>
          <p style={{
            color: colors.textPrimary,
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            Q{currentQuestionIndex + 1}. {currentQuestion.question}
          </p>
          {currentQuestion.options.map((opt, optIdx) => (
            <button
              key={opt.id}
              onClick={() => { setCurrentAnswer(opt.id); setAnswerConfirmed(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                minHeight: '44px',
                marginBottom: '8px',
                background: selectedForThisQ === opt.id
                  ? 'rgba(167, 139, 250, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
                border: selectedForThisQ === opt.id
                  ? '2px solid ' + colors.accent
                  : '2px solid transparent',
                borderRadius: '8px',
                color: colors.textSecondary,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {optionLabels[optIdx]}) {opt.text}
            </button>
          ))}

          {/* Check Answer button */}
          {selectedForThisQ && !answerConfirmed && (
            <button
              onClick={() => {
                setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedForThisQ }));
                setAnswerConfirmed(true);
              }}
              style={{
                width: '100%',
                padding: '12px',
                minHeight: '44px',
                marginTop: '8px',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Check Answer
            </button>
          )}
        </div>

        {/* Navigation between questions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '16px',
          gap: '16px'
        }}>
          <button
            onClick={() => { setCurrentQuestionIndex(prev => Math.max(0, prev - 1)); setCurrentAnswer(null); setAnswerConfirmed(false); }}
            disabled={currentQuestionIndex === 0}
            style={{
              flex: 1,
              padding: '12px',
              minHeight: '44px',
              background: currentQuestionIndex > 0 ? 'rgba(71, 85, 105, 0.5)' : 'rgba(71, 85, 105, 0.3)',
              border: 'none',
              borderRadius: '8px',
              color: currentQuestionIndex > 0 ? colors.textPrimary : colors.textMuted,
              cursor: currentQuestionIndex > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            Previous
          </button>
          {currentQuestionIndex < testQuestions.length - 1 ? (
            <button
              onClick={() => { setCurrentQuestionIndex(prev => Math.min(testQuestions.length - 1, prev + 1)); setCurrentAnswer(null); setAnswerConfirmed(false); }}
              style={{
                flex: 1,
                padding: '12px',
                minHeight: '44px',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                border: 'none',
                borderRadius: '8px',
                color: colors.textPrimary,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={() => {
                if (allAnswered) {
                  setTestSubmitted(true);
                }
              }}
              disabled={!allAnswered}
              style={{
                flex: 1,
                padding: '12px',
                minHeight: '44px',
                background: allAnswered
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(71, 85, 105, 0.3)',
                border: 'none',
                borderRadius: '8px',
                color: allAnswered ? colors.textPrimary : colors.textMuted,
                fontWeight: 'bold',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              Submit ({answeredCount}/{testQuestions.length})
            </button>
          )}
        </div>
      </>)
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      wrapPage(<>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>{'\u{1F3C6}'}</div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Rattleback Master!</h1>
          <p style={{ color: colors.accent }}>You've mastered coupled rotations</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>What You've Learned:</h3>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px' }}>
            <li>Asymmetric shapes couple different rotation modes</li>
            <li>Energy can transfer from spin to wobble and back</li>
            <li>The coupling is direction-dependent</li>
            <li>Ancient artifacts showed this phenomenon</li>
          </ul>
        </div>
      </>)
    );
  }

  // Fallback for unknown phase - default to hook
  return wrapPage(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading...</p>
    </div>
  );
};

export default RattlebackRenderer;
