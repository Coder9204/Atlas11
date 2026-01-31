import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PassivationRecombinationRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Compare',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  electron: '#60a5fa',
  hole: '#f472b6',
  defect: '#ef4444',
};

const PassivationRecombinationRenderer: React.FC<PassivationRecombinationRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

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

  // Simulation state
  const [surfaceRecombVelocity, setSurfaceRecombVelocity] = useState(1000); // cm/s
  const [passivationType, setPassivationType] = useState<'none' | 'PERC' | 'TOPCon' | 'HJT'>('none');
  const [carrierLifetime, setCarrierLifetime] = useState(100); // microseconds
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [particles, setParticles] = useState<{x: number; y: number; type: 'electron' | 'hole'; alive: boolean; id: number}[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Passivation presets
  const passivationPresets: Record<string, { srv: number; lifetime: number; name: string; voc: number }> = {
    none: { srv: 10000, lifetime: 50, name: 'No Passivation', voc: 0.55 },
    PERC: { srv: 100, lifetime: 200, name: 'PERC (Al2O3)', voc: 0.68 },
    TOPCon: { srv: 10, lifetime: 500, name: 'TOPCon (poly-Si)', voc: 0.72 },
    HJT: { srv: 2, lifetime: 2000, name: 'HJT (a-Si:H)', voc: 0.74 },
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const preset = passivationPresets[passivationType];
    const effectiveSRV = passivationType === 'none' ? surfaceRecombVelocity : preset.srv;
    const effectiveLifetime = passivationType === 'none' ? carrierLifetime : preset.lifetime;

    // Voc depends logarithmically on carrier lifetime
    // Voc = kT/q * ln(IL/I0) where I0 depends on recombination
    const baseVoc = 0.5;
    const lifetimeFactor = Math.log10(effectiveLifetime / 10) * 0.1;
    const srvFactor = Math.log10(10000 / effectiveSRV) * 0.05;
    const voc = Math.min(0.76, baseVoc + lifetimeFactor + srvFactor);

    // Efficiency scales with Voc and collection efficiency
    const collectionEff = Math.exp(-effectiveSRV / 5000);
    const efficiency = Math.min(26, 15 * (voc / 0.6) * collectionEff);

    // Recombination rate (carriers lost per second)
    const recombRate = 1 / effectiveLifetime + effectiveSRV / 100;

    // Survival probability
    const survivalProb = Math.exp(-recombRate * 0.01);

    return {
      voc: voc,
      efficiency: efficiency,
      recombRate: recombRate,
      survivalProb: survivalProb * 100,
      effectiveSRV: effectiveSRV,
      effectiveLifetime: effectiveLifetime,
    };
  }, [surfaceRecombVelocity, passivationType, carrierLifetime]);

  // Particle animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);

      // Generate new particles
      if (Math.random() > 0.7) {
        const newParticle = {
          x: 100 + Math.random() * 200,
          y: 80 + Math.random() * 100,
          type: Math.random() > 0.5 ? 'electron' : 'hole' as 'electron' | 'hole',
          alive: true,
          id: Date.now() + Math.random(),
        };
        setParticles(prev => [...prev.slice(-20), newParticle]);
      }

      // Update particles
      setParticles(prev => prev.map(p => {
        if (!p.alive) return p;

        // Move toward surface
        const newY = p.y + (Math.random() - 0.3) * 5;

        // Check for surface recombination
        const output = calculateAbsorption();
        if (newY > 180 || newY < 50) {
          const recombProb = output.effectiveSRV / 10000;
          if (Math.random() < recombProb) {
            return { ...p, alive: false };
          }
        }

        return { ...p, y: Math.max(50, Math.min(190, newY)), x: p.x + (Math.random() - 0.5) * 3 };
      }).filter(p => p.alive || Math.random() > 0.1));
    }, 100);

    return () => clearInterval(interval);

    function calculateAbsorption() {
      const preset = passivationPresets[passivationType];
      return {
        effectiveSRV: passivationType === 'none' ? surfaceRecombVelocity : preset.srv,
      };
    }
  }, [isAnimating, passivationType, surfaceRecombVelocity]);

  // Apply passivation preset
  useEffect(() => {
    if (passivationType !== 'none') {
      const preset = passivationPresets[passivationType];
      setSurfaceRecombVelocity(preset.srv);
      setCarrierLifetime(preset.lifetime);
    }
  }, [passivationType]);

  const predictions = [
    { id: 'area', label: 'Carriers disappear by leaking out through the edges of the cell' },
    { id: 'bulk', label: 'Carriers disappear evenly throughout the silicon bulk' },
    { id: 'surface', label: 'Carriers disappear at surfaces where defects act as traps' },
    { id: 'contacts', label: 'Carriers only disappear when they reach the metal contacts' },
  ];

  const twistPredictions = [
    { id: 'perc_best', label: 'PERC is best - it\'s the most common technology' },
    { id: 'topcon_best', label: 'TOPCon is best - tunneling oxide provides superior passivation' },
    { id: 'hjt_best', label: 'HJT achieves lowest recombination with amorphous silicon' },
    { id: 'all_same', label: 'All passivation technologies perform equally well' },
  ];

  const transferApplications = [
    {
      title: 'PERC Solar Cells',
      description: 'Passivated Emitter Rear Cell technology uses Al2O3 to reduce rear surface recombination by 100x.',
      question: 'Why did PERC technology become the industry standard after 2015?',
      answer: 'PERC adds a simple Al2O3 passivation layer to the rear surface, reducing SRV from ~10,000 to ~100 cm/s. This boosted efficiency by 1-2% absolute with minimal additional manufacturing cost, making it the best value improvement available.',
    },
    {
      title: 'Semiconductor Transistors',
      description: 'Every modern computer chip uses oxide passivation to control current flow in billions of transistors.',
      question: 'How does passivation enable modern computing?',
      answer: 'Silicon dioxide (SiO2) passivates the silicon-gate interface in MOSFETs. Without this, surface states would cause uncontrolled leakage and prevent the precise on/off switching that digital logic requires. Moore\'s Law depends on excellent passivation!',
    },
    {
      title: 'LED Efficiency',
      description: 'High-brightness LEDs use passivation layers to prevent carriers from recombining before emitting light.',
      question: 'Why do unpassivated LEDs have low efficiency?',
      answer: 'Surface recombination competes with radiative recombination (light emission). If carriers recombine non-radiatively at surface defects, they release heat instead of light. Passivation increases the probability of light emission over heat generation.',
    },
    {
      title: 'Solar Cell Degradation',
      description: 'Light-induced degradation (LID) can reduce cell efficiency by creating new recombination centers.',
      question: 'How does passivation relate to long-term solar cell reliability?',
      answer: 'Good passivation not only reduces initial recombination but also protects against defect formation over time. HJT cells with amorphous silicon passivation show lower LID because the a-Si:H layer can "heal" some defects through hydrogen passivation.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is surface recombination velocity (SRV)?',
      options: [
        { text: 'How fast electrons move along the surface', correct: false },
        { text: 'A measure of how quickly carriers are lost at the surface', correct: true },
        { text: 'The speed of light at the surface', correct: false },
        { text: 'The velocity of phonons in silicon', correct: false },
      ],
    },
    {
      question: 'Why do unpassivated silicon surfaces have high recombination?',
      options: [
        { text: 'The surface is too hot', correct: false },
        { text: 'Dangling bonds create energy states that trap carriers', correct: true },
        { text: 'The surface reflects light away', correct: false },
        { text: 'Silicon is unstable at surfaces', correct: false },
      ],
    },
    {
      question: 'How does passivation reduce surface recombination?',
      options: [
        { text: 'By heating the surface to remove defects', correct: false },
        { text: 'By saturating dangling bonds and/or creating a field to repel carriers', correct: true },
        { text: 'By making the surface thicker', correct: false },
        { text: 'By painting the surface black', correct: false },
      ],
    },
    {
      question: 'What is the relationship between carrier lifetime and cell voltage?',
      options: [
        { text: 'No relationship exists', correct: false },
        { text: 'Longer lifetime leads to higher open-circuit voltage', correct: true },
        { text: 'Longer lifetime decreases voltage', correct: false },
        { text: 'Lifetime only affects current, not voltage', correct: false },
      ],
    },
    {
      question: 'Which passivation technology typically achieves the lowest SRV?',
      options: [
        { text: 'No passivation', correct: false },
        { text: 'PERC (Al2O3)', correct: false },
        { text: 'TOPCon (poly-Si/SiO2)', correct: false },
        { text: 'HJT (a-Si:H)', correct: true },
      ],
    },
    {
      question: 'Why can\'t you simply make silicon thicker to compensate for surface recombination?',
      options: [
        { text: 'Silicon is too expensive', correct: false },
        { text: 'Carriers generated near surfaces still recombine before collection', correct: true },
        { text: 'Thicker silicon absorbs less light', correct: false },
        { text: 'You actually can - thickness solves recombination', correct: false },
      ],
    },
    {
      question: 'What is "field-effect passivation"?',
      options: [
        { text: 'Using magnetic fields to align carriers', correct: false },
        { text: 'Creating fixed charges that repel one carrier type from the surface', correct: true },
        { text: 'Applying an external voltage during operation', correct: false },
        { text: 'Using the sun\'s electric field', correct: false },
      ],
    },
    {
      question: 'How does passivation affect solar cell efficiency?',
      options: [
        { text: 'It only affects the cell\'s color', correct: false },
        { text: 'It increases Voc and collection efficiency, boosting overall efficiency', correct: true },
        { text: 'It decreases efficiency but improves reliability', correct: false },
        { text: 'Passivation has no effect on efficiency', correct: false },
      ],
    },
    {
      question: 'Reducing SRV from 10,000 to 10 cm/s (1000x improvement) typically increases Voc by:',
      options: [
        { text: 'About 1 mV', correct: false },
        { text: 'About 50-100 mV', correct: true },
        { text: 'Over 500 mV', correct: false },
        { text: 'It has no effect on Voc', correct: false },
      ],
    },
    {
      question: 'What makes HJT cells achieve high efficiency despite using amorphous silicon?',
      options: [
        { text: 'Amorphous silicon generates more current', correct: false },
        { text: 'The a-Si:H provides excellent surface passivation with very low SRV', correct: true },
        { text: 'HJT cells are simply larger', correct: false },
        { text: 'The amorphous layer increases light absorption', correct: false },
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

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 400;
    const height = 350;
    const output = calculateOutput();

    // Generate defect positions
    const defects = [];
    const numDefects = passivationType === 'none' ? 12 : passivationType === 'PERC' ? 6 : passivationType === 'TOPCon' ? 2 : 0;
    for (let i = 0; i < numDefects; i++) {
      defects.push({
        x: 70 + i * (260 / numDefects),
        y: 185 + (Math.random() - 0.5) * 10,
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="siliconGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <radialGradient id="electronGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.electron} />
              <stop offset="100%" stopColor={colors.electron} stopOpacity="0.3" />
            </radialGradient>
            <radialGradient id="holeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.hole} />
              <stop offset="100%" stopColor={colors.hole} stopOpacity="0.3" />
            </radialGradient>
            <radialGradient id="defectGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.defect} />
              <stop offset="100%" stopColor={colors.defect} stopOpacity="0.5" />
            </radialGradient>
          </defs>

          {/* Top passivation layer */}
          {passivationType !== 'none' && (
            <rect x="50" y="45" width="300" height="10" fill={
              passivationType === 'PERC' ? '#4ade80' :
              passivationType === 'TOPCon' ? '#60a5fa' : '#a78bfa'
            } opacity={0.6} rx="2" />
          )}

          {/* Silicon wafer */}
          <rect x="50" y="55" width="300" height="140" fill="url(#siliconGrad2)" />

          {/* Bottom passivation layer */}
          {passivationType !== 'none' && (
            <rect x="50" y="195" width="300" height="10" fill={
              passivationType === 'PERC' ? '#4ade80' :
              passivationType === 'TOPCon' ? '#60a5fa' : '#a78bfa'
            } opacity={0.6} rx="2" />
          )}

          {/* Surface defects */}
          {defects.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r="6" fill="url(#defectGrad)" />
              <text x={d.x} y={d.y + 3} textAnchor="middle" fontSize="8" fill="#fff">X</text>
            </g>
          ))}

          {/* Carriers (electrons and holes) */}
          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r="5"
              fill={p.type === 'electron' ? 'url(#electronGrad)' : 'url(#holeGrad)'}
              opacity={p.alive ? 0.9 : 0.3}
            />
          ))}

          {/* Legend */}
          <g transform="translate(50, 220)">
            <circle cx="10" cy="0" r="5" fill={colors.electron} />
            <text x="20" y="4" fill={colors.textSecondary} fontSize="10">Electron</text>

            <circle cx="80" cy="0" r="5" fill={colors.hole} />
            <text x="90" y="4" fill={colors.textSecondary} fontSize="10">Hole</text>

            <circle cx="140" cy="0" r="5" fill={colors.defect} />
            <text x="150" y="4" fill={colors.textSecondary} fontSize="10">Defect (trap)</text>
          </g>

          {/* Output panel */}
          <rect x="250" y="240" width="140" height="100" fill="rgba(0,0,0,0.6)" rx="8" stroke={colors.accent} strokeWidth="1" />
          <text x="320" y="258" fill={colors.textSecondary} fontSize="10" textAnchor="middle">OUTPUT</text>

          <text x="260" y="278" fill={colors.textPrimary} fontSize="11">
            Voc: {output.voc.toFixed(3)} V
          </text>
          <text x="260" y="295" fill={colors.textPrimary} fontSize="11">
            Efficiency: {output.efficiency.toFixed(1)}%
          </text>
          <text x="260" y="312" fill={colors.textSecondary} fontSize="10">
            SRV: {output.effectiveSRV} cm/s
          </text>
          <text x="260" y="329" fill={colors.textSecondary} fontSize="10">
            Lifetime: {output.effectiveLifetime} µs
          </text>

          {/* Passivation type label */}
          <text x="200" y="25" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="bold">
            {passivationPresets[passivationType].name}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop' : 'Animate Carriers'}
            </button>
            <button
              onClick={() => { setPassivationType('none'); setSurfaceRecombVelocity(1000); setCarrierLifetime(100); setParticles([]); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
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
      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Passivation Technology
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['none', 'PERC', 'TOPCon', 'HJT'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPassivationType(type)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: passivationType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: passivationType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {passivationPresets[type].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showTwist && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Surface Recombination Velocity: {surfaceRecombVelocity} cm/s
            </label>
            <input
              type="range"
              min="1"
              max="10000"
              step="100"
              value={surfaceRecombVelocity}
              onChange={(e) => { setSurfaceRecombVelocity(parseInt(e.target.value)); setPassivationType('none'); }}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Carrier Lifetime: {carrierLifetime} µs
            </label>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={carrierLifetime}
              onChange={(e) => { setCarrierLifetime(parseInt(e.target.value)); setPassivationType('none'); }}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Lower SRV = Higher Voc = Better Efficiency
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Voc ~ (kT/q) * ln(Generation / Recombination)
        </div>
      </div>
    </div>
  );

  // Navigation function
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  const currentIdx = phaseOrder.indexOf(phase);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={currentIdx === 0}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 'bold',
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Passivation & Recombination
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Where do electrons "disappear" inside a solar cell?
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
                When light generates electron-hole pairs in silicon, not all of them reach the
                contacts to produce current. Some "disappear" along the way. But where do they go?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding recombination is key to high-efficiency solar cells!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch carriers move and see where they're lost in the simulation!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Mystery:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Light creates electron-hole pairs throughout the silicon. But only about 80% of them
              contribute to current in an unpassivated cell. Where do the other 20% go?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Where do carriers "disappear"?
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
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Recombination Simulator</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Vary surface recombination velocity and carrier lifetime
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase SRV (more defects) - watch Voc and efficiency drop</li>
              <li>Increase carrier lifetime - see Voc improve</li>
              <li>Notice: you can lose carriers without changing cell area!</li>
              <li>Observe how surface defects (red X) trap carriers</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'surface';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Carriers "disappear" through recombination at surface defects! These defects act like
              traps where electrons and holes meet and cancel out, releasing energy as heat instead
              of current.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Recombination</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Dangling Bonds:</strong> At the silicon
                surface, the crystal structure ends abruptly. Atoms have unsatisfied bonds that create
                energy states in the bandgap - perfect "traps" for carriers.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Surface Recombination Velocity (SRV):</strong> This
                parameter quantifies how "hungry" the surface is for carriers. Higher SRV = more
                recombination = lower voltage and efficiency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Passivation:</strong> By coating the surface
                with materials that satisfy the dangling bonds (like Al2O3, SiO2, or a-Si:H), we can
                reduce SRV by 100-10,000x!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Voltage Impact:</strong> Voc depends on the
                ratio of generation to recombination. Reducing surface recombination directly increases
                Voc, often by 50-100 mV.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Compare PERC, TOPCon, and HJT passivation technologies
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Technologies:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Three main passivation technologies dominate modern solar cells: PERC (aluminum oxide),
              TOPCon (tunneling oxide + poly-Si), and HJT (amorphous silicon). Which achieves the
              lowest recombination?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which technology achieves the lowest recombination?
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
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Passivation Technologies</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between technologies and observe the differences
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
              HJT achieves the lowest SRV (~2 cm/s) because amorphous silicon provides excellent
              chemical passivation AND field-effect passivation. This leads to the highest Voc
              (~740 mV) among commercial technologies.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'hjt_best';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              HJT (Heterojunction) technology achieves the lowest recombination because amorphous
              silicon provides exceptional surface passivation!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Technology Comparison</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>PERC (SRV ~100 cm/s):</strong> Al2O3
                provides good chemical passivation with fixed negative charges that repel electrons.
                Cost-effective and widely adopted.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>TOPCon (SRV ~10 cm/s):</strong> Ultra-thin
                SiO2 tunnel layer + doped poly-Si provides excellent passivation while allowing
                current flow. Growing market share.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>HJT (SRV ~2 cm/s):</strong> Amorphous
                silicon:hydrogen (a-Si:H) has abundant hydrogen that saturates dangling bonds. Plus,
                the a-Si/c-Si interface has inherent band bending that repels carriers. Best passivation,
                but more complex manufacturing.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Passivation is crucial beyond solar cells
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
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
                {testScore >= 8 ? 'You\'ve mastered passivation and recombination!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered passivation and recombination!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Surface recombination at defect sites</li>
              <li>SRV as a measure of surface quality</li>
              <li>Passivation mechanisms (chemical and field-effect)</li>
              <li>PERC, TOPCon, and HJT technology comparison</li>
              <li>Impact of recombination on Voc and efficiency</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The highest efficiency silicon solar cells (&gt;26%) combine the best bulk silicon
              quality with excellent surface passivation on both sides. Research continues into
              new passivation materials like transition metal oxides that could enable even higher
              efficiencies!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default PassivationRecombinationRenderer;
