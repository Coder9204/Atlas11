import React, { useState, useCallback } from 'react';

interface IonImplantationRendererProps {
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
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  silicon: '#4a5568',
  dopant: '#3b82f6',
  ion: '#8b5cf6',
  crystal: '#10b981',
};

const IonImplantationRenderer: React.FC<IonImplantationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [ionEnergy, setIonEnergy] = useState(50); // keV
  const [doseExponent, setDoseExponent] = useState(14); // 10^14 to 10^16 ions/cm^2
  const [annealTemp, setAnnealTemp] = useState(600); // Celsius
  const [annealTime, setAnnealTime] = useState(30); // seconds
  const [crystalOrientation, setCrystalOrientation] = useState<'100' | '110' | '111'>('100');
  const [showChanneling, setShowChanneling] = useState(false);
  const [isImplanting, setIsImplanting] = useState(false);
  const [isAnnealing, setIsAnnealing] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateImplantProfile = useCallback(() => {
    // LSS theory approximation for implant range
    // Range (Rp) roughly proportional to E^0.7 for typical dopants
    const baseRange = 10; // nm at 10 keV
    const projectedRange = baseRange * Math.pow(ionEnergy / 10, 0.7); // nm

    // Straggle (delta Rp) roughly 0.4 * Rp
    const straggle = projectedRange * 0.4;

    // Channeling effect - ions can travel much deeper in aligned crystals
    const channelingFactor = showChanneling ?
      (crystalOrientation === '110' ? 2.5 : crystalOrientation === '100' ? 1.8 : 1.2) : 1;

    const effectiveRange = projectedRange * channelingFactor;

    // Anneal diffusion - Fick's law
    // Diffusion length = sqrt(D * t), D = D0 * exp(-Ea/kT)
    const activationEnergy = 3.5; // eV for dopants in Si
    const kT = 8.617e-5 * (annealTemp + 273); // eV
    const D0 = 1e7; // nm^2/s
    const diffusivity = D0 * Math.exp(-activationEnergy / kT);
    const diffusionLength = Math.sqrt(diffusivity * annealTime);

    // Post-anneal profile is broader
    const postAnnealStraggle = Math.sqrt(straggle * straggle + 2 * diffusionLength * diffusionLength);

    // Junction depth (where concentration falls to ~1e17)
    const peakConcentration = Math.pow(10, doseExponent) / (Math.sqrt(2 * Math.PI) * straggle);
    const junctionDepth = effectiveRange + 3 * postAnnealStraggle;

    // Damage level (arbitrary units)
    const damageLevel = (ionEnergy / 100) * Math.pow(10, doseExponent - 14) * 100;

    // Activation percentage (depends on anneal)
    const activation = Math.min(100, 100 * (1 - Math.exp(-annealTime / 30)) * (annealTemp / 1000));

    return {
      projectedRange: effectiveRange,
      straggle,
      postAnnealStraggle,
      junctionDepth,
      peakConcentration,
      damageLevel: Math.min(100, damageLevel),
      activation: Math.min(100, activation),
      diffusionLength,
    };
  }, [ionEnergy, doseExponent, annealTemp, annealTime, crystalOrientation, showChanneling]);

  const predictions = [
    { id: 'linear', label: 'Higher energy means deeper implant - linear relationship' },
    { id: 'sqrt', label: 'Depth increases with energy, but slows down (square root relationship)' },
    { id: 'constant', label: 'Depth is mostly constant - ions stop at the crystal surface' },
    { id: 'random', label: 'Depth is random - ions scatter unpredictably' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Crystal orientation has no effect - silicon is silicon' },
    { id: 'channeling', label: 'Some orientations allow ions to travel much deeper (channeling)' },
    { id: 'reflection', label: 'Some orientations reflect the ions back' },
    { id: 'damage', label: 'Different orientations cause different damage patterns' },
  ];

  const transferApplications = [
    {
      title: 'CMOS Well Formation',
      description: 'Modern CMOS processes use deep implants to form n-wells and p-wells that isolate transistors.',
      question: 'Why are high-energy implants (MeV) used for retrograde wells?',
      answer: 'Retrograde wells have peak doping below the surface, which reduces latch-up susceptibility. High-energy implants place the peak deep in the silicon, then a lower-energy implant sets the surface concentration.',
    },
    {
      title: 'Source/Drain Engineering',
      description: 'Ultra-shallow junctions (<10nm) are critical for short-channel transistors.',
      question: 'How do you create junctions shallower than the implant range?',
      answer: 'Use very low energy (<1 keV), heavy ions (like arsenic), and rapid thermal annealing (RTA) to minimize diffusion. Pre-amorphization implants can also limit channeling.',
    },
    {
      title: 'Threshold Voltage Adjustment',
      description: 'Precise doping near the gate controls the voltage at which a transistor turns on.',
      question: 'Why is dose control (rather than energy) critical for Vth implants?',
      answer: 'The threshold voltage shifts proportionally to the integrated dopant concentration under the gate. A 10% dose variation causes measurable Vth shift, affecting circuit speed and power.',
    },
    {
      title: 'Power Devices',
      description: 'High-voltage transistors need carefully graded doping profiles to spread electric fields.',
      question: 'How do multiple implants at different energies create a graded profile?',
      answer: 'Each implant energy creates a Gaussian peak at a different depth. By overlapping multiple implants, the total profile becomes a smooth, graded transition that optimizes breakdown voltage.',
    },
  ];

  const testQuestions = [
    {
      question: 'What primarily determines the depth of ion implantation in silicon?',
      options: [
        { text: 'Ion beam current', correct: false },
        { text: 'Ion energy (keV)', correct: true },
        { text: 'Implant time', correct: false },
        { text: 'Substrate temperature', correct: false },
      ],
    },
    {
      question: 'The Gaussian distribution of implanted ions is characterized by:',
      options: [
        { text: 'Projected range (Rp) and straggle (ΔRp)', correct: true },
        { text: 'Dose and beam current', correct: false },
        { text: 'Wafer rotation speed', correct: false },
        { text: 'Vacuum pressure', correct: false },
      ],
    },
    {
      question: 'Channeling occurs when:',
      options: [
        { text: 'The ion beam is too intense', correct: false },
        { text: 'Ions travel along crystal lattice channels with less scattering', correct: true },
        { text: 'The wafer is heated during implant', correct: false },
        { text: 'Multiple ion species are used', correct: false },
      ],
    },
    {
      question: 'Post-implant annealing is necessary to:',
      options: [
        { text: 'Increase the implant dose', correct: false },
        { text: 'Repair crystal damage and activate dopants', correct: true },
        { text: 'Remove the photoresist mask', correct: false },
        { text: 'Reduce the implant depth', correct: false },
      ],
    },
    {
      question: 'Higher anneal temperatures cause:',
      options: [
        { text: 'Shallower junctions due to ion evaporation', correct: false },
        { text: 'Broader profiles due to increased diffusion', correct: true },
        { text: 'No change to the profile', correct: false },
        { text: 'Sharper profiles due to better activation', correct: false },
      ],
    },
    {
      question: 'To create ultra-shallow junctions, you should:',
      options: [
        { text: 'Use high energy and long anneal times', correct: false },
        { text: 'Use low energy, heavy ions, and rapid thermal anneal', correct: true },
        { text: 'Use high dose to saturate the surface', correct: false },
        { text: 'Implant at high temperature', correct: false },
      ],
    },
    {
      question: 'The junction depth is defined where:',
      options: [
        { text: 'The implanted concentration equals zero', correct: false },
        { text: 'The implanted concentration equals the background doping', correct: true },
        { text: 'The implant damage is maximum', correct: false },
        { text: 'The crystal structure is perfect', correct: false },
      ],
    },
    {
      question: 'Pre-amorphization implants are used to:',
      options: [
        { text: 'Increase the implant dose', correct: false },
        { text: 'Prevent channeling by destroying the crystal structure', correct: true },
        { text: 'Reduce wafer cost', correct: false },
        { text: 'Improve beam uniformity', correct: false },
      ],
    },
    {
      question: 'Dopant activation refers to:',
      options: [
        { text: 'The ions entering the silicon', correct: false },
        { text: 'Dopants occupying substitutional lattice sites', correct: true },
        { text: 'The implant beam turning on', correct: false },
        { text: 'The wafer loading process', correct: false },
      ],
    },
    {
      question: 'The trade-off in anneal optimization is:',
      options: [
        { text: 'Cost vs. throughput only', correct: false },
        { text: 'Higher activation vs. more diffusion (profile broadening)', correct: true },
        { text: 'Beam current vs. uniformity', correct: false },
        { text: 'Temperature vs. vacuum pressure', correct: false },
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

  const renderVisualization = (interactive: boolean, showChannelingEffect: boolean = false) => {
    const width = 500;
    const height = 400;
    const profile = calculateImplantProfile();

    // Generate concentration profile points
    const profilePoints: { x: number; y: number }[] = [];
    const maxDepth = 300; // nm
    for (let depth = 0; depth <= maxDepth; depth += 5) {
      const rp = profile.projectedRange;
      const sigma = isAnnealing ? profile.postAnnealStraggle : profile.straggle;
      // Gaussian profile
      const concentration = Math.exp(-Math.pow(depth - rp, 2) / (2 * sigma * sigma));
      profilePoints.push({ x: 50 + (depth / maxDepth) * 350, y: 300 - concentration * 200 });
    }

    // Path for profile curve
    const profilePath = profilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Ion beam particles
    const ions = [];
    if (isImplanting || interactive) {
      for (let i = 0; i < 15; i++) {
        const startY = 20 + Math.random() * 40;
        const endY = 100 + profile.projectedRange * 0.5 + (Math.random() - 0.5) * profile.straggle * 0.8;
        ions.push(
          <line
            key={`ion${i}`}
            x1={250 + (Math.random() - 0.5) * 60}
            y1={startY}
            x2={250 + (Math.random() - 0.5) * 80}
            y2={endY}
            stroke={colors.ion}
            strokeWidth={2}
            opacity={0.7}
            strokeDasharray="4,4"
          >
            <animate
              attributeName="y1"
              values={`${startY};${endY};${startY}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        );
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="siliconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="profileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.dopant} />
              <stop offset="100%" stopColor={colors.ion} />
            </linearGradient>
          </defs>

          {/* Ion beam source */}
          <rect x={200} y={5} width={100} height={30} fill="#4b5563" rx={4} />
          <text x={250} y={22} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Ion Beam ({ionEnergy} keV)
          </text>

          {/* Ion beam cone */}
          <polygon points="220,35 280,35 300,80 200,80" fill="rgba(139, 92, 246, 0.3)" />

          {/* Ion particles */}
          {ions}

          {/* Silicon wafer cross-section */}
          <rect x={50} y={80} width={400} height={220} fill="url(#siliconGrad)" stroke={colors.silicon} strokeWidth={2} />

          {/* Crystal lattice pattern (if showing channeling) */}
          {showChannelingEffect && (
            <g opacity={0.3}>
              {Array.from({ length: 20 }).map((_, i) =>
                Array.from({ length: 11 }).map((_, j) => (
                  <circle
                    key={`atom${i}${j}`}
                    cx={60 + i * 20}
                    cy={85 + j * 20}
                    r={3}
                    fill={colors.crystal}
                  />
                ))
              )}
              {crystalOrientation === '110' && (
                <line x1={250} y1={80} x2={250} y2={300} stroke={colors.accent} strokeWidth={2} strokeDasharray="5,5" />
              )}
            </g>
          )}

          {/* Implant profile plot */}
          <text x={250} y={330} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Depth (nm) → {Math.round(profile.junctionDepth)} nm junction
          </text>

          {/* Profile background */}
          <rect x={50} y={100} width={350} height={200} fill="rgba(0,0,0,0.4)" rx={4} />

          {/* Concentration scale */}
          <text x={45} y={110} fill={colors.textSecondary} fontSize={9} textAnchor="end">High</text>
          <text x={45} y={290} fill={colors.textSecondary} fontSize={9} textAnchor="end">Low</text>

          {/* Profile curve */}
          <path
            d={profilePath}
            fill="none"
            stroke="url(#profileGrad)"
            strokeWidth={3}
          />

          {/* Fill under curve */}
          <path
            d={`${profilePath} L 400 300 L 50 300 Z`}
            fill={isAnnealing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}
          />

          {/* Peak marker */}
          <circle
            cx={50 + (profile.projectedRange / 300) * 350}
            cy={100}
            r={5}
            fill={colors.accent}
          />
          <text
            x={50 + (profile.projectedRange / 300) * 350}
            y={95}
            fill={colors.accent}
            fontSize={10}
            textAnchor="middle"
          >
            Rp={Math.round(profile.projectedRange)}nm
          </text>

          {/* Info panel */}
          <rect x={10} y={340} width={200} height={55} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={20} y={355} fill={colors.textSecondary} fontSize={10}>
            Dose: 10^{doseExponent} ions/cm²
          </text>
          <text x={20} y={370} fill={colors.textSecondary} fontSize={10}>
            Damage: {Math.round(profile.damageLevel)}%
          </text>
          <text x={20} y={385} fill={colors.success} fontSize={10}>
            Activation: {Math.round(profile.activation)}%
          </text>

          {/* Anneal status */}
          {isAnnealing && (
            <rect x={290} y={340} width={150} height={55} fill="rgba(16, 185, 129, 0.2)" rx={8} stroke={colors.success} strokeWidth={1}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </rect>
          )}
          <text x={300} y={355} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={10}>
            Anneal: {annealTemp}°C
          </text>
          <text x={300} y={370} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={10}>
            Time: {annealTime}s
          </text>
          <text x={300} y={385} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={10}>
            Diffusion: {profile.diffusionLength.toFixed(1)}nm
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsImplanting(!isImplanting); setIsAnnealing(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isImplanting ? colors.ion : colors.dopant,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isImplanting ? 'Stop Implant' : 'Start Implant'}
            </button>
            <button
              onClick={() => { setIsAnnealing(!isAnnealing); setIsImplanting(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnnealing ? colors.success : colors.warning,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnnealing ? 'Stop Anneal' : 'Start Anneal'}
            </button>
            <button
              onClick={() => { setIonEnergy(50); setDoseExponent(14); setAnnealTemp(600); setAnnealTime(30); setIsImplanting(false); setIsAnnealing(false); }}
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

  const renderControls = (showChannelingControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Ion Energy: {ionEnergy} keV
        </label>
        <input
          type="range"
          min="5"
          max="200"
          step="5"
          value={ionEnergy}
          onChange={(e) => setIonEnergy(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Dose: 10^{doseExponent} ions/cm²
        </label>
        <input
          type="range"
          min="12"
          max="16"
          step="0.5"
          value={doseExponent}
          onChange={(e) => setDoseExponent(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Anneal Temperature: {annealTemp}°C
        </label>
        <input
          type="range"
          min="400"
          max="1100"
          step="50"
          value={annealTemp}
          onChange={(e) => setAnnealTemp(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Anneal Time: {annealTime} seconds
        </label>
        <input
          type="range"
          min="1"
          max="120"
          step="1"
          value={annealTime}
          onChange={(e) => setAnnealTime(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showChannelingControls && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Crystal Orientation
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['100', '110', '111'] as const).map((orient) => (
                <button
                  key={orient}
                  onClick={() => setCrystalOrientation(orient)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: crystalOrientation === orient ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: crystalOrientation === orient ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ({orient})
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showChanneling}
                onChange={(e) => setShowChanneling(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Channeling Effect
            </label>
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
          Rp = {calculateImplantProfile().projectedRange.toFixed(1)} nm |
          ΔRp = {calculateImplantProfile().straggle.toFixed(1)} nm
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Junction: {calculateImplantProfile().junctionDepth.toFixed(1)} nm
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Ion Implantation
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How do you add dopants precisely without ruining the crystal?
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
                Creating a transistor requires placing precise amounts of dopant atoms at exact depths
                in the silicon crystal. Ion implantation shoots high-energy ions into the wafer,
                but how do you control where they stop? And how do you fix the damage they cause?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the ion energy and watch how the implant depth changes!
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
              An ion implanter shoots accelerated dopant ions (like phosphorus or boron) into a silicon
              wafer. The concentration profile shows how many dopant atoms end up at each depth.
              The peak is called the projected range (Rp).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does ion energy affect implant depth?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Ion Implantation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust energy, dose, and anneal parameters to shape the dopant profile
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
              <li>Increase energy from 10 to 200 keV - how does the profile shift?</li>
              <li>Try annealing at 600°C vs 1000°C - watch the profile broaden</li>
              <li>Compare short (10s) vs long (120s) anneal times</li>
              <li>Note: higher dose increases damage that needs repair!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'sqrt';

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
              Implant depth (projected range) increases with energy, but follows a sub-linear relationship.
              According to LSS theory, Rp scales roughly as E^0.7 for typical dopants in silicon.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Ion Implantation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>LSS Theory:</strong> The Lindhard-Scharff-Schiott
                model predicts ion stopping in solids. Ions lose energy through nuclear (collisions) and
                electronic (ionization) stopping.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Gaussian Profile:</strong> The implant distribution
                is roughly Gaussian with mean Rp (projected range) and standard deviation ΔRp (straggle).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Crystal Damage:</strong> Each ion creates a cascade
                of displaced silicon atoms. Higher doses create more damage that must be repaired.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Annealing:</strong> Thermal treatment repairs the
                crystal and "activates" dopants by moving them to substitutional lattice sites. But diffusion
                also broadens the profile!
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if the silicon crystal orientation matters?
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
              Silicon has a diamond cubic crystal structure with open "channels" along certain
              directions. The (100), (110), and (111) crystal orientations have different
              atomic arrangements when viewed from above.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does crystal orientation affect ion implantation?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Channeling</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle channeling and change crystal orientation to see the effect
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
              The (110) direction has the most open channels, allowing ions to travel 2-3x deeper!
              This is called channeling - ions "thread" between atomic rows with less scattering.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'channeling';

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
              Channeling allows ions to penetrate much deeper when aligned with crystal channels.
              The (110) direction in silicon has the most open channels.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Channeling in Practice</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Channel Structure:</strong> Silicon's diamond
                lattice has open channels along certain crystallographic directions. Ions traveling down
                these channels experience only glancing collisions, losing energy slowly.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Preventing Channeling:</strong> For controlled
                implants, wafers are tilted 7° off-axis and rotated. This ensures ions hit atoms early,
                preventing deep channeling tails.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Pre-Amorphization:</strong> For ultra-shallow
                junctions, a silicon or germanium implant first destroys the crystal structure, eliminating
                channels before the dopant implant.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Ion implantation is essential for semiconductor manufacturing
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
                {testScore >= 8 ? 'You\'ve mastered ion implantation!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered ion implantation physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Ion energy controls implant depth (Rp ~ E^0.7)</li>
              <li>Profile is Gaussian with range Rp and straggle ΔRp</li>
              <li>Channeling allows deeper penetration along crystal axes</li>
              <li>Annealing repairs damage but broadens the profile</li>
              <li>Dopant activation requires substitutional site occupancy</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fabs use sophisticated implant techniques: plasma doping for ultra-shallow junctions,
              high-energy (MeV) implants for deep wells, and molecular ion implants for precise dose control.
              The interplay of implant and anneal design is critical for achieving sub-10nm transistor performance.
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

export default IonImplantationRenderer;
