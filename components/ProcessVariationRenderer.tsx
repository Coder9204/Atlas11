import React, { useState, useCallback, useEffect } from 'react';

interface ProcessVariationRendererProps {
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
  fast: '#3b82f6',
  typical: '#10b981',
  slow: '#ef4444',
  histogram: '#8b5cf6',
};

// Seeded random number generator for reproducibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const ProcessVariationRenderer: React.FC<ProcessVariationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [vthVariation, setVthVariation] = useState(10); // mV sigma
  const [lineWidthVariation, setLineWidthVariation] = useState(5); // % sigma
  const [targetClock, setTargetClock] = useState(1000); // MHz
  const [numPaths, setNumPaths] = useState(1000);
  const [adaptiveVoltage, setAdaptiveVoltage] = useState(false);
  const [voltageBoost, setVoltageBoost] = useState(0); // % boost
  const [frequencyReduction, setFrequencyReduction] = useState(0); // % reduction
  const [simulationSeed, setSimulationSeed] = useState(42);
  const [isSimulating, setIsSimulating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Monte Carlo simulation
  const runMonteCarloSimulation = useCallback(() => {
    const delays: number[] = [];
    const baseDelay = 1000 / targetClock; // ns for one clock period

    for (let i = 0; i < numPaths; i++) {
      // Generate random variations for this path
      const seed1 = simulationSeed * 1000 + i;
      const seed2 = simulationSeed * 2000 + i;

      // Box-Muller transform for Gaussian distribution
      const u1 = seededRandom(seed1);
      const u2 = seededRandom(seed2);
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

      // Threshold voltage variation effect on delay (higher Vth = slower)
      const vthShift = z0 * vthVariation; // mV
      const vthDelayFactor = 1 + vthShift / 200; // 200mV ~ 100% delay change

      // Line width variation effect (narrower = slower due to higher resistance)
      const widthShift = z1 * lineWidthVariation; // %
      const widthDelayFactor = 1 - widthShift / 50; // 50% width change ~ 100% delay change

      // Adaptive voltage compensation
      let adaptiveFactor = 1;
      if (adaptiveVoltage) {
        // Voltage boost speeds up transistors
        adaptiveFactor = 1 - voltageBoost / 100;
        // Frequency reduction gives more time margin
        adaptiveFactor *= (1 + frequencyReduction / 100);
      }

      // Combined delay for this path
      const pathDelay = baseDelay * vthDelayFactor * widthDelayFactor * adaptiveFactor;
      delays.push(pathDelay);
    }

    // Sort delays for histogram
    delays.sort((a, b) => a - b);

    // Calculate statistics
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);
    const minDelay = delays[0];
    const maxDelay = delays[delays.length - 1];
    const targetPeriod = 1000 / targetClock;

    // Count failing paths (delay > target period)
    const failingPaths = delays.filter(d => d > targetPeriod).length;
    const yieldPercent = ((delays.length - failingPaths) / delays.length) * 100;

    // Create histogram bins
    const numBins = 30;
    const binWidth = (maxDelay - minDelay) / numBins;
    const histogram: { binStart: number; count: number }[] = [];
    for (let i = 0; i < numBins; i++) {
      const binStart = minDelay + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = delays.filter(d => d >= binStart && d < binEnd).length;
      histogram.push({ binStart, count });
    }

    return {
      delays,
      mean,
      stdDev,
      minDelay,
      maxDelay,
      failingPaths,
      yieldPercent,
      histogram,
      targetPeriod,
    };
  }, [numPaths, vthVariation, lineWidthVariation, targetClock, adaptiveVoltage, voltageBoost, frequencyReduction, simulationSeed]);

  const predictions = [
    { id: 'identical', label: 'All transistors behave identically - variation is negligible' },
    { id: 'few_slow', label: 'A few slow paths dominate timing failures' },
    { id: 'uniform', label: 'Variation is uniform - all paths are equally likely to fail' },
    { id: 'fast_fail', label: 'Fast paths cause failures due to hold time violations' },
  ];

  const twistPredictions = [
    { id: 'voltage_best', label: 'Voltage boost alone is the best solution' },
    { id: 'frequency_best', label: 'Frequency reduction alone is the best solution' },
    { id: 'combined', label: 'Combining both gives the best yield/performance trade-off' },
    { id: 'neither', label: 'Neither helps - the chip is fundamentally broken' },
  ];

  const transferApplications = [
    {
      title: 'SRAM Stability',
      description: 'Static RAM cells are extremely sensitive to threshold voltage mismatch between paired transistors.',
      question: 'Why do SRAM bit cells fail more often than logic gates?',
      answer: 'SRAM requires precise balance between 6 transistors. Vth mismatch causes read/write margin degradation. At advanced nodes, SRAM yield often limits overall chip yield, driving the need for ECC and redundancy.',
    },
    {
      title: 'Speed Binning',
      description: 'Chips are tested and sorted into different speed grades based on their maximum operating frequency.',
      question: 'How does process variation enable speed binning as a business strategy?',
      answer: 'Natural variation creates a distribution of chip speeds. Instead of discarding slower chips, they are sold at lower prices for less demanding applications. The fastest chips command premium prices for high-performance markets.',
    },
    {
      title: 'Design for Manufacturing',
      description: 'Modern chip design includes techniques to tolerate manufacturing variation.',
      question: 'What is "design for manufacturing" (DFM) and why is it important?',
      answer: 'DFM includes guard-banding (adding margin), restricted design rules, redundant vias, and OPC (optical proximity correction). These techniques make layouts more robust to lithography and etch variations, improving yield.',
    },
    {
      title: 'Adaptive Voltage Scaling',
      description: 'Modern processors dynamically adjust voltage and frequency based on workload and silicon quality.',
      question: 'How do chips "learn" their optimal voltage/frequency operating point?',
      answer: 'During manufacturing test, each chip is characterized to find its minimum voltage at each frequency. This data is stored in on-chip fuses. At runtime, the chip uses this data plus thermal/power sensors to optimize operation.',
    },
  ];

  const testQuestions = [
    {
      question: 'Process variation refers to:',
      options: [
        { text: 'Intentional differences between chip designs', correct: false },
        { text: 'Random differences in manufactured device parameters', correct: true },
        { text: 'Variation in chip packaging', correct: false },
        { text: 'Differences between fab locations', correct: false },
      ],
    },
    {
      question: 'Threshold voltage (Vth) variation primarily affects:',
      options: [
        { text: 'Chip physical dimensions', correct: false },
        { text: 'Transistor switching speed and leakage', correct: true },
        { text: 'Metal interconnect resistance', correct: false },
        { text: 'Package thermal resistance', correct: false },
      ],
    },
    {
      question: 'In a chip with millions of paths, timing failures are typically caused by:',
      options: [
        { text: 'All paths failing simultaneously', correct: false },
        { text: 'A small number of statistically slow paths', correct: true },
        { text: 'The average path delay', correct: false },
        { text: 'Paths that are too fast', correct: false },
      ],
    },
    {
      question: 'Line width variation affects delay because:',
      options: [
        { text: 'Narrower lines have higher resistance', correct: true },
        { text: 'Wider lines block more light', correct: false },
        { text: 'Line width affects chip color', correct: false },
        { text: 'Lines always have the same resistance', correct: false },
      ],
    },
    {
      question: 'Design "corners" (FF, TT, SS) represent:',
      options: [
        { text: 'Physical corners of the die', correct: false },
        { text: 'Combinations of best/worst case process parameters', correct: true },
        { text: 'Temperature measurement points', correct: false },
        { text: 'Test probe locations', correct: false },
      ],
    },
    {
      question: 'Increasing supply voltage to compensate for variation:',
      options: [
        { text: 'Has no effect on performance', correct: false },
        { text: 'Speeds up transistors but increases power consumption', correct: true },
        { text: 'Slows down transistors', correct: false },
        { text: 'Reduces chip yield', correct: false },
      ],
    },
    {
      question: 'Statistical timing analysis differs from traditional timing analysis by:',
      options: [
        { text: 'Ignoring process variation', correct: false },
        { text: 'Treating delays as probability distributions, not single values', correct: true },
        { text: 'Only analyzing critical paths', correct: false },
        { text: 'Using faster computers', correct: false },
      ],
    },
    {
      question: 'Die-to-die variation is caused by:',
      options: [
        { text: 'Transistors on the same die having different sizes', correct: false },
        { text: 'Systematic differences between chips on a wafer', correct: true },
        { text: 'Packaging differences', correct: false },
        { text: 'Testing errors', correct: false },
      ],
    },
    {
      question: 'Yield loss due to process variation can be improved by:',
      options: [
        { text: 'Making the chip larger', correct: false },
        { text: 'Adding timing margin and using redundancy', correct: true },
        { text: 'Reducing the number of transistors', correct: false },
        { text: 'Using older technology nodes', correct: false },
      ],
    },
    {
      question: 'The "3-sigma" rule in design means:',
      options: [
        { text: 'Using three different process technologies', correct: false },
        { text: 'Designing for 99.7% of the variation distribution', correct: true },
        { text: 'Running three simulation iterations', correct: false },
        { text: 'Having three backup designs', correct: false },
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

  // Auto-simulate on parameter change
  useEffect(() => {
    if (isSimulating) {
      const timer = setTimeout(() => {
        setSimulationSeed(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSimulating, simulationSeed]);

  const renderVisualization = (interactive: boolean, showAdaptive: boolean = false) => {
    const width = 500;
    const height = 420;
    const sim = runMonteCarloSimulation();

    // Histogram rendering
    const histogramHeight = 180;
    const histogramTop = 80;
    const maxCount = Math.max(...sim.histogram.map(h => h.count));
    const barWidth = 350 / sim.histogram.length;

    // Color based on whether bin is before or after target
    const getBinColor = (binStart: number) => {
      if (binStart > sim.targetPeriod) return colors.error;
      if (binStart > sim.targetPeriod * 0.9) return colors.warning;
      return colors.histogram;
    };

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
            <linearGradient id="histGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.histogram} />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={250} y={30} fill={colors.textPrimary} fontSize={16} textAnchor="middle" fontWeight="bold">
            Path Delay Distribution
          </text>
          <text x={250} y={50} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            {numPaths} paths simulated | Target: {targetClock} MHz ({sim.targetPeriod.toFixed(2)} ns)
          </text>

          {/* Histogram background */}
          <rect x={70} y={histogramTop} width={360} height={histogramHeight} fill="rgba(0,0,0,0.3)" rx={4} />

          {/* Target clock line */}
          <line
            x1={70 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 350}
            y1={histogramTop}
            x2={70 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 350}
            y2={histogramTop + histogramHeight}
            stroke={colors.error}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          <text
            x={70 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 350}
            y={histogramTop - 5}
            fill={colors.error}
            fontSize={10}
            textAnchor="middle"
          >
            Target
          </text>

          {/* Histogram bars */}
          {sim.histogram.map((bin, i) => {
            const barHeight = (bin.count / maxCount) * (histogramHeight - 20);
            const x = 75 + i * barWidth;
            const y = histogramTop + histogramHeight - barHeight - 10;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth - 2}
                height={barHeight}
                fill={getBinColor(bin.binStart)}
                opacity={0.8}
                rx={1}
              />
            );
          })}

          {/* X-axis labels */}
          <text x={70} y={histogramTop + histogramHeight + 15} fill={colors.textSecondary} fontSize={9}>
            {sim.minDelay.toFixed(2)} ns
          </text>
          <text x={420} y={histogramTop + histogramHeight + 15} fill={colors.textSecondary} fontSize={9} textAnchor="end">
            {sim.maxDelay.toFixed(2)} ns
          </text>
          <text x={250} y={histogramTop + histogramHeight + 30} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Path Delay (ns)
          </text>

          {/* Y-axis label */}
          <text x={55} y={histogramTop + histogramHeight / 2} fill={colors.textSecondary} fontSize={10} textAnchor="middle" transform={`rotate(-90, 55, ${histogramTop + histogramHeight / 2})`}>
            Count
          </text>

          {/* Statistics panel */}
          <rect x={10} y={300} width={150} height={110} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={20} y={318} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Statistics</text>
          <text x={20} y={336} fill={colors.textSecondary} fontSize={10}>
            Mean: {sim.mean.toFixed(3)} ns
          </text>
          <text x={20} y={352} fill={colors.textSecondary} fontSize={10}>
            Std Dev: {sim.stdDev.toFixed(3)} ns
          </text>
          <text x={20} y={368} fill={colors.textSecondary} fontSize={10}>
            3σ range: {(sim.mean - 3 * sim.stdDev).toFixed(2)} - {(sim.mean + 3 * sim.stdDev).toFixed(2)}
          </text>
          <text x={20} y={384} fill={colors.error} fontSize={10}>
            Failing: {sim.failingPaths} paths
          </text>
          <text x={20} y={400} fill={sim.yieldPercent >= 95 ? colors.success : colors.warning} fontSize={11} fontWeight="bold">
            Yield: {sim.yieldPercent.toFixed(1)}%
          </text>

          {/* Yield gauge */}
          <rect x={340} y={300} width={150} height={110} fill="rgba(0,0,0,0.6)" rx={8} stroke={sim.yieldPercent >= 95 ? colors.success : colors.warning} strokeWidth={1} />
          <text x={415} y={318} fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Yield Status</text>

          {/* Yield bar */}
          <rect x={355} y={335} width={120} height={20} fill="rgba(255,255,255,0.1)" rx={4} />
          <rect x={355} y={335} width={120 * sim.yieldPercent / 100} height={20} fill={sim.yieldPercent >= 95 ? colors.success : sim.yieldPercent >= 80 ? colors.warning : colors.error} rx={4} />
          <text x={415} y={350} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">
            {sim.yieldPercent.toFixed(1)}%
          </text>

          <text x={415} y={375} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Target: 95%
          </text>

          {showAdaptive && adaptiveVoltage && (
            <>
              <text x={415} y={392} fill={colors.fast} fontSize={10} textAnchor="middle">
                +{voltageBoost}% Voltage
              </text>
              <text x={415} y={405} fill={colors.slow} fontSize={10} textAnchor="middle">
                -{frequencyReduction}% Frequency
              </text>
            </>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isSimulating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isSimulating ? 'Stop' : 'Run Monte Carlo'}
            </button>
            <button
              onClick={() => setSimulationSeed(Math.random() * 10000)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.histogram,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              New Sample
            </button>
            <button
              onClick={() => { setVthVariation(10); setLineWidthVariation(5); setTargetClock(1000); setAdaptiveVoltage(false); setVoltageBoost(0); setFrequencyReduction(0); }}
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

  const renderControls = (showAdaptiveControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Vth Variation (sigma): {vthVariation} mV
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={vthVariation}
          onChange={(e) => setVthVariation(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Line Width Variation (sigma): {lineWidthVariation}%
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="0.5"
          value={lineWidthVariation}
          onChange={(e) => setLineWidthVariation(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Target Clock: {targetClock} MHz
        </label>
        <input
          type="range"
          min="500"
          max="2000"
          step="50"
          value={targetClock}
          onChange={(e) => setTargetClock(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showAdaptiveControls && (
        <>
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
                checked={adaptiveVoltage}
                onChange={(e) => setAdaptiveVoltage(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Adaptive Voltage/Frequency
            </label>
          </div>

          {adaptiveVoltage && (
            <>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Voltage Boost: +{voltageBoost}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={voltageBoost}
                  onChange={(e) => setVoltageBoost(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Frequency Reduction: -{frequencyReduction}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={frequencyReduction}
                  onChange={(e) => setFrequencyReduction(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Variation causes {(runMonteCarloSimulation().stdDev / runMonteCarloSimulation().mean * 100).toFixed(1)}% coefficient of variation
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Delay = Base × (1 + Vth_shift/200) × (1 - Width_shift/50)
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
              Process Variation
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If transistors are "the same design," why do chips vary?
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
                Every transistor on a chip is designed identically, yet no two are truly the same.
                Random variations in threshold voltage and line width create a distribution of
                speeds. How do designers ensure the chip works despite these variations?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Run the Monte Carlo simulation to see how variation affects path delays!
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
              A histogram showing the delay distribution of thousands of paths in a chip.
              Each path's delay depends on the random variations of its transistors.
              Paths slower than the target clock period fail timing checks.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What pattern do you expect in timing failures?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Process Variation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust variation parameters and observe how the delay distribution changes
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
              <li>Increase Vth variation to 30mV - watch yield drop</li>
              <li>Increase target clock to 1.5GHz - how does yield change?</li>
              <li>Try low variation (5mV, 2%) - is 99% yield possible?</li>
              <li>Notice: a few slow paths dominate the failures!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'few_slow';

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
              A few statistically slow paths dominate timing failures. Even with millions of paths,
              only the 3-sigma outliers matter for yield. Design must close timing at these corners.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Variation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Dopant Fluctuation:</strong> At nanometer
                scales, individual dopant atoms matter. The discrete nature of atoms causes Vth variation.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Line Edge Roughness:</strong> Photolithography
                creates imperfect edges with ~2nm roughness. This varies effective channel length.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Statistical Tail:</strong> With Gaussian variation,
                3-sigma events (0.3% probability) determine yield for a billion-transistor chip.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Design Margin:</strong> Circuits are designed
                with "guard bands" to tolerate worst-case variation, at the cost of average performance.
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
              What if we could dynamically adjust voltage and frequency?
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
              Modern processors can boost voltage to speed up slow transistors (but increase power),
              or reduce frequency to give more timing margin (but reduce performance).
              Adaptive techniques can rescue chips that would otherwise fail.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the best strategy for rescuing marginal chips?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Adaptive Techniques</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable adaptive voltage/frequency and find the optimal balance
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
              Voltage boost helps but costs power (P ~ V^2). Frequency reduction always works but
              hurts performance. The optimal strategy combines both: boost voltage to save some
              chips, reduce frequency to save others, achieving higher overall yield.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'combined';

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
              Combining adaptive voltage and frequency gives the best yield/performance trade-off.
              Chips are binned into different performance tiers based on their silicon quality.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Adaptive Techniques in Practice</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DVFS (Dynamic Voltage/Frequency Scaling):</strong> Modern
                CPUs adjust voltage and frequency hundreds of times per second based on workload.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Speed Binning:</strong> Chips are tested and sorted
                into performance tiers. Premium chips run faster, budget chips run slower - same design!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>AVS (Adaptive Voltage Scaling):</strong> On-chip
                monitors measure actual speed and adjust voltage to the minimum needed, saving power.
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
              Process variation affects every aspect of chip design
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
                {testScore >= 8 ? 'You\'ve mastered process variation!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered process variation physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Random variation creates Gaussian distributions of device parameters</li>
              <li>3-sigma statistical tails dominate yield for large designs</li>
              <li>Timing margins (guard bands) ensure functionality at corners</li>
              <li>Adaptive voltage/frequency can rescue marginal chips</li>
              <li>Speed binning turns variation into a business opportunity</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              At sub-10nm nodes, variation is the dominant challenge. Statistical timing analysis
              replaces corner-based methods. Machine learning predicts yield from design features.
              The physics of atomic-scale randomness is now central to chip economics!
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

export default ProcessVariationRenderer;
