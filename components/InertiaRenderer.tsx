'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// INERTIA (COIN-CARD-CUP) RENDERER - Premium Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'card_flick' | 'speed_change' | 'coin_stack' | 'tablecloth_pull' | 'reset' | 'answer_submit';
}

interface InertiaRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// ============================================================================
// PREMIUM DESIGN SYSTEM
// ============================================================================
const design = {
  colors: {
    bgPrimary: '#0c0a09',
    bgSecondary: '#1c1917',
    bgTertiary: '#292524',
    bgElevated: '#44403c',
    textPrimary: '#fafaf9',
    textSecondary: '#a8a29e',
    textTertiary: '#78716c',
    primary: '#f59e0b',
    primaryHover: '#d97706',
    primaryMuted: '#451a03',
    secondary: '#6366f1',
    secondaryMuted: '#312e81',
    coin: '#fcd34d',
    coinEdge: '#b45309',
    card: '#ef4444',
    cup: '#6366f1',
    cupInner: '#312e81',
    success: '#22c55e',
    successMuted: '#052e16',
    danger: '#ef4444',
    dangerMuted: '#450a0a',
    border: '#44403c',
  },
  radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
  shadow: { sm: '0 1px 2px rgba(0,0,0,0.3)', md: '0 4px 12px rgba(0,0,0,0.4)', glow: (c: string) => `0 0 40px ${c}40` },
  font: { sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
};

const Button: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
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
      color: '#000',
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
    }
  };

  return (
    <button onClick={() => !disabled && onClick()} style={{ ...baseStyle, ...variants[variant] }}>
      {children}
    </button>
  );
};

