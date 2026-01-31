import React, { useState, useEffect, useCallback, useRef } from 'react';

interface RollingRaceRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solidCylinder: '#3b82f6',
  hollowHoop: '#ef4444',
  ramp: '#64748b',
  energy: '#fbbf24',
};

const RollingRaceRenderer: React.FC<RollingRaceRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [rampAngle, setRampAngle] = useState(30);
  const [objectMass, setObjectMass] = useState(1);
  const [isRacing, setIsRacing] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [solidPosition, setSolidPosition] = useState(0);
  const [hollowPosition, setHollowPosition] = useState(0);
  const [solidRotation, setSolidRotation] = useState(0);
  const [hollowRotation, setHollowRotation] = useState(0);
  const [raceFinished, setRaceFinished] = useState(false);
  const [winner, setWinner] = useState<'solid' | 'hollow' | null>(null);

  // Twist state - coins inside
  const [coinsAdded, setCoinsAdded] = useState(false);
  const [coinCount, setCoinCount] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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

  // Physics constants
  const g = 9.81;
  const rampLength = 1.0; // meters (normalized)
  const objectRadius = 0.05; // meters

  // Calculate accelerations based on moment of inertia
  // a = g * sin(theta) / (1 + I/(MR^2))
  // Solid cylinder: I = 0.5*M*R^2, so a = g*sin(theta) / 1.5
  // Hollow cylinder: I = M*R^2, so a = g*sin(theta) / 2
  const getSolidAcceleration = useCallback(() => {
    const theta = (rampAngle * Math.PI) / 180;
    return (g * Math.sin(theta)) / 1.5;
  }, [rampAngle]);

  const getHollowAcceleration = useCallback(() => {
    const theta = (rampAngle * Math.PI) / 180;
    // With coins, the moment of inertia changes
    if (coinsAdded && coinCount > 0) {
      // Coins at center reduce effective I/MR^2 ratio
      // More coins = closer to solid cylinder behavior
      const effectiveRatio = 2 - (coinCount / 10) * 0.5; // Goes from 2 to 1.5
      return (g * Math.sin(theta)) / effectiveRatio;
    }
    return (g * Math.sin(theta)) / 2;
  }, [rampAngle, coinsAdded, coinCount]);

  // Animation loop
  useEffect(() => {
    if (!isRacing) return;

    const solidAcc = getSolidAcceleration();
    const hollowAcc = getHollowAcceleration();

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000; // seconds
      setRaceTime(elapsed);

      // Position from s = 0.5 * a * t^2
      const newSolidPos = Math.min(0.5 * solidAcc * elapsed * elapsed / rampLength, 1);
      const newHollowPos = Math.min(0.5 * hollowAcc * elapsed * elapsed / rampLength, 1);

      setSolidPosition(newSolidPos);
      setHollowPosition(newHollowPos);

      // Rotation (v = a*t, omega = v/R)
      const solidVel = solidAcc * elapsed;
      const hollowVel = hollowAcc * elapsed;
      setSolidRotation((solidVel * elapsed / objectRadius) * (180 / Math.PI));
      setHollowRotation((hollowVel * elapsed / objectRadius) * (180 / Math.PI));

      // Check if race finished
      if (newSolidPos >= 1 || newHollowPos >= 1) {
        setRaceFinished(true);
        setIsRacing(false);
        if (newSolidPos >= 1 && newHollowPos < 1) {
          setWinner('solid');
        } else if (newHollowPos >= 1 && newSolidPos < 1) {
          setWinner('hollow');
        } else {
          setWinner(newSolidPos >= newHollowPos ? 'solid' : 'hollow');
        }
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRacing, getSolidAcceleration, getHollowAcceleration]);

  const startRace = () => {
    setSolidPosition(0);
    setHollowPosition(0);
    setSolidRotation(0);
    setHollowRotation(0);
    setRaceTime(0);
    setRaceFinished(false);
    setWinner(null);
    startTimeRef.current = 0;
    setIsRacing(true);
  };

  const resetRace = () => {
    setIsRacing(false);
    setSolidPosition(0);
    setHollowPosition(0);
    setSolidRotation(0);
    setHollowRotation(0);
    setRaceTime(0);
    setRaceFinished(false);
    setWinner(null);
    startTimeRef.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const predictions = [
    { id: 'solid', label: 'The solid cylinder wins - it is heavier in the middle' },
    { id: 'hollow', label: 'The hollow hoop wins - it can spin faster' },
    { id: 'tie', label: 'They tie - mass does not affect rolling speed' },
    { id: 'depends', label: 'It depends on which one is heavier' },
  ];

  const twistPredictions = [
    { id: 'faster', label: 'The hoop rolls faster - more mass means more speed' },
    { id: 'slower', label: 'The hoop rolls slower - extra mass adds resistance' },
    { id: 'same', label: 'No change - mass does not matter for rolling' },
    { id: 'depends_location', label: 'It depends on where the coins are placed' },
  ];

  const transferApplications = [
    {
      title: 'Wheels in Cars',
      description: 'Lightweight alloy wheels with mass near the hub improve acceleration and braking compared to heavy steel wheels with mass at the rim.',
      question: 'Why do performance cars use lightweight wheels with mass concentrated near the center?',
      answer: 'Wheels with less mass at the rim have lower moment of inertia, requiring less energy to accelerate. This means faster acceleration, better braking, and improved fuel efficiency.',
    },
    {
      title: 'Yo-Yo Design',
      description: 'Professional yo-yos have mass concentrated in metal rims, while beginner yo-yos have more uniform mass distribution.',
      question: 'Why do professional yo-yos have heavy metal rims?',
      answer: 'Heavy rims increase moment of inertia, making the yo-yo spin longer (more angular momentum). But this also makes it harder to change spin speed, requiring more skill to control.',
    },
    {
      title: 'Flywheels for Energy Storage',
      description: 'Modern flywheels use high-density rims to store maximum rotational kinetic energy in the smallest package.',
      question: 'Why are flywheel rims made as heavy as possible?',
      answer: 'Rotational kinetic energy is (1/2)Iw^2. Rim-weighted flywheels have higher I, storing more energy at the same rotation speed. This is the opposite of what you want for quick acceleration!',
    },
    {
      title: 'Figure Skating Spins',
      description: 'Skaters speed up dramatically when they pull their arms in during a spin, going from slow to extremely fast rotation.',
      question: 'How does pulling arms in make a skater spin faster?',
      answer: 'Angular momentum (L = Iw) is conserved. When arms are pulled in, I decreases, so w must increase to keep L constant. This is the same physics as mass distribution in rolling objects!',
    },
  ];

  const testQuestions = [
    {
      question: 'Which object wins a race down a ramp: solid cylinder or hollow hoop of the same mass and radius?',
      options: [
        { text: 'The hollow hoop - it has more surface area', correct: false },
        { text: 'The solid cylinder - less rotational inertia means faster rolling', correct: true },
        { text: 'They tie - mass cancels out in the equations', correct: false },
        { text: 'The heavier one wins regardless of shape', correct: false },
      ],
    },
    {
      question: 'For a solid cylinder rolling without slipping, what fraction of its kinetic energy is rotational?',
      options: [
        { text: 'All of it (100%)', correct: false },
        { text: 'Half of it (50%)', correct: false },
        { text: 'One-third (33%)', correct: true },
        { text: 'None - all energy is translational', correct: false },
      ],
    },
    {
      question: 'For a hollow hoop rolling without slipping, what fraction of its kinetic energy is rotational?',
      options: [
        { text: 'One-quarter (25%)', correct: false },
        { text: 'One-third (33%)', correct: false },
        { text: 'One-half (50%)', correct: true },
        { text: 'Two-thirds (67%)', correct: false },
      ],
    },
    {
      question: 'What is the moment of inertia of a solid cylinder about its central axis?',
      options: [
        { text: 'I = MR^2', correct: false },
        { text: 'I = (1/2)MR^2', correct: true },
        { text: 'I = (2/5)MR^2', correct: false },
        { text: 'I = 2MR^2', correct: false },
      ],
    },
    {
      question: 'Adding mass to the center of a hollow cylinder will:',
      options: [
        { text: 'Make it roll slower - more mass means more inertia', correct: false },
        { text: 'Make it roll faster - reduces I/(MR^2) ratio', correct: true },
        { text: 'Have no effect on rolling speed', correct: false },
        { text: 'Make it slide instead of roll', correct: false },
      ],
    },
    {
      question: 'Why does a hollow sphere roll slower than a solid sphere of the same mass?',
      options: [
        { text: 'More mass is far from the axis, increasing I', correct: true },
        { text: 'Hollow objects have more friction', correct: false },
        { text: 'Air resistance is greater for hollow objects', correct: false },
        { text: 'The hollow sphere has less contact with the ramp', correct: false },
      ],
    },
    {
      question: 'The ratio of speeds v_solid/v_hollow at the bottom of a ramp is approximately:',
      options: [
        { text: '1.0 (they are equal)', correct: false },
        { text: '1.15 (solid is about 15% faster)', correct: true },
        { text: '2.0 (solid is twice as fast)', correct: false },
        { text: '0.87 (hollow is faster)', correct: false },
      ],
    },
    {
      question: 'If you increase the ramp angle, how does the race outcome change?',
      options: [
        { text: 'The solid wins by a larger margin', correct: false },
        { text: 'The hollow catches up', correct: false },
        { text: 'The winner stays the same, but both finish faster', correct: true },
        { text: 'The race becomes a tie at steep angles', correct: false },
      ],
    },
    {
      question: 'A flywheel designed for maximum energy storage should have:',
      options: [
        { text: 'Mass concentrated near the center', correct: false },
        { text: 'Mass concentrated at the rim', correct: true },
        { text: 'Uniform mass distribution', correct: false },
        { text: 'The lightest possible mass', correct: false },
      ],
    },
    {
      question: 'When a figure skater pulls their arms in during a spin:',
      options: [
        { text: 'Angular momentum increases, so they spin faster', correct: false },
        { text: 'Moment of inertia decreases, so angular velocity increases', correct: true },
        { text: 'Rotational kinetic energy stays constant', correct: false },
        { text: 'They slow down due to reduced air resistance', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Calculate energy distributions for visualization
  const getSolidEnergySplit = () => {
    // For solid cylinder: KE_rot/KE_total = (1/3)
    return { rotational: 1/3, translational: 2/3 };
  };

  const getHollowEnergySplit = () => {
    // For hollow hoop: KE_rot/KE_total = (1/2)
    if (coinsAdded && coinCount > 0) {
      const rotFraction = 0.5 - (coinCount / 10) * (0.5 - 1/3);
      return { rotational: rotFraction, translational: 1 - rotFraction };
    }
    return { rotational: 0.5, translational: 0.5 };
  };

  const renderVisualization = (interactive: boolean, showTwist: boolean = false) => {
    const width = 400;
    const height = 300;
    const rampStartX = 50;
    const rampStartY = 50;
    const rampEndX = 350;
    const rampEndY = 250;
    const rampLengthPx = Math.sqrt(Math.pow(rampEndX - rampStartX, 2) + Math.pow(rampEndY - rampStartY, 2));

    // Calculate actual ramp based on angle
    const theta = (rampAngle * Math.PI) / 180;
    const actualRampEndY = rampStartY + (rampEndX - rampStartX) * Math.tan(theta);
    const clampedRampEndY = Math.min(actualRampEndY, 270);

    // Object positions along ramp
    const solidX = rampStartX + solidPosition * (rampEndX - rampStartX);
    const solidY = rampStartY + solidPosition * (clampedRampEndY - rampStartY);
    const hollowX = rampStartX + hollowPosition * (rampEndX - rampStartX);
    const hollowY = rampStartY + hollowPosition * (clampedRampEndY - rampStartY) + 35;

    const objectRadiusPx = 15;

    const solidEnergy = getSolidEnergySplit();
    const hollowEnergy = getHollowEnergySplit();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Ramp */}
          <polygon
            points={`${rampStartX},${rampStartY} ${rampEndX},${clampedRampEndY} ${rampEndX},${clampedRampEndY + 10} ${rampStartX},${rampStartY + 10}`}
            fill={colors.ramp}
            stroke={colors.textMuted}
            strokeWidth={1}
          />

          {/* Ramp surface lines for texture */}
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <line
              key={i}
              x1={rampStartX + t * (rampEndX - rampStartX)}
              y1={rampStartY + t * (clampedRampEndY - rampStartY)}
              x2={rampStartX + t * (rampEndX - rampStartX)}
              y2={rampStartY + t * (clampedRampEndY - rampStartY) + 10}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
          ))}

          {/* Ground line */}
          <line
            x1={rampEndX - 10}
            y1={clampedRampEndY + 5}
            x2={width - 10}
            y2={clampedRampEndY + 5}
            stroke={colors.ramp}
            strokeWidth={3}
          />

          {/* Solid Cylinder (top track) */}
          <g transform={`translate(${solidX}, ${solidY - objectRadiusPx - 5})`}>
            <circle
              cx={0}
              cy={0}
              r={objectRadiusPx}
              fill={colors.solidCylinder}
              stroke={colors.textPrimary}
              strokeWidth={2}
            />
            {/* Rotation indicator */}
            <line
              x1={0}
              y1={0}
              x2={objectRadiusPx * Math.cos(solidRotation * Math.PI / 180)}
              y2={objectRadiusPx * Math.sin(solidRotation * Math.PI / 180)}
              stroke={colors.textPrimary}
              strokeWidth={2}
            />
            {/* Fill pattern to show solid */}
            <circle cx={0} cy={0} r={objectRadiusPx * 0.7} fill={colors.solidCylinder} opacity={0.7} />
            <circle cx={0} cy={0} r={objectRadiusPx * 0.4} fill={colors.solidCylinder} opacity={0.5} />
          </g>

          {/* Hollow Hoop (bottom track) */}
          <g transform={`translate(${hollowX}, ${hollowY - objectRadiusPx - 5})`}>
            <circle
              cx={0}
              cy={0}
              r={objectRadiusPx}
              fill="transparent"
              stroke={colors.hollowHoop}
              strokeWidth={4}
            />
            {/* Rotation indicator */}
            <line
              x1={0}
              y1={0}
              x2={objectRadiusPx * Math.cos(hollowRotation * Math.PI / 180)}
              y2={objectRadiusPx * Math.sin(hollowRotation * Math.PI / 180)}
              stroke={colors.hollowHoop}
              strokeWidth={2}
            />
            {/* Coins inside (if twist) */}
            {showTwist && coinsAdded && coinCount > 0 && (
              <>
                {Array.from({ length: Math.min(coinCount, 5) }).map((_, i) => (
                  <circle
                    key={i}
                    cx={(i - 2) * 4}
                    cy={0}
                    r={3}
                    fill={colors.energy}
                    stroke={colors.textPrimary}
                    strokeWidth={0.5}
                  />
                ))}
                {coinCount > 5 && (
                  <text x={0} y={-5} fill={colors.energy} fontSize={8} textAnchor="middle">+{coinCount - 5}</text>
                )}
              </>
            )}
          </g>

          {/* Labels */}
          <text x={rampStartX} y={25} fill={colors.solidCylinder} fontSize={12} fontWeight="bold">
            Solid Cylinder
          </text>
          <text x={rampStartX} y={rampStartY + 55} fill={colors.hollowHoop} fontSize={12} fontWeight="bold">
            Hollow Hoop
          </text>

          {/* Angle indicator */}
          <text x={rampEndX - 40} y={clampedRampEndY + 25} fill={colors.textMuted} fontSize={11}>
            {rampAngle}deg
          </text>

          {/* Winner indicator */}
          {raceFinished && winner && (
            <text
              x={width / 2}
              y={height - 20}
              fill={winner === 'solid' ? colors.solidCylinder : colors.hollowHoop}
              fontSize={16}
              fontWeight="bold"
              textAnchor="middle"
            >
              {winner === 'solid' ? 'Solid Cylinder Wins!' : 'Hollow Hoop Wins!'}
            </text>
          )}

          {/* Time display */}
          {isRacing && (
            <text x={width - 60} y={25} fill={colors.textSecondary} fontSize={12}>
              Time: {raceTime.toFixed(2)}s
            </text>
          )}
        </svg>

        {/* Energy Bars */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '500px', padding: '0 16px' }}>
          {/* Solid Energy Bar */}
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.solidCylinder, fontSize: '11px', marginBottom: '4px' }}>Solid Cylinder Energy</div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${colors.textMuted}` }}>
              <div style={{ width: `${solidEnergy.translational * 100}%`, background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: colors.bgPrimary, fontWeight: 'bold' }}>Trans</span>
              </div>
              <div style={{ width: `${solidEnergy.rotational * 100}%`, background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: colors.bgPrimary, fontWeight: 'bold' }}>Rot</span>
              </div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>
              I = (1/2)MR^2
            </div>
          </div>

          {/* Hollow Energy Bar */}
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.hollowHoop, fontSize: '11px', marginBottom: '4px' }}>Hollow Hoop Energy</div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${colors.textMuted}` }}>
              <div style={{ width: `${hollowEnergy.translational * 100}%`, background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: colors.bgPrimary, fontWeight: 'bold' }}>Trans</span>
              </div>
              <div style={{ width: `${hollowEnergy.rotational * 100}%`, background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: colors.bgPrimary, fontWeight: 'bold' }}>Rot</span>
              </div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>
              I = MR^2 {showTwist && coinsAdded && coinCount > 0 ? `(+${coinCount} coins)` : ''}
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={isRacing ? resetRace : startRace}
              disabled={raceFinished && !isRacing}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isRacing ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isRacing ? 'Stop' : 'Release!'}
            </button>
            <button
              onClick={resetRace}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Ramp Angle: {rampAngle}deg
        </label>
        <input
          type="range"
          min="10"
          max="60"
          step="5"
          value={rampAngle}
          onChange={(e) => { setRampAngle(parseInt(e.target.value)); resetRace(); }}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Mass: {objectMass.toFixed(1)} kg (same for both)
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={objectMass}
          onChange={(e) => setObjectMass(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showTwist && (
        <div>
          <label style={{ color: colors.warning, display: 'block', marginBottom: '8px' }}>
            Coins in Hoop Center: {coinCount}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={coinCount}
            onChange={(e) => { setCoinCount(parseInt(e.target.value)); setCoinsAdded(parseInt(e.target.value) > 0); resetRace(); }}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Speed ratio: v_solid/v_hollow = sqrt(4/3) = 1.15
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          The solid cylinder is always ~15% faster (same mass)
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Rolling Race
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Which wins down a ramp: a full cylinder or a hoop?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A solid cylinder and a hollow hoop have the same mass and radius.
                Release them together at the top of a ramp. Which one reaches
                the bottom first?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer reveals a fundamental truth about rotational energy!
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Release!" to start the race and watch the energy bars!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction ->')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two objects at the top of a ramp: a solid cylinder (blue, filled in) and a hollow
              hoop (red, just a ring). They have identical mass and radius. The energy bars
              show how energy is split between translation (forward motion) and rotation (spinning).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When released together, which object wins the race?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction ->')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Race the Rollers!</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the ramp angle and watch where the energy goes
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Change the ramp angle - does the winner change?</li>
              <li>Watch the energy bars - which object spins more?</li>
              <li>Try different masses - does mass affect the race?</li>
              <li>Notice: hoop uses 50% for rotation, cylinder only 33%</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review ->')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'solid';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The solid cylinder wins! It has less rotational inertia, so less energy goes into spinning.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Rolling</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Moment of Inertia:</strong> The solid cylinder
                has I = (1/2)MR^2, while the hollow hoop has I = MR^2. The hoop's mass is farther from
                the rotation axis, making it harder to spin.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Split:</strong> When rolling without
                slipping, energy must go into both translation AND rotation. The hoop "wastes" 50%
                on spinning, while the cylinder only uses 33%.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Speed Ratio:</strong> At the bottom,
                v_solid/v_hoop = sqrt(4/3) = 1.15. The solid is always 15% faster, regardless of
                mass, radius, or ramp angle!
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.solidCylinder}`,
          }}>
            <h4 style={{ color: colors.solidCylinder, marginBottom: '8px' }}>Key Equations:</h4>
            <div style={{ color: colors.textSecondary, fontSize: '13px', fontFamily: 'monospace' }}>
              <p>Solid: I = (1/2)MR^2, KE_rot = (1/3)KE_total</p>
              <p>Hoop: I = MR^2, KE_rot = (1/2)KE_total</p>
              <p>v = sqrt(2gh / (1 + I/MR^2))</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! ->')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we add coins inside the hollow hoop?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine taping coins to the inside center of the hollow hoop (like putting
              weights in a can). The total mass increases, but now some mass is at the
              center instead of the rim.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How will adding coins to the hoop's center affect its speed?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction ->')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test with Coins!</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Add coins to the hoop and see how its speed changes
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the energy bar change as you add coins! More coins at the center
              means more mass closer to the axis, reducing the effective I/MR^2 ratio.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation ->')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'depends_location';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Location matters! Coins at the center make the hoop roll faster, approaching solid cylinder behavior.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Mass Distribution is Key</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Center Mass:</strong> Adding mass at the
                center doesn't increase I much (since I depends on r^2, and r=0 at center). But it
                increases total M, reducing the I/(MR^2) ratio.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Rim Mass:</strong> If we added coins to
                the rim instead, I would increase proportionally with M, and the rolling speed
                wouldn't change much.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Lesson:</strong> It's not total mass
                that matters for rolling - it's how that mass is distributed relative to the rotation
                axis!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge ->')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Rotational inertia affects everything that spins
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test ->')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered rolling motion and rotational inertia!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery ->' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered rolling motion and rotational inertia</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Moment of inertia depends on mass distribution</li>
              <li>Rolling objects split energy between translation and rotation</li>
              <li>Solid cylinders beat hollow hoops by ~15%</li>
              <li>Adding mass at the center reduces effective I/MR^2</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This principle extends to spheres (solid sphere beats hollow sphere),
              explains why car wheels are designed with mass near the hub, and connects
              to conservation of angular momentum in figure skating and diving!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game ->')}
      </div>
    );
  }

  return null;
};

export default RollingRaceRenderer;
