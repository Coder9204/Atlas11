import React, { useState, useEffect, useCallback } from 'react';

interface ChipletArchitectureRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const ChipletArchitectureRenderer: React.FC<ChipletArchitectureRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [dieSize, setDieSize] = useState(300); // mm^2
  const [chipletCount, setChipletCount] = useState(4);
  const [processNode, setProcessNode] = useState(5); // nm
  const [showInterconnect, setShowInterconnect] = useState(false);
  const [highlightedChiplet, setHighlightedChiplet] = useState<number | null>(null);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate yield and cost metrics
  const calculateMetrics = useCallback(() => {
    // Defect density (defects per cm^2) - smaller nodes have more defects
    const defectDensity = 0.1 * (7 / processNode);

    // Monolithic yield using Poisson model: Y = e^(-D * A)
    const monolithicArea = dieSize / 100; // cm^2
    const monolithicYield = Math.exp(-defectDensity * monolithicArea) * 100;

    // Chiplet yield - each chiplet is smaller
    const chipletArea = (dieSize / chipletCount) / 100; // cm^2
    const singleChipletYield = Math.exp(-defectDensity * chipletArea);
    const combinedChipletYield = Math.pow(singleChipletYield, chipletCount) * 100;

    // Effective yield (accounting for packaging success rate ~95%)
    const packagingYield = 0.95;
    const effectiveChipletYield = combinedChipletYield * packagingYield;

    // Cost comparison (relative)
    const waferCost = 100; // arbitrary units
    const monolithicCostPerGood = waferCost / (monolithicYield / 100);
    const chipletCostPerGood = (waferCost / (singleChipletYield)) * chipletCount * 1.2; // 1.2x for packaging

    // Interconnect bandwidth (simplified)
    const interconnectBandwidth = 100 * chipletCount; // GB/s

    return {
      monolithicYield: Math.round(monolithicYield * 10) / 10,
      chipletYield: Math.round(effectiveChipletYield * 10) / 10,
      singleChipletYield: Math.round(singleChipletYield * 100 * 10) / 10,
      monolithicCost: Math.round(monolithicCostPerGood),
      chipletCost: Math.round(chipletCostPerGood),
      costSavings: Math.round((1 - chipletCostPerGood / monolithicCostPerGood) * 100),
      interconnectBandwidth,
      chipletArea: Math.round(dieSize / chipletCount),
    };
  }, [dieSize, chipletCount, processNode]);

  const predictions = [
    { id: 'defects', label: 'Smaller pieces have better manufacturing yield - fewer defects per chip' },
    { id: 'cooling', label: 'Smaller chips are easier to cool' },
    { id: 'speed', label: 'Smaller chips run faster' },
    { id: 'fashion', label: 'It\'s just a marketing trend' },
  ];

  const twistPredictions = [
    { id: 'all_same', label: 'All chiplets should use the same advanced process node' },
    { id: 'mixed', label: 'Different chiplets can use different process nodes based on their needs' },
    { id: 'oldest', label: 'Use the oldest, cheapest process for everything' },
    { id: 'newest', label: 'Always use the newest process for everything' },
  ];

  const transferApplications = [
    {
      title: 'AMD EPYC Processors',
      description: 'AMD\'s server CPUs use multiple compute chiplets connected to a central I/O die.',
      question: 'Why does AMD use a separate I/O die on older technology?',
      answer: 'I/O circuits (memory controllers, PCIe) don\'t benefit much from smaller transistors but need lots of analog circuits. Using 14nm for I/O while compute is 5nm saves cost and improves yields without sacrificing performance.',
    },
    {
      title: 'Apple M-Series Ultra',
      description: 'Apple creates their largest chips by connecting two M-series chips with ultra-fast interconnect.',
      question: 'How does Apple achieve "seamless" connection between two dies?',
      answer: 'UltraFusion uses 10,000+ connections with 2.5TB/s bandwidth, making the two dies appear as one to software. The interconnect is so fast that there\'s no performance penalty for cross-die communication.',
    },
    {
      title: 'Intel Ponte Vecchio GPU',
      description: 'Intel\'s data center GPU uses 47 chiplets across 5 different process nodes.',
      question: 'Why use 5 different process nodes in one product?',
      answer: 'Each function has different optimal technology: compute tiles need latest 5nm, cache uses dense 5nm, base die uses mature 7nm for power delivery, memory uses specialized HBM process. This minimizes cost while maximizing each function.',
    },
    {
      title: 'AMD 3D V-Cache',
      description: 'AMD stacks additional cache memory directly on top of the CPU die.',
      question: 'What advantage does 3D stacking provide over side-by-side chiplets?',
      answer: '3D stacking dramatically reduces wire length between cache and compute, lowering latency and power. The cache die can use cheaper, older technology optimized for SRAM density rather than transistor speed.',
    },
  ];

  const testQuestions = [
    {
      question: 'The primary manufacturing advantage of chiplets over monolithic dies is:',
      options: [
        { text: 'Chiplets run at higher frequencies', correct: false },
        { text: 'Smaller dies have exponentially better yield', correct: true },
        { text: 'Chiplets use less power', correct: false },
        { text: 'Chiplets are easier to design', correct: false },
      ],
    },
    {
      question: 'Manufacturing yield follows approximately:',
      options: [
        { text: 'Linear decrease with die area', correct: false },
        { text: 'Exponential decrease with die area (Poisson model)', correct: true },
        { text: 'No relationship with die area', correct: false },
        { text: 'Square root of die area', correct: false },
      ],
    },
    {
      question: 'The main challenge of chiplet architectures is:',
      options: [
        { text: 'Chiplets are harder to manufacture', correct: false },
        { text: 'High-bandwidth, low-latency interconnect between chiplets', correct: true },
        { text: 'Software compatibility', correct: false },
        { text: 'Thermal management', correct: false },
      ],
    },
    {
      question: 'Why might an I/O chiplet use an older process node than compute chiplets?',
      options: [
        { text: 'I/O doesn\'t benefit from smaller transistors but needs analog circuits', correct: true },
        { text: 'Older processes are faster for I/O', correct: false },
        { text: 'I/O chiplets are always made first', correct: false },
        { text: 'Regulations require different processes', correct: false },
      ],
    },
    {
      question: 'The "reticle limit" in chip manufacturing refers to:',
      options: [
        { text: 'The maximum clock speed achievable', correct: false },
        { text: 'The maximum die size that can be exposed in one lithography shot (~800mm2)', correct: true },
        { text: 'The minimum transistor size', correct: false },
        { text: 'The number of chips per wafer', correct: false },
      ],
    },
    {
      question: 'AMD\'s EPYC processors benefit from chiplets because:',
      options: [
        { text: 'They can scale core count by adding more compute chiplets', correct: true },
        { text: 'Single-thread performance increases', correct: false },
        { text: 'Memory bandwidth doubles', correct: false },
        { text: 'Power consumption is eliminated', correct: false },
      ],
    },
    {
      question: '3D chip stacking (like AMD V-Cache) provides:',
      options: [
        { text: 'Higher clock speeds', correct: false },
        { text: 'Shorter interconnects and lower latency between layers', correct: true },
        { text: 'Better thermal dissipation', correct: false },
        { text: 'Simpler manufacturing', correct: false },
      ],
    },
    {
      question: 'A defect on a monolithic 400mm2 die versus a 100mm2 chiplet:',
      options: [
        { text: 'Affects the same amount of silicon', correct: false },
        { text: 'Kills 4x more silicon value on the monolithic die', correct: true },
        { text: 'Has no impact on either', correct: false },
        { text: 'Can be repaired on the monolithic die', correct: false },
      ],
    },
    {
      question: 'High-bandwidth die-to-die interconnects typically use:',
      options: [
        { text: 'Traditional PCB traces', correct: false },
        { text: 'Silicon interposers or embedded bridges with thousands of connections', correct: true },
        { text: 'Wireless communication', correct: false },
        { text: 'Fiber optics', correct: false },
      ],
    },
    {
      question: 'The economic advantage of chiplets increases when:',
      options: [
        { text: 'Chips get smaller', correct: false },
        { text: 'Defect density increases (newer/denser processes)', correct: true },
        { text: 'Packaging costs decrease to zero', correct: false },
        { text: 'All chiplets are identical', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const metrics = calculateMetrics();

    // Calculate chiplet layout
    const cols = Math.ceil(Math.sqrt(chipletCount));
    const rows = Math.ceil(chipletCount / cols);

    return (
      <svg width="100%" height="450" viewBox="0 0 500 450" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="monolithicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="chipletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="interconnectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="450" fill="#0f172a" rx="12" />

        {/* Title */}
        <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
          Monolithic vs Chiplet Architecture
        </text>

        {/* Monolithic Die Section */}
        <g transform="translate(30, 45)">
          <text x="90" y="0" fill="#6366f1" fontSize="12" fontWeight="bold" textAnchor="middle">Monolithic Die</text>
          <rect x="20" y="10" width="140" height="140" fill="url(#monolithicGrad)" rx="4" stroke="#818cf8" strokeWidth="2" />

          {/* Defects visualization */}
          {[...Array(Math.floor((100 - metrics.monolithicYield) / 5))].map((_, i) => (
            <circle
              key={i}
              cx={40 + Math.random() * 100}
              cy={30 + Math.random() * 100}
              r="3"
              fill="#ef4444"
              opacity="0.8"
            />
          ))}

          <text x="90" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">{dieSize}mm2 total</text>
          <text x="90" y="185" fill={metrics.monolithicYield > 50 ? '#22c55e' : '#ef4444'} fontSize="11" textAnchor="middle">
            Yield: {metrics.monolithicYield}%
          </text>
        </g>

        {/* Chiplet Section */}
        <g transform="translate(250, 45)">
          <text x="100" y="0" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">Chiplet Design</text>

          {/* Chiplets grid */}
          {[...Array(chipletCount)].map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const chipletSize = 130 / Math.max(cols, rows);
            const x = 35 + col * (chipletSize + 5);
            const y = 15 + row * (chipletSize + 5);

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={chipletSize}
                  height={chipletSize}
                  fill={highlightedChiplet === i ? '#4ade80' : 'url(#chipletGrad)'}
                  rx="2"
                  stroke="#86efac"
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHighlightedChiplet(i)}
                  onMouseLeave={() => setHighlightedChiplet(null)}
                />
                {/* Random defect (less likely on smaller die) */}
                {Math.random() > metrics.singleChipletYield / 100 && (
                  <circle cx={x + chipletSize / 2} cy={y + chipletSize / 2} r="2" fill="#ef4444" />
                )}
              </g>
            );
          })}

          {/* Interconnect visualization */}
          {showInterconnect && chipletCount > 1 && (
            <g opacity="0.7">
              {[...Array(chipletCount - 1)].map((_, i) => {
                const col1 = i % cols;
                const row1 = Math.floor(i / cols);
                const col2 = (i + 1) % cols;
                const row2 = Math.floor((i + 1) / cols);
                const chipletSize = 130 / Math.max(cols, rows);
                const x1 = 35 + col1 * (chipletSize + 5) + chipletSize;
                const y1 = 15 + row1 * (chipletSize + 5) + chipletSize / 2;
                const x2 = 35 + col2 * (chipletSize + 5);
                const y2 = 15 + row2 * (chipletSize + 5) + chipletSize / 2;

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  />
                );
              })}
            </g>
          )}

          <text x="100" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">{chipletCount}x {metrics.chipletArea}mm2</text>
          <text x="100" y="185" fill={metrics.chipletYield > 50 ? '#22c55e' : '#ef4444'} fontSize="11" textAnchor="middle">
            Combined Yield: {metrics.chipletYield}%
          </text>
        </g>

        {/* Yield Comparison Chart */}
        <g transform="translate(30, 220)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Yield Comparison</text>

          <rect x="0" y="15" width={metrics.monolithicYield * 2} height="20" fill="url(#monolithicGrad)" rx="4" />
          <text x={metrics.monolithicYield * 2 + 10} y="30" fill="#6366f1" fontSize="11">{metrics.monolithicYield}%</text>

          <rect x="0" y="45" width={metrics.chipletYield * 2} height="20" fill="url(#chipletGrad)" rx="4" />
          <text x={metrics.chipletYield * 2 + 10} y="60" fill="#22c55e" fontSize="11">{metrics.chipletYield}%</text>

          <text x="0" y="90" fill="#94a3b8" fontSize="10">Single chiplet yield: {metrics.singleChipletYield}%</text>
        </g>

        {/* Cost Comparison */}
        <g transform="translate(270, 220)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Relative Cost/Good Die</text>

          <rect x="0" y="15" width={Math.min(200, metrics.monolithicCost)} height="20" fill="#ef4444" rx="4" opacity="0.7" />
          <text x={Math.min(200, metrics.monolithicCost) + 10} y="30" fill="#ef4444" fontSize="11">{metrics.monolithicCost}</text>

          <rect x="0" y="45" width={Math.min(200, metrics.chipletCost)} height="20" fill="#22c55e" rx="4" opacity="0.7" />
          <text x={Math.min(200, metrics.chipletCost) + 10} y="60" fill="#22c55e" fontSize="11">{metrics.chipletCost}</text>

          <text x="0" y="90" fill={metrics.costSavings > 0 ? '#22c55e' : '#ef4444'} fontSize="11">
            {metrics.costSavings > 0 ? `Saving ${metrics.costSavings}%` : `Extra cost ${-metrics.costSavings}%`}
          </text>
        </g>

        {/* Process Node Info */}
        <g transform="translate(30, 340)">
          <rect x="0" y="0" width="440" height="100" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="20" y="25" fill="#f8fafc" fontSize="12" fontWeight="bold">Current Settings</text>
          <text x="20" y="50" fill="#94a3b8" fontSize="11">Process Node: {processNode}nm</text>
          <text x="20" y="70" fill="#94a3b8" fontSize="11">Total Die Area: {dieSize}mm2</text>
          <text x="20" y="90" fill="#94a3b8" fontSize="11">Chiplet Count: {chipletCount}</text>

          <text x="250" y="50" fill="#f59e0b" fontSize="11">Interconnect: {metrics.interconnectBandwidth} GB/s</text>
          <text x="250" y="70" fill="#94a3b8" fontSize="11">Packaging overhead: ~20%</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Total Die Area: {dieSize}mm2
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={dieSize}
          onChange={(e) => setDieSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Number of Chiplets: {chipletCount}
        </label>
        <input
          type="range"
          min="1"
          max="9"
          step="1"
          value={chipletCount}
          onChange={(e) => setChipletCount(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Process Node: {processNode}nm
        </label>
        <input
          type="range"
          min="3"
          max="14"
          step="1"
          value={processNode}
          onChange={(e) => setProcessNode(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <button
        onClick={() => setShowInterconnect(!showInterconnect)}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: showInterconnect ? '#f59e0b' : '#475569',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showInterconnect ? 'Hide Interconnect' : 'Show Interconnect'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#22c55e', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Chip Manufacturing</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #22c55e, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Chiplet Architecture
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
              Why are modern chips made of multiple small pieces?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #22c55e' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              The latest AMD and Intel processors aren't single chips - they're assemblies of multiple smaller "chiplets."
              Apple's M1 Ultra is literally two M1 Max chips glued together!
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
              Why build chips in pieces instead of as one unit? The answer involves physics, economics, and clever engineering.
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Discover the Reason
          </button>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              AMD, Intel, and Apple all now use chiplet designs instead of single monolithic chips.
              What's the main reason for this change?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? '2px solid #22c55e' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={onPhaseComplete}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#22c55e',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Test My Prediction
            </button>
          )}
        </div>
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Yield Economics</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            See how die size affects manufacturing yield and cost
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>Key Experiments:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Increase die size to 800mm2 - watch yield collapse</li>
              <li>Use smaller process nodes - see defect impact increase</li>
              <li>Add more chiplets - observe yield recovery</li>
              <li>Notice: there's a sweet spot where chiplets win on cost</li>
            </ul>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#22c55e',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Review the Concepts
          </button>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'defects';

    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Correct!' : 'The key insight:'}
            </h3>
            <p>Smaller dies have exponentially better yield! The probability of a defect killing your chip decreases dramatically with smaller area.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>The Yield Problem</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>Poisson Statistics:</strong> Yield follows Y = e^(-D x A) where D is defect density and A is die area.
              Double the area means MUCH worse than half the yield!
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>Defect Impact:</strong> A single defect anywhere on the die kills the entire chip.
              On a 400mm2 die, that's 4x the chance of hitting a defect compared to 100mm2.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>Economic Impact:</strong> If you have 10% yield on monolithic dies, you're throwing away 90% of your expensive silicon!
              With chiplets, you only discard the small defective pieces.
            </p>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#6366f1', marginBottom: '16px' }}>The Reticle Limit</h3>
            <p style={{ lineHeight: 1.7 }}>
              There's also a hard limit: the lithography machine can only expose ~800mm2 at once (the "reticle limit").
              To build bigger chips, you MUST use chiplets. NVIDIA's latest GPUs exceed this limit!
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#a855f7',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Discover the Twist
          </button>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>The Twist</h2>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>
              Here's something surprising: AMD's EPYC processors use compute chiplets on cutting-edge 5nm, but their I/O die uses older 14nm technology.
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
              Why would you mix old and new technology in the same chip?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={onPhaseComplete}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#a855f7',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              See the Answer
            </button>
          )}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Mixed Process Nodes</h2>

          {renderVisualization()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#6366f1', marginBottom: '8px' }}>Compute Chiplets (5nm)</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Need smallest transistors</li>
                <li>High density, high speed</li>
                <li>Most expensive per mm2</li>
                <li>Worth the cost for perf</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>I/O Die (14nm)</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Analog circuits work fine</li>
                <li>Memory controllers</li>
                <li>PCIe, USB, etc.</li>
                <li>Much cheaper to make</li>
              </ul>
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>The Optimization</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              Each function gets the optimal process node. Compute needs the latest, I/O doesn't benefit from it.
              This can save 30-40% on total chip cost while maintaining full performance!
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#a855f7',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Review the Discovery
          </button>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'mixed';

    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Exactly right!' : 'The key insight:'}
            </h3>
            <p>Different functions have different optimal technologies! Chiplets let you mix and match process nodes for maximum efficiency.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Heterogeneous Integration</h3>
            <div style={{ lineHeight: 1.8 }}>
              <p><strong style={{ color: '#6366f1' }}>Compute dies:</strong> Latest process (5nm, 3nm) for maximum transistor density and efficiency</p>
              <p><strong style={{ color: '#f59e0b' }}>I/O dies:</strong> Mature process (14nm) - analog circuits don't shrink well</p>
              <p><strong style={{ color: '#22c55e' }}>Memory:</strong> Specialized HBM process optimized for stacking</p>
              <p><strong style={{ color: '#ef4444' }}>Power delivery:</strong> Can use even older nodes for voltage regulators</p>
            </div>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#22c55e',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            See Real-World Applications
          </button>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
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
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #334155',
              }}
            >
              <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{app.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #22c55e',
                    background: 'transparent',
                    color: '#22c55e',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}

          {transferCompleted.size >= 4 && (
            <button
              onClick={onPhaseComplete}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#22c55e',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Take the Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
              <p style={{ color: '#94a3b8' }}>
                {testScore >= 8 ? 'You\'ve mastered chiplet architecture!' : 'Review the concepts and try again.'}
              </p>
            </div>

            <button
              onClick={testScore >= 8 ? onPhaseComplete : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: testScore >= 8 ? '#22c55e' : '#f59e0b',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {testScore >= 8 ? 'Claim Mastery' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1}/10</span>
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
                  background: testAnswers[i] !== null ? '#22c55e' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleTestAnswer(currentTestQuestion, i)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === i ? '2px solid #22c55e' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === i ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
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

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>

            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#22c55e',
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
                  background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
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
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>MASTERY</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Chiplet Architecture Expert!</h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            You understand the economics and engineering of modern chip manufacturing
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
              <li>Yield economics and Poisson statistics</li>
              <li>The reticle limit and why it matters</li>
              <li>Heterogeneous integration across process nodes</li>
              <li>Die-to-die interconnect challenges</li>
              <li>3D stacking benefits</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>The Core Insight</h4>
            <p style={{ color: '#e2e8f0' }}>
              Chiplets transform chip design from a monolithic manufacturing problem into a system integration problem.
              This enables larger, more capable chips while improving yields and reducing costs.
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Complete
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ChipletArchitectureRenderer;
