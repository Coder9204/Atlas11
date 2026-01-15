'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// NEWTON'S THIRD LAW (BALLOON ROCKET) RENDERER - Premium Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'inflate' | 'launch' | 'size_change' | 'reset' | 'answer_submit';
}

interface NewtonsThirdLawRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
type BalloonSize = 'small' | 'medium' | 'large';

// ============================================================================
// PREMIUM DESIGN SYSTEM
// ============================================================================
const design = {
  colors: {
    bgPrimary: '#0f0b15',
    bgSecondary: '#1a1625',
    bgTertiary: '#252030',
    bgElevated: '#3d3650',
    textPrimary: '#f5f3ff',
    textSecondary: '#a8a0c0',
    textTertiary: '#706890',
    primary: '#ef4444',
    primaryHover: '#dc2626',
    primaryMuted: '#450a0a',
    secondary: '#93c5fd',
    secondaryMuted: '#1e3a5f',
    balloon: '#ef4444',
    air: '#93c5fd',
    success: '#22c55e',
    successMuted: '#052e16',
    danger: '#ef4444',
    dangerMuted: '#450a0a',
    border: '#3d3650',
  },
  radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
  shadow: { sm: '0 1px 2px rgba(0,0,0,0.3)', md: '0 4px 12px rgba(0,0,0,0.4)', glow: (c: string) => `0 0 40px ${c}40` },
  font: { sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
};

const Button: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'success';
  disabled?: boolean;
  fullWidth?: boolean;
}> = ({ children, onClick, variant = 'primary', disabled = false, fullWidth = false }) => {
  const baseStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: design.radius.md,
    fontWeight: 600,
    fontSize: '15px',
    fontFamily: design.font.sans,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
      color: '#fff',
      boxShadow: design.shadow.md,
    },
    secondary: {
      background: design.colors.bgTertiary,
      color: design.colors.textPrimary,
      border: `1px solid ${design.colors.border}`,
    },
    ghost: {
      background: 'transparent',
      color: design.colors.textSecondary,
    },
    success: {
      background: `linear-gradient(135deg, ${design.colors.success} 0%, #16a34a 100%)`,
      color: '#fff',
      boxShadow: design.shadow.md,
    }
  };

  return (
    <button onClick={() => !disabled && onClick()} style={{ ...baseStyle, ...variants[variant] }}>
      {children}
    </button>
  );
};