const InertiaRenderer: React.FC<InertiaRendererProps> = ({
  width = 400,
  height = 500,
  onGameEvent,
  gamePhase
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [flickSpeed, setFlickSpeed] = useState<'slow' | 'fast'>('fast');
  const [coinCount, setCoinCount] = useState(1);
  const [isFlicking, setIsFlicking] = useState(false);
  const [cardPosition, setCardPosition] = useState(0);
  const [coinFalling, setCoinFalling] = useState(false);
  const [coinInCup, setCoinInCup] = useState(false);
  const [coinWithCard, setCoinWithCard] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [currentApplication, setCurrentApplication] = useState(0);

  const isNavigating = useRef(false);

  const testQuestions = [
    { question: "Why does the coin fall into the cup when the card is flicked fast?", options: ["The coin is too heavy to move", "The coin's inertia keeps it in place while the card moves", "The card pushes the coin down", "Gravity pulls the coin sideways"], correct: 1, explanation: "The coin has inertia - it resists changes to its state of rest. When the card is removed quickly, the coin doesn't have time to accelerate with it." },
    { question: "What is inertia?", options: ["A type of friction", "The tendency of objects to resist changes in motion", "The force of gravity on an object", "The speed of an object"], correct: 1, explanation: "Inertia is the property of matter that causes objects at rest to stay at rest and objects in motion to stay in motion, unless acted upon by a force." },
    { question: "Why does a slow pull move the coin with the card?", options: ["Gravity is stronger during slow motion", "Friction has time to accelerate the coin", "The coin becomes lighter", "Inertia disappears when moving slowly"], correct: 1, explanation: "A slow pull gives friction time to act on the coin, gradually accelerating it to match the card's velocity." },
    { question: "If you double the number of coins, how does inertia change?", options: ["It stays the same", "It doubles (more mass = more inertia)", "It halves", "It becomes zero"], correct: 1, explanation: "Inertia is directly proportional to mass. Doubling the mass doubles the inertia, making the stack even more resistant to change." },
    { question: "Which Newton's Law describes inertia?", options: ["Newton's Second Law (F=ma)", "Newton's Third Law (action-reaction)", "Newton's First Law (Law of Inertia)", "Newton's Law of Gravity"], correct: 2, explanation: "Newton's First Law, also called the Law of Inertia, states that objects maintain their state of motion unless acted upon by a net force." },
    { question: "A magician pulls a tablecloth from under dishes. Why don't they fall?", options: ["Magic makes them float", "The tablecloth is very slippery", "The dishes' inertia keeps them in place during the quick pull", "The dishes are glued down"], correct: 2, explanation: "The quick pull doesn't give friction enough time to accelerate the dishes. Their inertia keeps them approximately stationary." },
    { question: "Why do you lurch forward when a car stops suddenly?", options: ["The car pushes you forward", "Your inertia keeps you moving while the car stops", "Air pushes you forward", "The seat pushes you"], correct: 1, explanation: "Your body has inertia and wants to continue moving at the car's original speed. When the car stops, you keep moving forward." },
    { question: "Which has more inertia: a bowling ball or a tennis ball?", options: ["Tennis ball (it's faster)", "They have equal inertia", "Bowling ball (more mass = more inertia)", "Neither has inertia"], correct: 2, explanation: "The bowling ball has much more mass, therefore it has much more inertia and is harder to start or stop moving." },
    { question: "If there was no friction, what would happen with a slow card pull?", options: ["The coin would still move with the card", "The coin would stay in place even with slow pull", "The coin would fly away", "The coin would sink into the card"], correct: 1, explanation: "Without friction, there's no force to accelerate the coin. It would stay in place regardless of how slowly you pulled the card." },
    { question: "Astronauts in space struggle to stop spinning. Why?", options: ["There's no gravity", "Space is cold", "Without friction or air resistance, their inertia keeps them spinning", "They're too dizzy"], correct: 2, explanation: "In space, there's almost nothing to push against to stop rotating. Their rotational inertia keeps them spinning until they can push against something." }
  ];

  const applications = [
    { title: "Tablecloth Magic Trick", description: "Magicians whip tablecloths from under dishes using the same principle - quick pulls don't give inertia time to be overcome by friction.", icon: "🎩", stats: "Quick pull: <0.1s contact time" },
    { title: "Seatbelt Safety", description: "In a crash, your body's inertia keeps you moving at the original speed. Seatbelts provide the force to stop you with the car.", icon: "🚗", stats: "At 50 km/h, body has ~15,000 J of kinetic energy" },
    { title: "Spacecraft Maneuvers", description: "Satellites and spacecraft must account for inertia - once rotating, they continue without friction to stop them.", icon: "🛰️", stats: "ISS rotation rate: 4°/minute" },
    { title: "Hammer Throw", description: "Athletes spin and release the hammer - its inertia carries it forward while the athlete stops spinning.", icon: "🏋️", stats: "Release speed: ~29 m/s (105 km/h)" }
  ];

  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

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

  const performFlick = useCallback(() => {
    if (isFlicking) return;
    setIsFlicking(true);
    setShowResult(false);
    setCoinFalling(false);
    setCoinInCup(false);
    setCoinWithCard(false);
    setCardPosition(0);

    const flickDuration = flickSpeed === 'fast' ? 100 : 800;
    const isFast = flickSpeed === 'fast';
    emit('interaction', { flickSpeed, coinCount, isFast }, 'card_flick');

    const startTime = Date.now();
    const animateCard = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flickDuration, 1);
      const eased = isFast ? progress : Math.pow(progress, 0.5);
      setCardPosition(eased * 200);

      if (progress < 1) {
        requestAnimationFrame(animateCard);
      } else {
        if (isFast) {
          setCoinFalling(true);
          setTimeout(() => {
            setCoinInCup(true);
            setCoinFalling(false);
            setShowResult(true);
            setExperimentCount(prev => prev + 1);
            emit('visual_state_update', { coinInCup: true, flickSpeed: 'fast', coinCount, success: true });
          }, 300);
        } else {
          setCoinWithCard(true);
          setShowResult(true);
          setExperimentCount(prev => prev + 1);
          emit('visual_state_update', { coinWithCard: true, flickSpeed: 'slow', coinCount, success: false });
        }
        setIsFlicking(false);
      }
    };
    requestAnimationFrame(animateCard);
  }, [isFlicking, flickSpeed, coinCount, emit]);

  const resetExperiment = useCallback(() => {
    setCardPosition(0);
    setCoinFalling(false);
    setCoinInCup(false);
    setCoinWithCard(false);
    setShowResult(false);
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
    const centerX = width / 2;
    const tableY = height * 0.55;
    const cupX = centerX;
    const cupY = tableY - 20;
    const cardY = cupY - 60;
    const actualCardX = centerX - 60 + cardPosition;
    const coinX = coinWithCard ? actualCardX + 60 : centerX;

    const renderCoins = (x: number, y: number, count: number) => {
      const coins = [];
      for (let i = 0; i < count; i++) {
        const yOffset = i * -8;
        coins.push(
          <g key={i} transform={`translate(0, ${yOffset})`}>
            <ellipse cx={x} cy={y + 3} rx={22} ry={7} fill={design.colors.coinEdge} />
            <ellipse cx={x} cy={y} rx={22} ry={7} fill={`url(#coinGrad)`} stroke={design.colors.coinEdge} strokeWidth={1} />
            <ellipse cx={x - 7} cy={y - 2} rx={6} ry={2} fill="rgba(255,255,255,0.5)" />
          </g>
        );
      }
      return <g>{coins}</g>;
    };

    return (
      <svg width={width} height={height * 0.5} viewBox={`0 0 ${width} ${height * 0.5}`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id="coinGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="70%" stopColor={design.colors.coin} />
            <stop offset="100%" stopColor="#eab308" />
          </radialGradient>
          <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor={design.colors.cup} />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect width={width} height={height * 0.5} fill={design.colors.bgPrimary} />
        <rect x={0} y={tableY - 10} width={width} height={height * 0.5 - tableY + 10} fill="#57534e" />
        <rect x={0} y={tableY - 10} width={width} height={4} fill="#78716c" />

        {/* Cup */}
        <g filter="url(#glow)">
          <path d={`M${cupX - 32} ${cupY - 45} Q${cupX - 36} ${cupY + 25} ${cupX - 26} ${cupY + 35} L${cupX + 26} ${cupY + 35} Q${cupX + 36} ${cupY + 25} ${cupX + 32} ${cupY - 45} Z`} fill="url(#cupGrad)" />
          <ellipse cx={cupX} cy={cupY - 45} rx={32} ry={9} fill={design.colors.cupInner} />
          <ellipse cx={cupX} cy={cupY - 45} rx={32} ry={9} fill="none" stroke="#a5b4fc" strokeWidth={2} />
        </g>

        {coinInCup && renderCoins(cupX, cupY - 25, coinCount)}

        {cardPosition < 200 && !coinInCup && (
          <g>
            <rect x={actualCardX} y={cardY - 4} width={120} height={12} rx={2} fill={design.colors.card} stroke="#b91c1c" strokeWidth={1} />
            <text x={actualCardX + 15} y={cardY + 5} fontSize="8" fill="white">♠</text>
            <text x={actualCardX + 60} y={cardY + 5} fontSize="8" fill="white">♥</text>
            <text x={actualCardX + 105} y={cardY + 5} fontSize="8" fill="white">♣</text>
          </g>
        )}

        {!coinInCup && !coinWithCard && (
          <g style={{ transform: coinFalling ? 'translateY(50px)' : 'none', transition: coinFalling ? 'transform 0.3s ease-in' : 'none' }}>
            {renderCoins(coinX, cardY - 10 - (coinCount - 1) * 4, coinCount)}
          </g>
        )}

        {coinWithCard && (
          <g>
            <rect x={actualCardX} y={cardY - 4} width={120} height={12} rx={2} fill={design.colors.card} opacity={0.6} />
            {renderCoins(coinX, cardY - 10, coinCount)}
          </g>
        )}

        {showResult && (
          <g>
            <rect x={width/2 - 90} y={height * 0.5 - 45} width={180} height={36} rx={8} fill={coinInCup ? design.colors.success : design.colors.danger} />
            <text x={width/2} y={height * 0.5 - 22} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily={design.font.sans}>
              {coinInCup ? "✓ Coin fell into cup!" : "✗ Coin went with card!"}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ==================== PHASE RENDERERS ====================
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, ${design.colors.bgSecondary} 100%)` }}>
      <div style={{ fontSize: '72px', marginBottom: '24px', filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.3))' }}>🪙</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans, textAlign: 'center' }}>
        The Coin-Card-Cup Trick
      </h1>
      <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: '32px', fontFamily: design.font.sans, textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
        A coin sits on a card balanced over a cup. What happens when you flick the card really fast?
      </p>
      <div style={{ background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.lg, padding: '20px 28px', marginBottom: '32px', maxWidth: '340px' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, lineHeight: 1.5 }}>
          "Where does the coin go?"
        </p>
      </div>
      <Button onClick={() => goToPhase('predict')}>Let's Find Out →</Button>
      <p style={{ fontSize: '13px', color: design.colors.textTertiary, marginTop: '24px', fontFamily: design.font.sans }}>
        Newton's First Law • Inertia
      </p>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans }}>Make Your Prediction</h2>
      <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans, textAlign: 'center' }}>
        When I flick the card fast, the coin will...
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
        {[
          { id: 'with_card', label: 'Fly away with the card', icon: '🃏' },
          { id: 'drop_cup', label: 'Drop straight into the cup', icon: '🥛' },
          { id: 'flip', label: 'Flip and land on the table', icon: '🔄' }
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
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['slow', 'fast'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => { setFlickSpeed(speed); emit('interaction', { speed }, 'speed_change'); }}
              disabled={isFlicking}
              style={{
                padding: '10px 20px',
                borderRadius: design.radius.md,
                border: 'none',
                background: flickSpeed === speed ? (speed === 'fast' ? design.colors.success : design.colors.primary) : design.colors.bgTertiary,
                color: flickSpeed === speed ? '#fff' : design.colors.textSecondary,
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: design.font.sans,
                cursor: isFlicking ? 'not-allowed' : 'pointer',
                opacity: isFlicking ? 0.5 : 1,
              }}
            >
              {speed === 'slow' ? '🐢 Slow Pull' : '⚡ Fast Flick'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={performFlick} disabled={isFlicking}>{isFlicking ? 'Flicking...' : '🖐️ Flick Card!'}</Button>
          {showResult && <Button onClick={resetExperiment} variant="secondary">🔄 Reset</Button>}
        </div>
        <p style={{ fontSize: '13px', color: design.colors.textTertiary, fontFamily: design.font.sans }}>
          Experiments: {experimentCount} • Try both speeds!
        </p>
        {experimentCount >= 2 && (
          <Button onClick={() => goToPhase('review')}>I understand! Continue →</Button>
        )}
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary, overflowY: 'auto' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px', fontFamily: design.font.sans }}>The Science of Inertia</h2>
      <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, marginBottom: '8px' }}>Newton's First Law:</p>
        <p style={{ fontSize: '15px', color: design.colors.textPrimary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.5 }}>
          "Objects at rest stay at rest unless acted upon by a force"
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '340px', width: '100%', marginBottom: '20px' }}>
        <div style={{ background: design.colors.successMuted, border: `1px solid ${design.colors.success}40`, borderRadius: design.radius.md, padding: '16px', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.success, fontFamily: design.font.sans, marginBottom: '4px' }}>Fast Flick:</p>
            <p style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.4 }}>Card removed before friction can accelerate the coin. Inertia keeps coin in place → falls into cup!</p>
          </div>
        </div>
        <div style={{ background: design.colors.dangerMuted, border: `1px solid ${design.colors.danger}40`, borderRadius: design.radius.md, padding: '16px', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🐢</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.danger, fontFamily: design.font.sans, marginBottom: '4px' }}>Slow Pull:</p>
            <p style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.4 }}>Friction has time to act on coin, gradually accelerating it. Coin moves with card!</p>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '14px', color: prediction === 'drop_cup' ? design.colors.success : design.colors.textSecondary, fontFamily: design.font.sans, marginBottom: '20px' }}>
        Your prediction: {prediction === 'drop_cup' ? '✅ Correct!' : '🤔 Now you know!'}
      </p>
      <Button onClick={() => goToPhase('twist_predict')}>Let's Make it Harder! →</Button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪙🪙🪙</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans }}>Plot Twist: Stack 'Em Up!</h2>
      <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans, textAlign: 'center' }}>
        What if we stack 3 coins instead of 1?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
        {[
          { id: 'harder', label: "Harder to make them drop - they're heavier" },
          { id: 'easier', label: "Easier - more mass, more inertia!" },
          { id: 'same', label: "Same result - doesn't matter" }
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
          <Button onClick={() => { setCoinCount(3); goToPhase('twist_play'); }}>Stack & Test! →</Button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: design.colors.bgSecondary }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans }}>Coins:</span>
          {[1, 2, 3, 5].map((count) => (
            <button
              key={count}
              onClick={() => { setCoinCount(count); resetExperiment(); emit('interaction', { coinCount: count }, 'coin_stack'); }}
              disabled={isFlicking}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: design.radius.full,
                border: 'none',
                background: coinCount === count ? design.colors.primary : design.colors.bgTertiary,
                color: coinCount === count ? '#000' : design.colors.textSecondary,
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: design.font.sans,
                cursor: isFlicking ? 'not-allowed' : 'pointer',
              }}
            >
              {count}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['slow', 'fast'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => setFlickSpeed(speed)}
              disabled={isFlicking}
              style={{
                padding: '10px 20px',
                borderRadius: design.radius.md,
                border: 'none',
                background: flickSpeed === speed ? (speed === 'fast' ? design.colors.success : design.colors.primary) : design.colors.bgTertiary,
                color: flickSpeed === speed ? '#fff' : design.colors.textSecondary,
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: design.font.sans,
                cursor: isFlicking ? 'not-allowed' : 'pointer',
                opacity: isFlicking ? 0.5 : 1,
              }}
            >
              {speed === 'slow' ? '🐢 Slow' : '⚡ Fast'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={performFlick} disabled={isFlicking}>{isFlicking ? '...' : '🖐️ Flick!'}</Button>
          {showResult && <Button onClick={resetExperiment} variant="secondary">🔄 Reset</Button>}
        </div>
        {experimentCount >= 3 && (
          <Button onClick={() => goToPhase('twist_review')}>I get it! Continue →</Button>
        )}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', height: '100%', background: design.colors.bgPrimary }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px', fontFamily: design.font.sans }}>Mass & Inertia</h2>
      <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '18px', color: design.colors.primary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, marginBottom: '8px' }}>More mass = More inertia!</p>
        <p style={{ fontSize: '14px', color: design.colors.textPrimary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.5 }}>
          The stack of coins has more mass, so it has MORE inertia and resists motion even more strongly!
        </p>
      </div>
      <div style={{ background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40`, borderRadius: design.radius.lg, padding: '20px', marginBottom: '20px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontSize: '20px', color: design.colors.primary, fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, marginBottom: '8px' }}>F = ma</p>
        <p style={{ fontSize: '13px', color: design.colors.textSecondary, fontFamily: design.font.sans, textAlign: 'center' }}>
          More mass (m) means you need more force (F) to create the same acceleration (a).
        </p>
      </div>
      <p style={{ fontSize: '14px', color: twistPrediction === 'easier' ? design.colors.success : design.colors.textSecondary, fontFamily: design.font.sans, marginBottom: '20px' }}>
        Your prediction: {twistPrediction === 'easier' ? '✅ Correct!' : '🤔 Interesting thinking!'}
      </p>
      <Button onClick={() => goToPhase('transfer')}>See Real Examples →</Button>
    </div>
  );

  const renderTransfer = () => {
    const app = applications[currentApplication];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', background: design.colors.bgPrimary }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '20px', fontFamily: design.font.sans, textAlign: 'center' }}>
          Inertia in the Real World
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
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '8px', fontFamily: design.font.sans }}>Inertia Master!</h2>
        <div style={{ fontSize: '56px', fontWeight: 700, color: design.colors.success, marginBottom: '8px', fontFamily: design.font.sans }}>{percentage}%</div>
        <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '24px', fontFamily: design.font.sans }}>{correctAnswers}/{testQuestions.length} correct answers</p>
        <div style={{ background: design.colors.bgSecondary, borderRadius: design.radius.lg, padding: '20px', marginBottom: '24px', maxWidth: '320px', width: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: design.colors.primary, fontFamily: design.font.sans, marginBottom: '12px', textAlign: 'center' }}>Key Takeaways:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {['Inertia = resistance to changes in motion', 'Fast actions beat friction', 'More mass = more inertia', "Newton's First Law explains it all!"].map((item, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: design.colors.textPrimary, fontFamily: design.font.sans, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: design.colors.success }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <Button onClick={() => {
          setPhase('hook');
          setExperimentCount(0);
          setCurrentQuestion(0);
          setCorrectAnswers(0);
          setAnsweredQuestions(new Set());
          setPrediction(null);
          setTwistPrediction(null);
          setCoinCount(1);
        }}>
          Play Again 🔄
        </Button>
        <style>{`
          @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }
        `}</style>
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px', animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`, pointerEvents: 'none', fontSize: '20px' }}>
            {['🪙', '⭐', '🎉', '✨'][Math.floor(Math.random() * 4)]}
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

export default InertiaRenderer;
