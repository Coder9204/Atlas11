import React, { useState, useEffect, useCallback } from 'react';

interface TPUvsGPURendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const TPUvsGPURenderer: React.FC<TPUvsGPURendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [batchSize, setBatchSize] = useState(32);
  const [modelSize, setModelSize] = useState(50); // percentage of max
  const [operationType, setOperationType] = useState<'matmul' | 'conv' | 'attention'>('matmul');
  const [showSystolicFlow, setShowSystolicFlow] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation for systolic array
  useEffect(() => {
    if (!showSystolicFlow) return;
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 8);
    }, 300);
    return () => clearInterval(interval);
  }, [showSystolicFlow]);

  // Calculate performance metrics
  const calculatePerformance = useCallback(() => {
    // TPU excels at large batch matrix operations
    const tpuMatmulEfficiency = Math.min(0.95, 0.4 + (batchSize / 64) * 0.55);
    const gpuMatmulEfficiency = Math.min(0.85, 0.6 + (batchSize / 128) * 0.25);

    // GPU better at irregular operations
    const tpuFlexibility = 0.5;
    const gpuFlexibility = 0.9;

    // Power efficiency (TPU better for sustained workloads)
    const tpuPowerEfficiency = 0.85;
    const gpuPowerEfficiency = 0.65;

    // Operation-specific adjustments
    let tpuBonus = 1.0;
    let gpuBonus = 1.0;

    if (operationType === 'matmul') {
      tpuBonus = 1.3; // TPU systolic array excels
    } else if (operationType === 'conv') {
      tpuBonus = 1.2;
      gpuBonus = 1.1;
    } else if (operationType === 'attention') {
      tpuBonus = 1.15;
      gpuBonus = 1.05;
    }

    const tpuThroughput = tpuMatmulEfficiency * tpuBonus * (modelSize / 50) * 100;
    const gpuThroughput = gpuMatmulEfficiency * gpuBonus * (modelSize / 50) * 85;

    return {
      tpuThroughput: Math.min(150, tpuThroughput),
      gpuThroughput: Math.min(120, gpuThroughput),
      tpuEfficiency: tpuMatmulEfficiency * 100,
      gpuEfficiency: gpuMatmulEfficiency * 100,
      tpuPower: tpuPowerEfficiency * 100,
      gpuPower: gpuPowerEfficiency * 100,
    };
  }, [batchSize, modelSize, operationType]);

  const predictions = [
    { id: 'speed', label: 'GPUs are faster at everything - that\'s why gamers use them' },
    { id: 'matrix', label: 'TPUs are optimized for matrix operations with specialized hardware' },
    { id: 'same', label: 'They perform identically - it\'s just marketing' },
    { id: 'memory', label: 'The only difference is memory capacity' },
  ];

  const twistPredictions = [
    { id: 'always_tpu', label: 'Always use TPU - it\'s purpose-built for AI' },
    { id: 'depends', label: 'It depends on the workload - different architectures suit different tasks' },
    { id: 'always_gpu', label: 'Always use GPU - it\'s more flexible' },
    { id: 'cost', label: 'Just use whatever is cheaper' },
  ];

  const transferApplications = [
    {
      title: 'Large Language Model Training',
      description: 'Training models like GPT requires massive matrix multiplications across billions of parameters.',
      question: 'Why do companies like Google prefer TPUs for training large language models?',
      answer: 'TPUs systolic arrays can perform matrix multiplications extremely efficiently at scale. The regular, predictable nature of transformer attention operations maps perfectly to TPU architecture, achieving higher throughput per watt.',
    },
    {
      title: 'Real-time Gaming AI',
      description: 'Game AI needs to respond instantly to player actions with varied computational patterns.',
      question: 'Why do game engines typically use GPUs rather than TPUs for AI?',
      answer: 'Gaming AI requires flexibility - pathfinding, physics, rendering, and AI decisions all have different computational patterns. GPUs CUDA cores can handle this variety, while TPUs are optimized for batch matrix operations.',
    },
    {
      title: 'Autonomous Vehicle Perception',
      description: 'Self-driving cars process camera, lidar, and radar data in real-time.',
      question: 'What architecture considerations matter for autonomous vehicle AI chips?',
      answer: 'Low latency is critical - specialized chips like Tesla FSD use a hybrid approach with matrix engines for neural networks plus flexible cores for decision logic. Power efficiency matters since vehicles have limited power budgets.',
    },
    {
      title: 'Cloud AI Inference',
      description: 'Cloud providers serve millions of AI inference requests per second.',
      question: 'How do cloud providers choose between TPU and GPU for inference?',
      answer: 'Batch size matters hugely. High-traffic services can batch requests to fill TPU systolic arrays efficiently. Low-latency single requests often use GPUs. Cost per inference varies based on utilization.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the key architectural difference between TPUs and GPUs?',
      options: [
        { text: 'TPUs have more memory', correct: false },
        { text: 'TPUs use systolic arrays optimized for matrix operations', correct: true },
        { text: 'GPUs are newer technology', correct: false },
        { text: 'TPUs can only do inference, not training', correct: false },
      ],
    },
    {
      question: 'A systolic array processes data by:',
      options: [
        { text: 'Randomly accessing memory locations', correct: false },
        { text: 'Flowing data through a grid of processing elements in a rhythmic pattern', correct: true },
        { text: 'Using a single powerful processor', correct: false },
        { text: 'Compressing data before processing', correct: false },
      ],
    },
    {
      question: 'Why does batch size significantly affect TPU performance?',
      options: [
        { text: 'Larger batches use more memory', correct: false },
        { text: 'Larger batches better utilize the systolic array parallelism', correct: true },
        { text: 'TPUs can only process one batch at a time', correct: false },
        { text: 'Batch size affects cooling requirements', correct: false },
      ],
    },
    {
      question: 'CUDA cores in GPUs are designed for:',
      options: [
        { text: 'Only graphics rendering', correct: false },
        { text: 'Flexible parallel computation across many independent threads', correct: true },
        { text: 'Sequential processing of large matrices', correct: false },
        { text: 'Network communication only', correct: false },
      ],
    },
    {
      question: 'For training a large transformer model, TPUs excel because:',
      options: [
        { text: 'Transformers use attention which involves massive matrix multiplications', correct: true },
        { text: 'TPUs have better graphics capabilities', correct: false },
        { text: 'Transformers require random memory access patterns', correct: false },
        { text: 'TPUs are always cheaper', correct: false },
      ],
    },
    {
      question: 'What workload would likely perform WORSE on a TPU compared to GPU?',
      options: [
        { text: 'Matrix multiplication', correct: false },
        { text: 'Large batch inference', correct: false },
        { text: 'Irregular branching algorithms with varied data access', correct: true },
        { text: 'Convolution operations', correct: false },
      ],
    },
    {
      question: 'The term "systolic" in systolic array refers to:',
      options: [
        { text: 'The chip manufacturing process', correct: false },
        { text: 'The rhythmic, pulsing flow of data like a heartbeat', correct: true },
        { text: 'The cooling system design', correct: false },
        { text: 'The power consumption pattern', correct: false },
      ],
    },
    {
      question: 'TPU power efficiency advantage comes from:',
      options: [
        { text: 'Using less silicon', correct: false },
        { text: 'Specialized circuits that avoid general-purpose overhead', correct: true },
        { text: 'Running at lower clock speeds', correct: false },
        { text: 'Having fewer processing units', correct: false },
      ],
    },
    {
      question: 'When would you choose GPU over TPU for AI inference?',
      options: [
        { text: 'When processing large batches of similar requests', correct: false },
        { text: 'When low latency for single requests matters more than throughput', correct: true },
        { text: 'When doing only matrix multiplication', correct: false },
        { text: 'When power consumption is not a concern', correct: false },
      ],
    },
    {
      question: 'Google developed TPUs primarily because:',
      options: [
        { text: 'GPUs were too expensive', correct: false },
        { text: 'Existing hardware was inefficient for their specific AI workloads', correct: true },
        { text: 'They wanted to compete with NVIDIA in gaming', correct: false },
        { text: 'TPUs are easier to manufacture', correct: false },
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
    const perf = calculatePerformance();

    return (
      <svg width="100%" height="400" viewBox="0 0 500 400" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="tpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="400" fill="#0f172a" rx="12" />

        {/* TPU Section */}
        <text x="125" y="30" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">TPU (Systolic Array)</text>

        {/* Systolic Array Grid */}
        <g transform="translate(50, 50)">
          {[0, 1, 2, 3].map(row =>
            [0, 1, 2, 3].map(col => {
              const isActive = showSystolicFlow && ((row + col) % 4 === animationStep % 4);
              return (
                <rect
                  key={`cell-${row}-${col}`}
                  x={col * 35}
                  y={row * 35}
                  width="30"
                  height="30"
                  fill={isActive ? '#60a5fa' : '#1e40af'}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  rx="4"
                />
              );
            })
          )}
          {/* Data flow arrows */}
          {showSystolicFlow && (
            <>
              <path d="M-10,15 L-10,125" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.7" />
              <path d="M15,-10 L135,-10" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.7" />
              <text x="-15" y="70" fill="#94a3b8" fontSize="8" textAnchor="end">Input A</text>
              <text x="70" y="-15" fill="#94a3b8" fontSize="8" textAnchor="middle">Input B</text>
            </>
          )}
        </g>

        {/* GPU Section */}
        <text x="375" y="30" fill="#22c55e" fontSize="16" fontWeight="bold" textAnchor="middle">GPU (CUDA Cores)</text>

        {/* CUDA Cores Grid (more irregular) */}
        <g transform="translate(300, 50)">
          {[0, 1, 2, 3, 4, 5].map(row =>
            [0, 1, 2, 3, 4, 5].map(col => {
              const isActive = Math.random() > 0.3;
              return (
                <circle
                  key={`core-${row}-${col}`}
                  cx={col * 25 + 10}
                  cy={row * 25 + 10}
                  r="8"
                  fill={isActive ? '#4ade80' : '#166534'}
                  opacity={isActive ? 1 : 0.5}
                />
              );
            })
          )}
        </g>

        {/* Performance Comparison */}
        <g transform="translate(50, 250)">
          <text x="0" y="0" fill="#f8fafc" fontSize="12" fontWeight="bold">Throughput (TFLOPS)</text>

          {/* TPU Bar */}
          <rect x="0" y="15" width={perf.tpuThroughput * 2} height="25" fill="url(#tpuGrad)" rx="4" />
          <text x={perf.tpuThroughput * 2 + 10} y="32" fill="#3b82f6" fontSize="12">{perf.tpuThroughput.toFixed(1)}</text>

          {/* GPU Bar */}
          <rect x="0" y="50" width={perf.gpuThroughput * 2} height="25" fill="url(#gpuGrad)" rx="4" />
          <text x={perf.gpuThroughput * 2 + 10} y="67" fill="#22c55e" fontSize="12">{perf.gpuThroughput.toFixed(1)}</text>

          <text x="0" y="100" fill="#f8fafc" fontSize="12" fontWeight="bold">Efficiency</text>

          {/* Efficiency indicators */}
          <text x="0" y="120" fill="#3b82f6" fontSize="11">TPU: {perf.tpuEfficiency.toFixed(0)}%</text>
          <text x="100" y="120" fill="#22c55e" fontSize="11">GPU: {perf.gpuEfficiency.toFixed(0)}%</text>
        </g>

        {/* Legend */}
        <g transform="translate(300, 280)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">Batch Size: {batchSize}</text>
          <text x="0" y="20" fill="#94a3b8" fontSize="10">Model Size: {modelSize}%</text>
          <text x="0" y="40" fill="#94a3b8" fontSize="10">Operation: {operationType}</text>
        </g>

        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Batch Size: {batchSize}
        </label>
        <input
          type="range"
          min="1"
          max="128"
          step="1"
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Operation Type:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['matmul', 'conv', 'attention'] as const).map(op => (
            <button
              key={op}
              onClick={() => setOperationType(op)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: operationType === op ? '2px solid #3b82f6' : '1px solid #475569',
                background: operationType === op ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {op === 'matmul' ? 'Matrix Mult' : op === 'conv' ? 'Convolution' : 'Attention'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowSystolicFlow(!showSystolicFlow)}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: showSystolicFlow ? '#ef4444' : '#3b82f6',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showSystolicFlow ? 'Stop Animation' : 'Show Systolic Flow'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#3b82f6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Hardware Architecture</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TPU vs GPU Architecture
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
              Why did Google build their own AI chips instead of using GPUs?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              When Google needed to run AI at massive scale, they found that general-purpose GPUs weren't efficient enough.
              So they designed a completely new type of chip: the Tensor Processing Unit (TPU).
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
              But what makes TPUs different? And when should you use each?
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Explore the Difference
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
              Google's TPU and NVIDIA's GPU both process AI workloads. What's the fundamental difference?
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
                  border: prediction === p.id ? '2px solid #3b82f6' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
                background: '#3b82f6',
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
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Compare TPU and GPU Performance</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Adjust parameters to see how each architecture performs
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>Key Observations:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>TPU throughput increases dramatically with batch size</li>
              <li>GPU maintains more consistent performance across batch sizes</li>
              <li>Matrix multiplication strongly favors TPU's systolic array</li>
              <li>Watch the data flow in the systolic array animation</li>
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
              background: '#3b82f6',
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
    const wasCorrect = prediction === 'matrix';

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
              {wasCorrect ? 'Correct!' : 'Not quite!'}
            </h3>
            <p>TPUs use systolic arrays - specialized hardware designed specifically for matrix operations that are common in neural networks.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>The Systolic Array</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>What it is:</strong> A grid of processing elements where data flows rhythmically (like a heartbeat - hence "systolic") through the array.
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>Why it's efficient:</strong> Data is reused as it flows through. Each element performs a multiply-accumulate, passing results to neighbors. This minimizes memory access - the biggest energy cost in computing.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>The tradeoff:</strong> Works beautifully for regular matrix operations but struggles with irregular data access patterns.
            </p>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>GPU CUDA Cores</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px' }}>
              <strong>What they are:</strong> Thousands of small, flexible processors that can each run independent code threads.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>Why they're flexible:</strong> Each core can do different operations, access arbitrary memory, and handle branching logic. Great for graphics and varied AI workloads.
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
              background: '#8b5cf6',
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
              Different AI workloads have very different computational patterns. A chatbot processes one request at a time with low latency needs.
              A training job processes millions of examples in batches.
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
              So which architecture should you choose?
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
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Workload Matching</h2>

          {renderVisualization()}
          {renderControls()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>TPU Excels At:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Large batch training</li>
                <li>Matrix-heavy models</li>
                <li>Transformer attention</li>
                <li>High throughput needs</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>GPU Excels At:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Low-latency inference</li>
                <li>Varied workloads</li>
                <li>Small batch sizes</li>
                <li>Irregular algorithms</li>
              </ul>
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
    const wasCorrect = twistPrediction === 'depends';

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
            <p>There's no universally "best" architecture. The right choice depends entirely on your specific workload characteristics!</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Decision Framework</h3>
            <div style={{ lineHeight: 1.8 }}>
              <p><strong style={{ color: '#3b82f6' }}>Choose TPU when:</strong></p>
              <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                <li>Training large models with big batches</li>
                <li>Workload is matrix-multiplication heavy</li>
                <li>Throughput matters more than latency</li>
                <li>Power efficiency is critical</li>
              </ul>

              <p><strong style={{ color: '#22c55e' }}>Choose GPU when:</strong></p>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Need low latency for individual requests</li>
                <li>Workload has irregular patterns</li>
                <li>Running varied AI models</li>
                <li>Need flexibility for experimentation</li>
              </ul>
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
              background: '#f59e0b',
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
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: 'transparent',
                    color: '#3b82f6',
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
                {testScore >= 8 ? 'You\'ve mastered AI hardware architecture!' : 'Review the concepts and try again.'}
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
                  background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#64748b' : '#1e293b',
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
                  border: testAnswers[currentTestQuestion] === i ? '2px solid #3b82f6' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === i ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
                  background: '#3b82f6',
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
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>AI Hardware Architecture Master!</h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            You understand the fundamental differences between TPU and GPU architectures
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
              <li>Systolic arrays and rhythmic data flow</li>
              <li>CUDA cores and parallel flexibility</li>
              <li>Batch size impact on efficiency</li>
              <li>Workload-architecture matching</li>
              <li>Power efficiency tradeoffs</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>The Core Insight</h4>
            <p style={{ color: '#e2e8f0' }}>
              Specialized hardware can dramatically outperform general-purpose processors for specific tasks,
              but flexibility has value too. The best choice depends on your workload characteristics.
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

export default TPUvsGPURenderer;
