import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 112: CHAIN FOUNTAIN (MOULD EFFECT)
// The mysterious rising chain pulled from a beaker
// Demonstrates momentum transfer, reaction forces, and chain dynamics
// ============================================================================

interface ChainFountainRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast (brightness >= 180)
const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0', // brightness 226
  textMuted: '#cbd5e1', // brightness 209 - upgraded from #94a3b8

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Chain colors
  chainLink: '#fbbf24',
  chainHighlight: '#fde68a',
  chainShadow: '#b45309',

  // Container colors
  beaker: 'rgba(147, 197, 253, 0.3)',
  beakerEdge: '#60a5fa',

  // Force arrows
  forceUp: '#22c55e',
  forceDown: '#ef4444',
  momentum: '#a855f7',

  // UI colors
  accent: '#fbbf24',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const ChainFountainRenderer: React.FC<ChainFountainRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // Phase order for navigation
  const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
  type Phase = typeof phaseOrder[number];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // Determine initial phase from props (gamePhase takes priority, then phase)
  const getInitialPhase = (): Phase => {
    const propPhase = gamePhase || phaseProp;
    if (propPhase && phaseOrder.includes(propPhase as Phase)) {
      return propPhase as Phase;
    }
    return 'hook';
  };

  // Internal phase state for self-managing navigation
  const [currentPhase, setCurrentPhase] = useState<Phase>(getInitialPhase);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);


  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography system
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

  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);

  // Interactive controls
  const [dropHeight, setDropHeight] = useState(50); // 0-100
  const [chainDensity, setChainDensity] = useState(50); // 0-100 (affects link size/mass)
  const [chainStiffness, setChainStiffness] = useState(50); // 0-100

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [fountainHeight, setFountainHeight] = useState(0);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // ==================== NAVIGATION ====================
  const goToPhase = useCallback((newPhase: Phase) => {
    setCurrentPhase(newPhase);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
    onPhaseComplete?.();
  }, [currentPhase, goToPhase, onPhaseComplete]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [currentPhase, goToPhase]);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateFountainHeight = useCallback(() => {
    // Fountain height depends on drop height and chain properties
    // Higher drop = more momentum = higher fountain
    // Stiffer chain = better momentum transfer = higher fountain
    const dropFactor = dropHeight / 100;
    const stiffnessFactor = chainStiffness / 100;
    const densityFactor = 1 + (chainDensity / 200);

    // Approximate: fountain height proportional to sqrt(drop height) for ideal chain
    // Stiffness increases the effect
    return Math.sqrt(dropFactor) * (0.2 + stiffnessFactor * 0.4) * densityFactor * 100;
  }, [dropHeight, chainStiffness, chainDensity]);

  const calculateChainVelocity = useCallback(() => {
    // v = sqrt(2gh) for falling chain
    const h = (dropHeight / 100) * 3; // Scale to meters
    return Math.sqrt(2 * 9.81 * h);
  }, [dropHeight]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    // Only animate on play phases where visualization is active
    const playPhases = ['play', 'twist_play'];
    if (!playPhases.includes(currentPhase) || !isRunning) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.04);

      const targetHeight = calculateFountainHeight();
      setFountainHeight(prev => {
        // Smooth transition to target height
        const diff = targetHeight - prev;
        return prev + diff * 0.1;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [currentPhase, isRunning, calculateFountainHeight]);

  // ==================== PROGRESS BAR ====================
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: colors.bgDark,
        zIndex: 1001,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    );
  };

  // ==================== NAV DOTS ====================
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={phaseLabels[p]}
          style={{
            width: currentPhase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(currentPhase) >= i ? colors.accent : 'rgba(71, 85, 105, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '8px',
          }}
        />
      ))}
    </div>
  );

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const velocity = calculateChainVelocity();
    const maxFountain = calculateFountainHeight();

    // Chain parameters
    const linkSize = 4 + (chainDensity / 50);

    // Container position
    const beakerX = 80;
    const beakerY = 150;
    const beakerWidth = 80;
    const beakerHeight = 120;

    // Drop point position
    const dropX = 320;
    const dropY = 150 + (dropHeight / 100) * 150;

    // Generate chain path points
    const chainPath = [];

    // Rising arc from beaker
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = beakerX + beakerWidth / 2 + t * 60;
      const y = beakerY - Math.sin(t * Math.PI) * fountainHeight;
      chainPath.push({ x, y });
    }

    // Falling arc to drop point
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = beakerX + beakerWidth / 2 + 60 + t * (dropX - beakerX - beakerWidth / 2 - 60);
      const arcHeight = fountainHeight * (1 - t);
      const y = beakerY - arcHeight + t * (dropY - beakerY + arcHeight);
      chainPath.push({ x, y });
    }

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        {/* Title moved outside SVG */}
        <div style={{
          textAlign: 'center',
          marginBottom: typo.elementGap,
          padding: `0 ${typo.cardPadding}`,
        }}>
          <h3 style={{
            color: colors.textPrimary,
            fontSize: typo.heading,
            fontWeight: 'bold',
            margin: 0,
          }}>
            Chain Fountain (Mould Effect)
          </h3>
        </div>

        <svg
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Premium chain link metallic gradient */}
            <linearGradient id="chainLinkMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="20%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Chain arc glow gradient */}
            <linearGradient id="chainArcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
              <stop offset="25%" stopColor="#fde68a" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#fde68a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>

            {/* Beaker glass gradient with depth */}
            <linearGradient id="chainBeakerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#93c5fd" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.15" />
              <stop offset="85%" stopColor="#93c5fd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
            </linearGradient>

            {/* Beaker rim metallic */}
            <linearGradient id="chainBeakerRim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* Force arrow gradient - upward */}
            <linearGradient id="chainForceUp" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>

            {/* Force arrow gradient - downward */}
            <linearGradient id="chainForceDown" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.6" />
            </linearGradient>

            {/* Momentum arrow gradient */}
            <linearGradient id="chainMomentum" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>

            {/* Ground/surface gradient */}
            <linearGradient id="chainGround" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Table surface gradient */}
            <linearGradient id="chainTable" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Height marker gradient */}
            <linearGradient id="chainHeightMarker" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="chainBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Chain link glow filter */}
            <filter id="chainLinkGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arc glow filter */}
            <filter id="chainArcGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow glow */}
            <filter id="chainForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Momentum arrow glow */}
            <filter id="chainMomentumGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Beaker inner glow */}
            <filter id="chainBeakerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect width="400" height="360" fill="url(#chainBgGradient)" />

          {/* Chain arc data path (always rendered, responds to stiffness/height/density) */}
          {(() => {
            const previewHeight = isRunning ? fountainHeight : maxFountain;
            const arcPath = [];
            for (let i = 0; i <= 20; i++) {
              const t = i / 20;
              const x = beakerX + beakerWidth / 2 + t * 60;
              const y = beakerY - Math.sin(t * Math.PI) * previewHeight;
              arcPath.push({ x, y });
            }
            for (let i = 0; i <= 20; i++) {
              const t = i / 20;
              const x = beakerX + beakerWidth / 2 + 60 + t * (dropX - beakerX - beakerWidth / 2 - 60);
              const arcH = previewHeight * (1 - t);
              const y = beakerY - arcH + t * (dropY - beakerY + arcH);
              arcPath.push({ x, y });
            }
            const pathD = arcPath.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            return (
              <path
                d={pathD}
                fill="none"
                stroke={colors.chainLink}
                strokeWidth={isRunning ? 3 : 2}
                strokeDasharray={isRunning ? undefined : '6,4'}
                opacity={isRunning ? 0.6 : 0.4}
              />
            );
          })()}

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {[...Array(9)].map((_, i) => (
              <line key={`vgrid-${i}`} x1={(i + 1) * 40} y1="0" x2={(i + 1) * 40} y2="360" stroke="#64748b" strokeWidth="0.5" />
            ))}
            {[...Array(8)].map((_, i) => (
              <line key={`hgrid-${i}`} x1="0" y1={(i + 1) * 40} x2="400" y2={(i + 1) * 40} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>

          {/* Ground line with gradient */}
          <rect x="0" y="330" width="400" height="30" fill="url(#chainGround)" />

          {/* Height markers on the left */}
          <g opacity="0.6">
            {[0, 1, 2, 3].map((i) => (
              <g key={`height-marker-${i}`}>
                <line
                  x1="20"
                  y1={150 + i * 50}
                  x2="35"
                  y2={150 + i * 50}
                  stroke="url(#chainHeightMarker)"
                  strokeWidth="2"
                />
                <line
                  x1="35"
                  y1={150}
                  x2="35"
                  y2={150 + i * 50}
                  stroke="url(#chainHeightMarker)"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.5"
                />
              </g>
            ))}
          </g>

          {/* Drop height indicator with gradient */}
          <line
            x1={dropX}
            y1={150}
            x2={dropX}
            y2={dropY}
            stroke="url(#chainForceDown)"
            strokeWidth="2"
            strokeDasharray="4,4"
            filter="url(#chainForceGlow)"
          />

          {/* Beaker/Container with premium glass effect */}
          <g transform={`translate(${beakerX}, ${beakerY})`}>
            {/* Beaker shadow */}
            <ellipse
              cx={beakerWidth / 2}
              cy={beakerHeight + 15}
              rx={beakerWidth / 2 + 5}
              ry="6"
              fill="#000"
              opacity="0.3"
            />

            {/* Beaker body with glass gradient */}
            <path
              d={`M 0,0 L 0,${beakerHeight} Q 0,${beakerHeight + 10} 10,${beakerHeight + 10}
                  L ${beakerWidth - 10},${beakerHeight + 10} Q ${beakerWidth},${beakerHeight + 10}
                  ${beakerWidth},${beakerHeight} L ${beakerWidth},0`}
              fill="url(#chainBeakerGlass)"
              stroke="url(#chainBeakerRim)"
              strokeWidth="2"
              filter="url(#chainBeakerGlow)"
            />

            {/* Glass reflection highlight */}
            <path
              d={`M 5,5 L 5,${beakerHeight - 10} Q 8,${beakerHeight} 15,${beakerHeight}`}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Chain pile inside beaker with metallic gradient */}
            {!isRunning && (
              <g filter="url(#chainLinkGlow)">
                {[...Array(15)].map((_, i) => (
                  <ellipse
                    key={i}
                    cx={beakerWidth / 2 + Math.sin(i * 1.5) * 20}
                    cy={beakerHeight - 20 - i * 4}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill="url(#chainLinkMetallic)"
                    opacity={0.9 - i * 0.02}
                  />
                ))}
              </g>
            )}

            {/* Beaker rim with metallic gradient */}
            <rect
              x="-2"
              y="-4"
              width={beakerWidth + 4}
              height="5"
              fill="url(#chainBeakerRim)"
              rx="2"
            />

            {/* Beaker rim highlight */}
            <rect
              x="0"
              y="-3"
              width={beakerWidth}
              height="2"
              fill="rgba(255,255,255,0.3)"
              rx="1"
            />
          </g>

          {/* Chain fountain arc with premium effects */}
          {isRunning && (
            <g>
              {/* Arc glow effect behind the chain */}
              <path
                d={`M ${beakerX + beakerWidth / 2},${beakerY}
                    Q ${beakerX + beakerWidth / 2 + 30},${beakerY - fountainHeight}
                      ${beakerX + beakerWidth / 2 + 60},${beakerY - fountainHeight * 0.9}
                    Q ${(beakerX + beakerWidth / 2 + 60 + dropX) / 2},${beakerY - fountainHeight * 0.5}
                      ${dropX},${dropY}`}
                fill="none"
                stroke="url(#chainArcGlow)"
                strokeWidth={linkSize * 3}
                opacity="0.4"
                filter="url(#chainArcGlowFilter)"
              />



              {/* Draw chain links along path with metallic gradient */}
              {chainPath.map((point, i) => {
                if (i % 2 !== 0) return null; // Skip every other for performance
                const phase = (animationTime * 5 + i * 0.2) % 1;
                const brightness = 0.8 + Math.sin(phase * Math.PI * 2) * 0.2;

                return (
                  <ellipse
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill="url(#chainLinkMetallic)"
                    opacity={brightness}
                    filter="url(#chainLinkGlow)"
                    transform={`rotate(${Math.atan2(
                      (chainPath[Math.min(i + 1, chainPath.length - 1)]?.y || point.y) - point.y,
                      (chainPath[Math.min(i + 1, chainPath.length - 1)]?.x || point.x) - point.x
                    ) * 180 / Math.PI}, ${point.x}, ${point.y})`}
                  />
                );
              })}

              {/* Flow arrows on chain with gradient and glow */}
              {[0.2, 0.5, 0.8].map((t, i) => {
                const idx = Math.floor(t * chainPath.length);
                const point = chainPath[idx];
                const nextPoint = chainPath[Math.min(idx + 2, chainPath.length - 1)];
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);

                return (
                  <g key={i} transform={`translate(${point.x}, ${point.y}) rotate(${angle * 180 / Math.PI})`}>
                    <polygon
                      points="0,-5 12,0 0,5"
                      fill="url(#chainMomentum)"
                      filter="url(#chainMomentumGlow)"
                      opacity={0.9}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Kick force indicator at pickup point with premium styling */}
          {isRunning && interactive && (
            <g transform={`translate(${beakerX + beakerWidth / 2}, ${beakerY})`}>
              {/* Upward kick force with gradient and glow */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-35"
                stroke="url(#chainForceUp)"
                strokeWidth="4"
                filter="url(#chainForceGlow)"
              />
              <polygon
                points="-8,-35 0,-50 8,-35"
                fill="url(#chainForceUp)"
                filter="url(#chainForceGlow)"
              />

              {/* Reaction from surface */}
              <line
                x1="-18"
                y1="25"
                x2="-18"
                y2="-8"
                stroke="url(#chainForceUp)"
                strokeWidth="3"
                filter="url(#chainForceGlow)"
              />
              <polygon
                points="-24,-8 -18,-20 -12,-8"
                fill="url(#chainForceUp)"
                filter="url(#chainForceGlow)"
              />
            </g>
          )}

          {/* Falling chain from drop point with gradient */}
          {isRunning && (
            <g filter="url(#chainLinkGlow)">
              {[...Array(10)].map((_, i) => {
                const y = dropY + i * 15 + (animationTime * 50) % 15;
                if (y > 330) return null;
                return (
                  <ellipse
                    key={i}
                    cx={dropX}
                    cy={y}
                    rx={linkSize}
                    ry={linkSize * 0.6}
                    fill="url(#chainLinkMetallic)"
                    opacity={0.8 - i * 0.05}
                  />
                );
              })}
            </g>
          )}

          {/* Table/platform surface under drop with gradient */}
          <g>
            {/* Platform shadow */}
            <ellipse
              cx={dropX}
              cy="332"
              rx="35"
              ry="4"
              fill="#000"
              opacity="0.3"
            />
            {/* Platform surface */}
            <rect
              x={dropX - 35}
              y="320"
              width="70"
              height="12"
              fill="url(#chainTable)"
              rx="3"
            />
            {/* Platform highlight */}
            <rect
              x={dropX - 33}
              y="321"
              width="66"
              height="3"
              fill="rgba(255,255,255,0.15)"
              rx="1"
            />
          </g>

          {/* Labels for visualization elements */}
          <text x={beakerX + beakerWidth / 2} y={beakerY + beakerHeight + 35} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="normal">Beaker</text>
          <text x={dropX} y={340} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="normal">Drop Point</text>
          <text x={beakerX + beakerWidth / 2} y={beakerY - fountainHeight - 10} textAnchor="middle" fill={colors.chainLink} fontSize="11" fontWeight="normal">Chain Fountain</text>

          {/* Legend panel */}
          <g transform="translate(10, 300)">
            <rect x="0" y="0" width="120" height="50" rx="6" fill="rgba(30, 41, 59, 0.9)" stroke="rgba(148, 163, 184, 0.2)" />
            <circle cx="12" cy="14" r="5" fill={colors.chainLink} />
            <text x="22" y="17" fill={colors.textSecondary} fontSize="11" fontWeight="400">Chain links</text>
            <circle cx="12" cy="30" r="5" fill={colors.forceUp} />
            <text x="22" y="33" fill={colors.textSecondary} fontSize="11" fontWeight="400">Kick force</text>
            <circle cx="12" cy="46" r="5" fill={colors.momentum} />
            <text x="22" y="49" fill={colors.textSecondary} fontSize="11" fontWeight="400">Momentum</text>
          </g>

        </svg>

        {/* Info panels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: typo.elementGap,
          padding: typo.cardPadding,
          marginTop: typo.elementGap,
        }}>
          {/* Fountain Height Panel */}
          <div style={{
            flex: '1 1 120px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}>
            <div style={{
              color: colors.textMuted,
              fontSize: typo.label,
              marginBottom: '4px',
            }}>
              Fountain Height
            </div>
            <div style={{
              color: colors.chainLink,
              fontSize: typo.bodyLarge,
              fontWeight: 'bold',
            }}>
              {(fountainHeight / 100 * maxFountain / 100).toFixed(2)} m
            </div>
            <div style={{
              color: colors.textMuted,
              fontSize: typo.label,
            }}>
              {(fountainHeight / maxFountain * 100).toFixed(0)}% of max
            </div>
          </div>

          {/* Chain Velocity Panel */}
          <div style={{
            flex: '1 1 100px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}>
            <div style={{
              color: colors.textMuted,
              fontSize: typo.label,
              marginBottom: '4px',
            }}>
              Chain Velocity
            </div>
            <div style={{
              color: colors.momentum,
              fontSize: typo.bodyLarge,
              fontWeight: 'bold',
            }}>
              {velocity.toFixed(1)} m/s
            </div>
          </div>

          {/* Status Panel */}
          <div style={{
            flex: '1 1 100px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.2)'}`,
          }}>
            <div style={{
              color: colors.textMuted,
              fontSize: typo.label,
              marginBottom: '4px',
            }}>
              Status
            </div>
            <div style={{
              color: isRunning ? colors.success : colors.textMuted,
              fontSize: typo.body,
              fontWeight: 'bold',
            }}>
              {isRunning ? 'Running' : 'Stopped'}
            </div>
          </div>

          {/* Drop Height Panel */}
          <div style={{
            flex: '1 1 100px',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{
              color: colors.textMuted,
              fontSize: typo.label,
              marginBottom: '4px',
            }}>
              Drop Height
            </div>
            <div style={{
              color: colors.forceDown,
              fontSize: typo.bodyLarge,
              fontWeight: 'bold',
            }}>
              {((dropHeight / 100) * 3).toFixed(1)} m
            </div>
          </div>
        </div>
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
        Control the Chain Fountain:
      </div>

      {/* Start/Stop Button */}
      <button
        onClick={() => {
          setIsRunning(!isRunning);
          if (!isRunning) setFountainHeight(0);
        }}
        style={{
          padding: '14px',
          minHeight: '48px',
          background: isRunning
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {isRunning ? 'Stop Chain' : 'Drop the Chain!'}
      </button>

      {/* Drop Height Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Drop Height: {((dropHeight / 100) * 3).toFixed(1)}m
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={dropHeight}
          onChange={(e) => setDropHeight(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Low (0.6m)</span>
          <span>High (3m)</span>
        </div>
      </div>

      {/* Chain Stiffness Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Chain Stiffness: {chainStiffness}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={chainStiffness}
          onChange={(e) => setChainStiffness(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Flexible (rope-like)</span>
          <span>Rigid (ball chain)</span>
        </div>
      </div>

      {/* Chain Density Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Chain Density: {chainDensity}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={chainDensity}
          onChange={(e) => setChainDensity(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Light</span>
          <span>Heavy</span>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'edge', text: 'The chain just slides over the rim of the container' },
    { id: 'rise', text: 'The chain rises UP above the container before falling', correct: true },
    { id: 'faster', text: 'The chain falls faster than normal free-fall' },
    { id: 'tangles', text: 'The chain gets tangled and stops' },
  ];

  const twistPredictions = [
    { id: 'gravity', text: 'Gravity pulls it up momentarily' },
    { id: 'air', text: 'Air pressure lifts the chain' },
    { id: 'kick', text: 'Each link gets a "kick" from the surface when picked up', correct: true },
    { id: 'magic', text: 'It\'s an optical illusion - the chain doesn\'t really rise' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What causes the chain to rise above the container rim?',
      options: [
        { id: 'a', text: 'Air pressure from below' },
        { id: 'b', text: 'Magnetic forces in the chain' },
        { id: 'c', text: 'Reaction force from the container when each link is lifted', correct: true },
        { id: 'd', text: 'Static electricity' },
      ],
    },
    {
      id: 2,
      question: 'What property of the chain makes the fountain effect stronger?',
      options: [
        { id: 'a', text: 'Lighter chains work better' },
        { id: 'b', text: 'Flexible rope-like chains work best' },
        { id: 'c', text: 'Stiff chains with rigid links work better', correct: true },
        { id: 'd', text: 'Color of the chain' },
      ],
    },
    {
      id: 3,
      question: 'How does increasing the drop height affect the fountain?',
      options: [
        { id: 'a', text: 'No effect on fountain height' },
        { id: 'b', text: 'Higher drop = higher fountain', correct: true },
        { id: 'c', text: 'Higher drop = lower fountain' },
        { id: 'd', text: 'The chain stops working' },
      ],
    },
    {
      id: 4,
      question: 'Why doesn\'t a perfectly flexible rope create a fountain?',
      options: [
        { id: 'a', text: 'It\'s too light' },
        { id: 'b', text: 'It can bend smoothly without pushing against the surface', correct: true },
        { id: 'c', text: 'Rope is always tangled' },
        { id: 'd', text: 'Rope creates an even bigger fountain' },
      ],
    },
    {
      id: 5,
      question: 'The "Mould Effect" is named after:',
      options: [
        { id: 'a', text: 'The mold that forms on old chains' },
        { id: 'b', text: 'Steve Mould, who popularized the phenomenon on YouTube', correct: true },
        { id: 'c', text: 'The shape of the chain fountain' },
        { id: 'd', text: 'A famous physicist' },
      ],
    },
    {
      id: 6,
      question: 'What happens at the pickup point when a link is lifted?',
      options: [
        { id: 'a', text: 'Nothing special - it just slides up' },
        { id: 'b', text: 'The link rotates and pushes against the surface/other links', correct: true },
        { id: 'c', text: 'The link becomes lighter' },
        { id: 'd', text: 'The link heats up' },
      ],
    },
    {
      id: 7,
      question: 'Conservation of what principle is key to understanding the chain fountain?',
      options: [
        { id: 'a', text: 'Energy only' },
        { id: 'b', text: 'Mass only' },
        { id: 'c', text: 'Momentum', correct: true },
        { id: 'd', text: 'Electric charge' },
      ],
    },
    {
      id: 8,
      question: 'If you dropped the chain in a vacuum (no air), would the fountain still form?',
      options: [
        { id: 'a', text: 'No - air pressure is essential' },
        { id: 'b', text: 'Yes - the mechanism doesn\'t depend on air', correct: true },
        { id: 'c', text: 'The fountain would be twice as high' },
        { id: 'd', text: 'The chain would float' },
      ],
    },
    {
      id: 9,
      question: 'Ball chains work well for this effect because:',
      options: [
        { id: 'a', text: 'They\'re made of special metal' },
        { id: 'b', text: 'Each ball must rotate to change direction, creating the kick', correct: true },
        { id: 'c', text: 'They\'re heavier than regular chains' },
        { id: 'd', text: 'They have air pockets inside' },
      ],
    },
    {
      id: 10,
      question: 'The fountain height relative to drop height is:',
      options: [
        { id: 'a', text: 'Always equal' },
        { id: 'b', text: 'Always exactly half' },
        { id: 'c', text: 'A fraction that depends on chain properties', correct: true },
        { id: 'd', text: 'Always greater than drop height' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: 'Anchor Chain Deployment',
      description: 'Ship anchors use heavy chains that exhibit similar dynamics when deployed. Understanding chain mechanics helps naval engineers predict how the chain will behave during rapid deployment at speeds of 30 m/s or more.',
      insight: 'A ship anchor chain can weigh over 100 tons and experience forces of 500,000 N when dropping anchor at full speed!',
    },
    {
      id: 1,
      title: 'Roller Coaster Chains',
      description: 'The lift chains on roller coasters must smoothly pick up and release cars weighing 2,000 kg each. Engineers account for the momentum transfer and reaction forces to ensure smooth operation.',
      insight: 'The chain lift motor on a major coaster can be over 500 horsepower (375 kW) to handle the 50,000 N forces involved!',
    },
    {
      id: 2,
      title: 'Cable Dynamics',
      description: 'Undersea cables, crane cables, and tow ropes all exhibit complex dynamics when rapidly deployed at 10 m/s or retrieved. The same momentum principles apply to their behavior.',
      insight: 'When laying transatlantic fiber optic cables spanning 6,000 km, engineers must account for chain dynamics to prevent damage.',
    },
    {
      id: 3,
      title: 'Polymer Chain Physics',
      description: 'At the molecular level, polymer chains being pulled from a surface exhibit analogous behavior. Understanding macroscale chain physics helps predict nanoscale polymer dynamics at the 10 nm scale.',
      insight: 'DNA being pulled through a 2 nm nanopore follows similar principles - each base experiences forces of 10 pN!',
    },
  ];

  // ==================== NAVIGATION BAR ====================
  const renderNavBar = (showBack: boolean, backLabel: string, showNext: boolean, nextLabel: string, nextEnabled: boolean, onNext?: () => void) => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
      borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {showBack ? (
        <button
          onClick={prevPhase}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid rgba(148, 163, 184, 0.3)`,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      ) : <div style={{ width: '80px' }} />}

      <span style={{ color: colors.textMuted, fontSize: '13px' }}>
        Step {phaseOrder.indexOf(currentPhase) + 1} of {phaseOrder.length}
      </span>

      {showNext ? (
        <button
          onClick={onNext || nextPhase}
          disabled={!nextEnabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: nextEnabled
              ? 'linear-gradient(135deg, #fbbf24, #d97706)'
              : 'rgba(71, 85, 105, 0.5)',
            color: nextEnabled ? '#0f172a' : colors.textMuted,
            cursor: nextEnabled ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: nextEnabled ? 1 : 0.5,
          }}
        >
          {nextLabel}
        </button>
      ) : <div style={{ width: '80px' }} />}
    </nav>
  );

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string, onButtonClick?: () => void) => {
    const handleClick = buttonEnabled ? () => {
      if (onButtonClick) {
        onButtonClick();
      } else {
        nextPhase();
      }
    } : undefined;

    return (
      <div style={{
        position: 'sticky',
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
            onClick={handleClick}
            disabled={!buttonEnabled}
            style={{
              width: '100%',
              padding: '14px 24px',
              minHeight: '48px',
              background: buttonEnabled
                ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                : 'rgba(71, 85, 105, 0.5)',
              border: 'none',
              borderRadius: '12px',
              color: buttonEnabled ? '#0f172a' : colors.textMuted,
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
  };

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (currentPhase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(false, '', true, 'Start', true)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              The Self-Siphoning Chain
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 112: Chain Fountain
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
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px', fontWeight: 700 }}>
                The Internet's Favorite Physics Demo
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
                Take a chain, pile it in a beaker, and let one end drop to the floor. Instead of
                simply sliding over the rim, the chain <strong style={{ color: colors.chainLink, fontWeight: 700 }}>
                rises up into the air</strong> before falling - creating a beautiful fountain!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 700 }}>
                Also called the <span style={{ color: colors.accent }}>Mould Effect</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 400 }}>
                Named after Steve Mould who popularized it on YouTube, this effect puzzled
                physicists until 2014 when researchers figured out the elegant explanation.
                The secret lies in how momentum is transferred at the pickup point.
              </p>
            </div>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, "Let's Explore!")}
      </div>
    );
  }

  // PREDICT PHASE
  if (currentPhase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', !!prediction)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '13px' }}>
              Prediction 1 of 2
            </span>
          </div>

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
              What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              A <strong>beaker filled with chain</strong> sits on a table. One end of the chain
              is dropped over the side to a lower surface. Gravity pulls the falling chain down,
              which in turn pulls more chain from the beaker.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              Watch how the green arrows show the "kick" force - the reaction when links are picked up.
              Notice how the purple arrows show the chain's momentum direction.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              When you drop one end of the chain, what happens?
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
                    minHeight: '48px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #fde68a' : '2px solid transparent',
                    borderRadius: '12px',
                    color: prediction === p.id ? '#0f172a' : colors.textPrimary,
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

          {renderNavDots()}
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (currentPhase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', true)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              Create Your Chain Fountain!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Drop the chain and watch how the fountain forms
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
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              What to Watch For:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              Notice how the chain rises above the beaker rim before falling. Observe how changing the parameters affects the fountain height.
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Higher drop height causes higher fountain</li>
              <li>Stiffer chain results in more pronounced fountain</li>
              <li>Flexible chain creates barely any fountain</li>
              <li>Watch how the arc shape changes with settings</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Key Physics Terms:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              <strong style={{ color: colors.chainLink }}>Momentum</strong> is defined as mass times velocity (p = mv). The chain fountain demonstrates how momentum is transferred at the pickup point.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              <strong style={{ color: colors.forceUp }}>Reaction Force</strong> refers to Newton's Third Law - for every action there is an equal and opposite reaction. This is calculated from F = dp/dt.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6' }}>
              Understanding chain dynamics is important for real-world engineering applications like anchor deployment, cable systems, and industrial machinery. This practical knowledge is useful in designing systems that involve flexible chains and ropes.
            </p>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, 'See What I Learned')}
      </div>
    );
  }

  // REVIEW PHASE
  if (currentPhase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', true)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '!' : '!'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Great Observation!' : 'Surprising, Right?'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {isCorrect ? 'You correctly predicted the chain would rise!' : 'Most people don\'t expect the chain to rise above the rim.'}
            </p>
          </div>

          {/* Visual diagram for review */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto' }}>
              {/* Simple diagram showing the kick mechanism */}
              <rect width="300" height="200" fill={colors.bgDark} rx="8" />

              {/* Beaker */}
              <rect x="50" y="80" width="60" height="80" fill="none" stroke={colors.beakerEdge} strokeWidth="2" rx="2" />

              {/* Chain arc */}
              <path d="M 80 80 Q 80 30 130 30 Q 180 30 180 100" fill="none" stroke={colors.chainLink} strokeWidth="4" />

              {/* Kick arrow */}
              <line x1="80" y1="80" x2="80" y2="50" stroke={colors.forceUp} strokeWidth="3" />
              <polygon points="75,55 80,45 85,55" fill={colors.forceUp} />

              {/* Labels */}
              <text x="90" y="55" fill={colors.textSecondary} fontSize="11">Kick!</text>
              <text x="150" y="180" fill={colors.textMuted} fontSize="11" textAnchor="middle">Chain rises before falling</text>
            </svg>
          </div>

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
              As you observed, the key is what happens at the <strong style={{ color: colors.chainLink }}>pickup point</strong>.
              Each chain link can't simply slide upward - it must rotate to change direction.
              When it rotates, it pushes against the surface (or other links) below it.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              By Newton's 3rd law, the surface pushes BACK on the link. This upward
              <strong style={{ color: colors.forceUp }}> "kick"</strong> gives the chain extra
              upward momentum, propelling it above the container rim!
            </p>
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                A perfectly flexible rope wouldn't create a fountain - it can smoothly curve
                without pushing. It's the chain's rigidity that creates the kick!
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
              The Momentum Balance:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The falling chain gains downward momentum from gravity. The kick transfers some
              of this to upward momentum at the pickup point. The fountain height depends on
              the <strong>ratio of kick force to chain weight</strong>.
            </p>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (currentPhase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', !!twistPrediction)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '13px' }}>
              Prediction 2 of 2
            </span>
          </div>

          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What's actually doing the pushing?
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
              The Mystery Force:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              We've established that the chain rises above the container. But what exactly is
              providing that upward force? Watch the pickup point carefully - the chain is just
              sitting there in the beaker. Why would pulling on one end make the rest jump up?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              What creates the upward force?
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
                    minHeight: '48px',
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

          {renderNavDots()}
        </div>
        {renderBottomBar(true, !!twistPrediction, 'See The Mechanism')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (currentPhase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', true)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              The Kick Mechanism
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the pickup point carefully and observe the forces
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
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              What to Watch For - Key Observations:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              Notice how each link must rotate to change from horizontal to vertical orientation. Observe the reaction forces at work.
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Each link must rotate to change from horizontal to vertical</li>
              <li>The link pushes down on what's below it while rotating</li>
              <li>Newton's 3rd: the surface pushes UP on the link</li>
              <li>This "kick" launches the chain upward!</li>
            </ul>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, 'Understand the Kick')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (currentPhase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', true)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '!' : '!'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Physics Intuition!' : 'The Elegant "Kick"!'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {isCorrect ? 'You correctly identified the kick mechanism!' : 'The answer reveals a beautiful physics principle.'}
            </p>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto' }}>
              <rect width="300" height="180" fill={colors.bgDark} rx="8" />

              {/* Link rotation diagram */}
              <circle cx="100" cy="90" r="15" fill="none" stroke={colors.chainLink} strokeWidth="2" strokeDasharray="4,2" />
              <rect x="95" y="70" width="10" height="40" fill={colors.chainLink} rx="2" />

              {/* Rotation arrow */}
              <path d="M 120 75 A 25 25 0 0 1 120 105" fill="none" stroke={colors.momentum} strokeWidth="2" />
              <polygon points="118,105 125,110 122,100" fill={colors.momentum} />

              {/* Force arrows */}
              <line x1="100" y1="115" x2="100" y2="140" stroke={colors.forceDown} strokeWidth="2" />
              <polygon points="95,135 100,145 105,135" fill={colors.forceDown} />
              <text x="110" y="140" fill={colors.textMuted} fontSize="11">Push down</text>

              <line x1="100" y1="65" x2="100" y2="40" stroke={colors.forceUp} strokeWidth="2" />
              <polygon points="95,45 100,35 105,45" fill={colors.forceUp} />
              <text x="110" y="45" fill={colors.textMuted} fontSize="11">Kick up!</text>

              {/* Labels */}
              <text x="200" y="90" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Link rotates</text>
              <text x="200" y="105" fill={colors.textSecondary} fontSize="11" textAnchor="middle">= reaction force</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              The Kick Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Think of each chain link as a tiny lever. When the chain above pulls it upward,
              the link must <strong style={{ color: colors.chainLink }}>rotate</strong> to change
              direction. One end goes up, the other end pushes <strong style={{ color: colors.forceDown }}>
              down</strong> against whatever is below (the surface or other links).
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              By Newton's third law, that downward push creates an equal upward reaction force.
              This is the <strong style={{ color: colors.forceUp }}>"kick"</strong> that launches
              each link with extra upward velocity, creating the fountain!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              Why Stiffness Matters:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              A stiffer chain (like ball chain) has links that resist bending. They must rotate
              more forcefully, creating a bigger kick. A flexible rope can simply curve smoothly
              without any kick - no fountain!
            </p>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, 'See Real Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (currentPhase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Chain Fountain"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (currentPhase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', true, 'Next', allCompleted)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Application {Math.min(transferCompleted.size + 1, 4)} of {transferApplications.length} - Explore all to continue
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
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0, fontWeight: 700 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '14px', fontWeight: 400 }}>Completed</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px', fontWeight: 400 }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0, fontWeight: 400 }}>
                  {app.insight}
                </p>
              </div>
              {!transferCompleted.has(app.id) && (
                <button
                  onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
                  style={{
                    marginTop: '12px',
                    padding: '10px 20px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Got It
                </button>
              )}
            </div>
          ))}

          {renderNavDots()}
        </div>
        {renderBottomBar(allCompleted, true, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (currentPhase === 'test') {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;
    const correctOption = currentQuestion?.options.find(o => o.correct);
    const isCorrectAnswer = selectedAnswer === correctOption?.id;

    // Handle confirming the answer
    const handleConfirmAnswer = () => {
      if (selectedAnswer && currentQuestion) {
        // Check if correct and update score
        if (isCorrectAnswer) {
          setQuizScore(prev => prev + 1);
        }
        // Save the answer
        setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
        setAnswerConfirmed(true);
      }
    };

    // Handle moving to next question
    const handleNextQuestion = () => {
      if (isLastQuestion) {
        setTestSubmitted(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerConfirmed(false);
      }
    };

    if (testSubmitted) {
      const correctCount = quizScore;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderProgressBar()}
          {renderNavBar(true, 'Back', true, 'Done', true)}

          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '!' : score >= 60 ? '!' : '!'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount}/{testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const qCorrectOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrect = userAnswer === qCorrectOption?.id;

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
                      {isCorrect ? 'Correct' : 'Incorrect'}
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
                      Correct: {qCorrectOption?.text}
                    </p>
                  )}
                </div>
              );
            })}

            {renderNavDots()}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Move Forward' : 'Try Again')}
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', false, '', false)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Question {currentQuestionIndex + 1} of {testQuestions.length}
            </p>
            <p style={{ color: colors.accent, fontSize: '14px', marginTop: '4px' }}>
              Score: {quizScore}/{currentQuestionIndex + (answerConfirmed ? 1 : 0)}
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px', maxWidth: '320px', margin: '8px auto 0' }}>
              Test your understanding of chain fountain physics, momentum transfer, and the reaction forces that create this fascinating effect. Select the best answer for each question.
            </p>
          </div>

          {currentQuestion && (
            <div
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                Q{currentQuestionIndex + 1} of {testQuestions.length}: {currentQuestion.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQuestion.options.map((option) => {
                  let buttonStyle: React.CSSProperties = {
                    padding: '10px 14px',
                    minHeight: '44px',
                    background: selectedAnswer === option.id
                      ? 'rgba(251, 191, 36, 0.3)'
                      : 'rgba(51, 65, 85, 0.5)',
                    border: selectedAnswer === option.id
                      ? '1px solid rgba(251, 191, 36, 0.5)'
                      : '1px solid transparent',
                    borderRadius: '8px',
                    color: colors.textSecondary,
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: answerConfirmed ? 'default' : 'pointer',
                  };

                  // Show correct/incorrect styling after confirmation
                  if (answerConfirmed) {
                    if (option.correct) {
                      buttonStyle.background = 'rgba(16, 185, 129, 0.3)';
                      buttonStyle.border = '1px solid rgba(16, 185, 129, 0.5)';
                    } else if (selectedAnswer === option.id && !option.correct) {
                      buttonStyle.background = 'rgba(239, 68, 68, 0.3)';
                      buttonStyle.border = '1px solid rgba(239, 68, 68, 0.5)';
                    }
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => !answerConfirmed && setSelectedAnswer(option.id)}
                      disabled={answerConfirmed}
                      style={buttonStyle}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>

              {/* Feedback after confirmation */}
              {answerConfirmed && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: isCorrectAnswer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrectAnswer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}>
                  <p style={{
                    color: isCorrectAnswer ? colors.success : colors.error,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}>
                    {isCorrectAnswer ? 'Correct!' : 'Incorrect'}
                  </p>
                  {!isCorrectAnswer && (
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '8px 0 0 0' }}>
                      The correct answer was: {correctOption?.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {renderNavDots()}
        </div>

        {/* Bottom action button */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          zIndex: 1000,
        }}>
          {!answerConfirmed ? (
            <button
              onClick={handleConfirmAnswer}
              disabled={!selectedAnswer}
              style={{
                width: '100%',
                padding: '14px 24px',
                minHeight: '48px',
                background: selectedAnswer
                  ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                  : 'rgba(71, 85, 105, 0.5)',
                border: 'none',
                borderRadius: '12px',
                color: selectedAnswer ? '#0f172a' : colors.textMuted,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                opacity: selectedAnswer ? 1 : 0.5,
              }}
            >
              Confirm Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              style={{
                width: '100%',
                padding: '14px 24px',
                minHeight: '48px',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                border: 'none',
                borderRadius: '12px',
                color: '#0f172a',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {isLastQuestion ? 'See Results' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (currentPhase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        {renderNavBar(true, 'Back', false, '', false)}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>!</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Chain Dynamics Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered the Mould Effect
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Chains rise due to "kick" from link rotation</li>
              <li>Newton's 3rd law creates the upward force</li>
              <li>Stiff chains create bigger fountain</li>
              <li>Higher drop creates higher fountain (more momentum)</li>
              <li>Same physics applies to cables and polymers</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(217, 119, 6, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              Try It Yourself:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Get a ball chain (like the ones used for keychains or light pulls), pile it in
              a mug, and drop one end over the side. Start with a low drop and increase it.
              You'll see the fountain grow! Share the video and explain the physics to your
              friends.
            </p>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, true, 'Complete Game', onPhaseComplete)}
      </div>
    );
  }

  // Default fallback - should render hook phase
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {renderProgressBar()}
      {renderNavBar(false, '', true, 'Start', true)}

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '16px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            The Self-Siphoning Chain
          </h1>
          <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
            Game 112: Chain Fountain
          </p>
          <p style={{ color: colors.textSecondary }}>Loading phase: {currentPhase}...</p>
        </div>
        {renderNavDots()}
      </div>
      {renderBottomBar(true, true, "Let's Explore!")}
    </div>
  );
};

export default ChainFountainRenderer;