const NewtonsThirdLawRenderer: React.FC<NewtonsThirdLawRendererProps> = ({
  width = 400,
  height = 500,
  onGameEvent,
  gamePhase
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [balloonSize, setBalloonSize] = useState<BalloonSize>('medium');
  const [isInflated, setIsInflated] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [balloonPosition, setBalloonPosition] = useState(10);
  const [airParticles, setAirParticles] = useState<Array<{x: number, y: number, id: number}>>([]);
  const [showAirFlow, setShowAirFlow] = useState(true);
  const [experimentCount, setExperimentCount] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [currentApplication, setCurrentApplication] = useState(0);

  const isNavigating = useRef(false);
  const animationRef = useRef<number>();
  const particleIdRef = useRef(0);

  const balloonSizes: Record<BalloonSize, { radius: number; thrust: number; duration: number }> = {
    small: { radius: 22, thrust: 0.8, duration: 1500 },
    medium: { radius: 32, thrust: 1.2, duration: 2500 },
    large: { radius: 45, thrust: 2.0, duration: 4000 }
  };

  const testQuestions = [
    { question: "What pushes the balloon forward?", options: ["The balloon pushes itself", "The air inside pushes the balloon", "The escaping air pushes back on the balloon", "Gravity pulls it forward"], correct: 2, explanation: "As the balloon pushes air out backward, by Newton's Third Law, the air pushes the balloon forward with an equal and opposite force." },
    { question: "Newton's Third Law states that forces always come in...", options: ["Singles", "Pairs (action-reaction)", "Triples", "Random amounts"], correct: 1, explanation: "Newton's Third Law tells us that forces always come in pairs - every action has an equal and opposite reaction." },
    { question: "If the balloon pushes air with 5N of force, how hard does the air push the balloon?", options: ["Less than 5N", "More than 5N", "Exactly 5N in the opposite direction", "It depends on the balloon size"], correct: 2, explanation: "Action-reaction forces are ALWAYS equal in magnitude and opposite in direction. If balloon pushes 5N backward, air pushes 5N forward." },
    { question: "Why does a bigger balloon travel farther?", options: ["Bigger balloons have stronger rubber", "More air can be expelled, providing thrust for longer", "Larger balloons are lighter", "The string is longer"], correct: 1, explanation: "A bigger balloon holds more air. More air expelled means the thrust force acts for a longer time, resulting in greater total impulse and distance." },
    { question: "What happens to the action-reaction forces when the balloon stops?", options: ["They disappear", "They're still equal while air escapes, then both stop", "The action becomes bigger than reaction", "They reverse direction"], correct: 1, explanation: "While air escapes, forces remain equal and opposite. When the air stops flowing, both action and reaction forces stop - the balloon coasts." },
    { question: "A rocket in space has no air to push against. How does it move?", options: ["It can't move in space", "It pushes against leftover air molecules", "Exhaust gases push back on the rocket (action-reaction)", "Gravity pulls it forward"], correct: 2, explanation: "Rockets work by Newton's Third Law: they expel exhaust gases backward, and the gases push the rocket forward. No external air is needed!" },
    { question: "When you swim, you push water backward. What happens?", options: ["Nothing - water doesn't push back", "The water pushes you forward (reaction force)", "You push yourself forward", "The water pulls you forward"], correct: 1, explanation: "When you push water backward with your hands, the water pushes you forward with an equal force. This is how swimming works!" },
    { question: "A person jumps off a skateboard. The skateboard rolls backward. Why?", options: ["Wind pushes the skateboard", "The person pushed backward on the skateboard (action creates reaction)", "Gravity affects the skateboard differently", "The wheels are loose"], correct: 1, explanation: "When you push forward to jump, you also push backward on the skateboard. By Newton's Third Law, the skateboard rolls backward." },
    { question: "If action and reaction are equal, why doesn't everything stay still?", options: ["The law is only approximately true", "The forces act on different objects, so they can move differently", "Heavier objects ignore the reaction", "Motion cancels out the forces"], correct: 1, explanation: "Action and reaction act on DIFFERENT objects! The balloon and air each feel a force, but each object responds based on its own mass and other forces." },
    { question: "A balloon rocket and a real rocket work on the same principle. What is it?", options: ["Both use fuel", "Both use Newton's Third Law - expelling mass backward for forward thrust", "Both need air to push against", "Both have wings"], correct: 1, explanation: "Both balloon rockets and real rockets work by expelling mass (air or exhaust) backward. The reaction force pushes the vehicle forward. Same physics!" }
  ];

  const applications = [
    { title: "Space Rockets", description: "Rockets expel hot exhaust gases backward at high speed. The gases push back on the rocket, propelling it forward - even in the vacuum of space!", icon: "🚀", stats: "SpaceX Falcon 9: 7,600 kN thrust" },
    { title: "Swimming", description: "Swimmers push water backward with their hands and feet. The water pushes back, propelling them forward through the pool.", icon: "🏊", stats: "Olympic swimmers: ~100N reaction force" },
    { title: "Jet Engines", description: "Jets compress air, mix it with fuel, and blast it backward. The exhaust pushes back on the engine, creating thrust.", icon: "✈️", stats: "Boeing 747 engine: 250+ kN thrust each" },
    { title: "Walking", description: "When you walk, you push backward against the ground. The ground pushes forward on you - that's what moves you!", icon: "🚶", stats: "Average walking: 500-600N ground reaction" }
  ];

  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const emit = useCallback((type: GameEvent['type'], data: Record<string, unknown>, eventType?: GameEvent['eventType']) => {
    onGameEvent?.({ type, phase, data, timestamp: Date.now(), eventType });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emit, phase]);

  const inflateBalloon = useCallback(() => {
    setIsInflated(true);
    setBalloonPosition(10);
    setAirParticles([]);
    emit('interaction', { action: 'inflate', size: balloonSize }, 'inflate');
  }, [balloonSize, emit]);

  const launchBalloon = useCallback(() => {
    if (!isInflated || isLaunching) return;
    setIsLaunching(true);
    const config = balloonSizes[balloonSize];
    const startTime = Date.now();
    let position = 10;

    emit('interaction', { action: 'launch', size: balloonSize }, 'launch');

    const addParticle = () => {
      particleIdRef.current += 1;
      setAirParticles(prev => [...prev.slice(-12), { x: 0, y: Math.random() * 16 - 8, id: particleIdRef.current }]);
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.duration, 1);
      const thrustMultiplier = 1 - Math.pow(progress, 0.5);
      const speed = config.thrust * thrustMultiplier;
      position += speed;
      setBalloonPosition(Math.min(position, 95));

      if (thrustMultiplier > 0.1 && Math.random() < 0.3) addParticle();
      emit('visual_state_update', { position, progress, thrustMultiplier, size: balloonSize });

      if (progress < 1 && position < 95) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsLaunching(false);
        setIsInflated(false);
        setExperimentCount(prev => prev + 1);
        if (position > maxDistance) setMaxDistance(Math.round(position));
        setTimeout(() => setAirParticles([]), 500);
        emit('result', { distance: position, size: balloonSize, duration: config.duration });
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [isInflated, isLaunching, balloonSize, maxDistance, emit, balloonSizes]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsInflated(false);
    setIsLaunching(false);
    setBalloonPosition(10);
    setAirParticles([]);
    emit('interaction', { action: 'reset' }, 'reset');
  }, [emit]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === testQuestions[currentQuestion].correct;
    if (isCorrect) setCorrectAnswers(prev => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emit('interaction', { question: currentQuestion, answer: answerIndex, correct: isCorrect }, 'answer_submit');
  }, [currentQuestion, answeredQuestions, emit, testQuestions]);

  const renderVisualization = () => {
    const stringY = height * 0.35;
    const stringLength = width - 60;
    const balloonX = 30 + (balloonPosition / 100) * stringLength;
    const config = balloonSizes[balloonSize];
    const currentRadius = isInflated ? config.radius : config.radius * 0.3;

    return (
      <svg width={width} height={height * 0.5} viewBox={`0 0 ${width} ${height * 0.5}`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id="balloonGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor={design.colors.balloon} />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <filter id="airGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feFlood floodColor="#3b82f6" floodOpacity="0.5" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect width={width} height={height * 0.5} fill={design.colors.bgPrimary} />
        {[...Array(15)].map((_, i) => (
          <circle key={i} cx={(i * 47 + 20) % width} cy={(i * 31 + 10) % (height * 0.5)} r={1 + (i % 3)} fill="white" opacity={0.15 + (i % 5) * 0.05} />
        ))}

        <line x1={25} y1={stringY} x2={width - 25} y2={stringY} stroke={design.colors.textTertiary} strokeWidth={2} strokeDasharray="6,6" />
        <circle cx={30} cy={stringY} r={5} fill={design.colors.primary} />
        <circle cx={width - 30} cy={stringY} r={5} fill={design.colors.success} />

        {showAirFlow && airParticles.map((particle, idx) => (
          <g key={particle.id}>
            <circle cx={balloonX - currentRadius - 10 - (idx * 7)} cy={stringY + particle.y} r={4} fill={design.colors.air} filter="url(#airGlow)" opacity={1 - (idx * 0.07)} />
            <path d={`M${balloonX - currentRadius - 5 - (idx * 7)} ${stringY + particle.y} l-7 0 l2 -2 m-2 2 l2 2`} stroke={design.colors.air} strokeWidth={1.5} fill="none" opacity={0.5 - (idx * 0.03)} />
          </g>
        ))}

        <g transform={`translate(${balloonX}, ${stringY})`}>
          <ellipse cx={0} cy={0} rx={currentRadius} ry={currentRadius * 0.8} fill="url(#balloonGrad)" style={isLaunching ? { filter: 'brightness(1.1)' } : {}} />
          <path d={`M${-currentRadius * 0.15} 0 L${-currentRadius - 7} -4 L${-currentRadius - 7} 4 Z`} fill="#991b1b" />
          <ellipse cx={currentRadius * 0.3} cy={-currentRadius * 0.2} rx={currentRadius * 0.25} ry={currentRadius * 0.15} fill="rgba(255,255,255,0.35)" />
          <circle cx={-currentRadius - 4} cy={0} r={3} fill="#7f1d1d" />
        </g>

        {isLaunching && (
          <g>
            <g transform={`translate(${balloonX - currentRadius - 35}, ${stringY - 28})`}>
              <path d="M28 0 L0 0 L6 -5 M0 0 L6 5" stroke={design.colors.air} strokeWidth={2.5} fill="none" />
              <text x={14} y={-10} textAnchor="middle" fill={design.colors.air} fontSize="10" fontWeight="bold" fontFamily={design.font.sans}>Action</text>
            </g>
            <g transform={`translate(${balloonX + currentRadius + 8}, ${stringY + 28})`}>
              <path d="M0 0 L28 0 L22 -5 M28 0 L22 5" stroke={design.colors.primary} strokeWidth={2.5} fill="none" />
              <text x={14} y={14} textAnchor="middle" fill={design.colors.primary} fontSize="10" fontWeight="bold" fontFamily={design.font.sans}>Reaction</text>
            </g>
          </g>
        )}

        <g transform={`translate(${width - 65}, 15)`}>
          <rect x={0} y={0} width={55} height={40} rx={6} fill="rgba(0,0,0,0.5)" />
          <text x={27.5} y={16} textAnchor="middle" fill={design.colors.textSecondary} fontSize="9" fontFamily={design.font.sans}>Distance</text>
          <text x={27.5} y={32} textAnchor="middle" fill={design.colors.success} fontSize="14" fontWeight="bold" fontFamily={design.font.sans}>{Math.round(balloonPosition)}%</text>
        </g>

        <g transform={`translate(10, 15)`}>
          <rect x={0} y={0} width={55} height={40} rx={6} fill="rgba(0,0,0,0.5)" />
          <text x={27.5} y={16} textAnchor="middle" fill={design.colors.textSecondary} fontSize="9" fontFamily={design.font.sans}>Size</text>
          <text x={27.5} y={32} textAnchor="middle" fill={design.colors.primary} fontSize="11" fontWeight="bold" fontFamily={design.font.sans}>{balloonSize.toUpperCase()}</text>
        </g>
      </svg>
    );
  };

  // ==================== PHASE RENDERERS ====================
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, ${design.colors.bgSecondary} 100%)` }}>
      <div style={{ fontSize: '72px', marginBottom: '24px', filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3))' }}>🎈</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans, textAlign: 'center' }}>
        The Balloon Rocket
      </h1>
      <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: '32px', fontFamily: design.font.sans, textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
        A balloon on a string... inflate it and let go! What makes it zoom across the room?
      </p>
      <div style={{ background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.lg, padding: '20px 28px', marginBottom: '32px', maxWidth: '340px' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, lineHeight: 1.5 }}>
          "Does the balloon push itself forward, or does something else push it?"
        </p>
      </div>
      <Button onClick={() => goToPhase('predict')}>Let's Find Out →</Button>
      <p style={{ fontSize: '13px', color: design.colors.textTertiary, marginTop: '24px', fontFamily: design.font.sans }}>
        Newton's Third Law • Action-Reaction
      </p>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans }}>Make Your Prediction</h2>
      <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans, textAlign: 'center' }}>
        What makes the balloon move forward?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
        {[
          { id: 'self', label: 'The balloon pushes itself forward', icon: '🎈' },
          { id: 'air_inside', label: 'The air inside pushes the balloon', icon: '💨' },
          { id: 'air_reaction', label: 'Air pushed out pushes back on balloon', icon: '↔️' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setPrediction(option.id); emit('prediction', { prediction: option.id }); }}
            style={{
              padding: '16px 20px',
              borderRadius: design.radius.md,
              border: prediction === option.id ? `2px solid ${design.colors.primary}` : `1px solid ${design.colors.border}`,
              background: prediction === option.id ? design.colors.primaryMuted : design.colors.bgSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '24px' }}>{option.icon}</span>
            <span style={{ fontSize: '15px', color: design.colors.textPrimary, fontFamily: design.font.sans, fontWeight: 500 }}>{option.label}</span>
          </button>
        ))}
      </div>
      {prediction && (
        <div style={{ marginTop: '24px' }}>
          <Button onClick={() => goToPhase('play')}>Test It! →</Button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: design.colors.bgSecondary }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans }}>Air particles:</span>
          <button
            onClick={() => setShowAirFlow(!showAirFlow)}
            style={{
              padding: '6px 14px',
              borderRadius: design.radius.md,
              border: 'none',
              background: showAirFlow ? design.colors.secondary : design.colors.bgTertiary,
              color: showAirFlow ? '#000' : design.colors.textSecondary,
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: design.font.sans,
              cursor: 'pointer',
            }}
          >
            {showAirFlow ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isInflated && !isLaunching && <Button onClick={inflateBalloon}>🎈 Inflate</Button>}
          {isInflated && !isLaunching && <Button onClick={launchBalloon} variant="success">🚀 Release!</Button>}
          {(balloonPosition > 20 || (!isInflated && !isLaunching && experimentCount > 0)) && <Button onClick={resetExperiment} variant="secondary">🔄 Reset</Button>}
        </div>
        <p style={{ fontSize: '13px', color: design.colors.textTertiary, fontFamily: design.font.sans }}>
          Launches: {experimentCount} • Best: {maxDistance}%
        </p>
        {experimentCount >= 2 && (
          <Button onClick={() => goToPhase('review')}>I see the pattern! →</Button>
        )}
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary, overflowY: 'auto' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px', fontFamily: design.font.sans }}>Newton's Third Law!</h2>
      <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '16px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600 }}>
          "For every action, there is an equal and opposite reaction"
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '340px', width: '100%', marginBottom: '16px' }}>
        <div style={{ background: design.colors.secondaryMuted, border: `1px solid ${design.colors.secondary}40`, borderRadius: design.radius.md, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>←</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.secondary, fontFamily: design.font.sans, marginBottom: '4px' }}>ACTION:</p>
            <p style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans }}>Balloon pushes air backward</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '20px', color: design.colors.success, fontWeight: 700 }}>=</div>
        <div style={{ background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.md, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.primary, fontFamily: design.font.sans, marginBottom: '4px' }}>REACTION:</p>
            <p style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans }}>Air pushes balloon forward</p>
          </div>
          <span style={{ fontSize: '28px' }}>→</span>
        </div>
      </div>
      <p style={{ fontSize: '14px', color: prediction === 'air_reaction' ? design.colors.success : design.colors.textSecondary, fontFamily: design.font.sans, marginBottom: '20px' }}>
        Your prediction: {prediction === 'air_reaction' ? '✅ Correct!' : '🤔 Now you know!'}
      </p>
      <Button onClick={() => goToPhase('twist_predict')}>What About Size? →</Button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎈📏</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans }}>Plot Twist: Balloon Size!</h2>
      <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans, textAlign: 'center' }}>
        If we use a BIGGER balloon with more air, what happens?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
        {[
          { id: 'same', label: "Same distance - force is always equal" },
          { id: 'less', label: "Less distance - bigger balloon is heavier" },
          { id: 'more', label: "More distance - more air = more thrust time" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setTwistPrediction(option.id); emit('prediction', { twistPrediction: option.id }); }}
            style={{
              padding: '16px 20px',
              borderRadius: design.radius.md,
              border: twistPrediction === option.id ? `2px solid ${design.colors.primary}` : `1px solid ${design.colors.border}`,
              background: twistPrediction === option.id ? design.colors.primaryMuted : design.colors.bgSecondary,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '14px', color: design.colors.textPrimary, fontFamily: design.font.sans }}>{option.label}</span>
          </button>
        ))}
      </div>
      {twistPrediction && (
        <div style={{ marginTop: '24px' }}>
          <Button onClick={() => goToPhase('twist_play')}>Test Different Sizes! →</Button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: design.colors.bgSecondary }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans }}>Size:</span>
          {(['small', 'medium', 'large'] as BalloonSize[]).map((size) => (
            <button
              key={size}
              onClick={() => { setBalloonSize(size); resetExperiment(); emit('interaction', { size }, 'size_change'); }}
              disabled={isLaunching}
              style={{
                padding: '8px 16px',
                borderRadius: design.radius.md,
                border: 'none',
                background: balloonSize === size ? design.colors.primary : design.colors.bgTertiary,
                color: balloonSize === size ? '#fff' : design.colors.textSecondary,
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: design.font.sans,
                cursor: isLaunching ? 'not-allowed' : 'pointer',
              }}
            >
              {size === 'small' ? '🎈' : size === 'medium' ? '🎈🎈' : '🎈🎈🎈'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isInflated && !isLaunching && <Button onClick={inflateBalloon}>🎈 Inflate</Button>}
          {isInflated && !isLaunching && <Button onClick={launchBalloon} variant="success">🚀 Release!</Button>}
          {(balloonPosition > 20 || (!isInflated && !isLaunching && experimentCount > 0)) && <Button onClick={resetExperiment} variant="secondary">🔄 Reset</Button>}
        </div>
        <p style={{ fontSize: '13px', color: design.colors.textTertiary, fontFamily: design.font.sans }}>
          Try all sizes! Best: {maxDistance}%
        </p>
        {experimentCount >= 3 && (
          <Button onClick={() => goToPhase('twist_review')}>I understand! →</Button>
        )}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px', fontFamily: design.font.sans }}>Force, Time & Impulse</h2>
      <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, marginBottom: '8px' }}>More air = Longer thrust time!</p>
        <p style={{ fontSize: '14px', color: design.colors.textPrimary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.5 }}>
          The force is the same, but a bigger balloon expels air for LONGER, providing more total impulse.
        </p>
      </div>
      <div style={{ background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, marginBottom: '8px' }}>Impulse = Force × Time</p>
        <p style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans, textAlign: 'center' }}>
          Same force, longer time → more momentum → more distance!
        </p>
      </div>
      <p style={{ fontSize: '14px', color: twistPrediction === 'more' ? design.colors.success : design.colors.textSecondary, fontFamily: design.font.sans, marginBottom: '20px' }}>
        Your prediction: {twistPrediction === 'more' ? '✅ Exactly!' : '🤔 Now you understand!'}
      </p>
      <Button onClick={() => goToPhase('transfer')}>See Real Examples →</Button>
    </div>
  );

  const renderTransfer = () => {
    const app = applications[currentApplication];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', background: design.colors.bgPrimary }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '20px', fontFamily: design.font.sans, textAlign: 'center' }}>
          Action-Reaction Everywhere!
        </h2>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>{app.icon}</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', marginBottom: '12px' }}>{app.title}</h3>
            <p style={{ fontSize: '14px', color: design.colors.textPrimary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.6, marginBottom: '16px' }}>{app.description}</p>
            <div style={{ background: design.colors.bgTertiary, borderRadius: design.radius.md, padding: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans }}>📊 {app.stats}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            {applications.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentApplication(idx)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: design.radius.full,
                  border: 'none',
                  background: idx === currentApplication ? design.colors.primary : design.colors.bgElevated,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Button onClick={() => setCurrentApplication(prev => Math.max(0, prev - 1))} variant="secondary" disabled={currentApplication === 0}>← Previous</Button>
            <Button onClick={() => setCurrentApplication(prev => Math.min(applications.length - 1, prev + 1))} variant="secondary" disabled={currentApplication === applications.length - 1}>Next →</Button>
          </div>
        </div>
        <Button onClick={() => goToPhase('test')} fullWidth>Take the Quiz! →</Button>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', background: design.colors.bgPrimary }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans }}>Question {currentQuestion + 1}/{testQuestions.length}</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: design.colors.success, fontFamily: design.font.sans }}>Score: {correctAnswers}/{answeredQuestions.size}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: design.colors.textPrimary, fontFamily: design.font.sans, marginBottom: '20px', lineHeight: 1.5 }}>{q.question}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.options.map((option, idx) => {
              let bg = design.colors.bgSecondary;
              let border = design.colors.border;
              if (isAnswered) {
                if (idx === q.correct) { bg = design.colors.successMuted; border = design.colors.success; }
                else if (idx === selectedAnswer && idx !== q.correct) { bg = design.colors.dangerMuted; border = design.colors.danger; }
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleTestAnswer(idx)}
                  disabled={isAnswered}
                  style={{
                    padding: '14px 16px',
                    borderRadius: design.radius.md,
                    border: `1px solid ${border}`,
                    background: bg,
                    cursor: isAnswered ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '14px', color: design.colors.textPrimary, fontFamily: design.font.sans }}>{option}</span>
                </button>
              );
            })}
          </div>
          {showExplanation && (
            <div style={{ marginTop: '20px', background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.md, padding: '16px' }}>
              <p style={{ fontSize: '13px', color: design.colors.primary, fontFamily: design.font.sans, lineHeight: 1.5 }}>💡 {q.explanation}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button
            onClick={() => { setCurrentQuestion(prev => Math.max(0, prev - 1)); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion - 1)); }}
            variant="secondary"
            disabled={currentQuestion === 0}
          >
            ← Back
          </Button>
          {currentQuestion < testQuestions.length - 1 ? (
            <Button onClick={() => { setCurrentQuestion(prev => prev + 1); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion + 1)); }} variant="secondary">Next →</Button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <Button onClick={() => goToPhase('mastery')}>Complete! →</Button>
          ) : (
            <span style={{ fontSize: '13px', color: design.colors.textTertiary, fontFamily: design.font.sans, alignSelf: 'center' }}>Answer all questions</span>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, ${design.colors.primaryMuted} 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
        <h2 style={{ fontSize: '26px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans, textAlign: 'center' }}>Newton's Third Law Master!</h2>
        <div style={{ fontSize: '56px', fontWeight: 700, color: design.colors.success, marginBottom: '8px', fontFamily: design.font.sans }}>{percentage}%</div>
        <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans }}>{correctAnswers}/{testQuestions.length} correct answers</p>
        <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '24px', maxWidth: '320px', width: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: design.colors.primary, fontFamily: design.font.sans, marginBottom: '12px', textAlign: 'center' }}>Key Takeaways:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {['Forces always come in pairs', 'Action = Reaction (equal & opposite)', 'Forces act on different objects', 'Rockets, swimming, walking all use this!'].map((item, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: design.colors.success }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <Button onClick={() => {
          setPhase('hook');
          setExperimentCount(0);
          setMaxDistance(0);
          setCurrentQuestion(0);
          setCorrectAnswers(0);
          setAnsweredQuestions(new Set());
          setPrediction(null);
          setTwistPrediction(null);
          setBalloonSize('medium');
        }}>
          Play Again 🔄
        </Button>
        <style>{`
          @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }
        `}</style>
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px', animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`, pointerEvents: 'none', fontSize: '20px' }}>
            {['🎈', '🚀', '⭐', '✨'][Math.floor(Math.random() * 4)]}
          </div>
        ))}
      </div>
    );
  };

  const phases: Record<Phase, () => JSX.Element> = {
    hook: renderHook,
    predict: renderPredict,
    play: renderPlay,
    review: renderReview,
    twist_predict: renderTwistPredict,
    twist_play: renderTwistPlay,
    twist_review: renderTwistReview,
    transfer: renderTransfer,
    test: renderTest,
    mastery: renderMastery
  };

  const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  return (
    <div style={{ width, height, borderRadius: design.radius.lg, overflow: 'hidden', position: 'relative', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
      {phases[phase]()}
      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '4px' }}>
        {phaseList.map((p, idx) => (
          <div
            key={p}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: design.radius.full,
              background: phase === p ? design.colors.primary : idx < phaseList.indexOf(phase) ? design.colors.primaryHover : design.colors.bgElevated,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NewtonsThirdLawRenderer;
