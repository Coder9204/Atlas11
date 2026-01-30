import React, { useState, useCallback, useEffect } from 'react';

interface EnergyPerTokenRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const EnergyPerTokenRenderer: React.FC<EnergyPerTokenRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [promptTokens, setPromptTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(200);
  const [modelSize, setModelSize] = useState(70); // billions of parameters
  const [gpuPower, setGpuPower] = useState(400); // watts per GPU
  const [numGPUs, setNumGPUs] = useState(8);
  const [throughput, setThroughput] = useState(50); // tokens per second
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation for token generation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGeneratedCount(prev => {
        if (prev >= outputTokens) {
          setIsGenerating(false);
          return 0;
        }
        return prev + Math.ceil(throughput / 10);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isGenerating, outputTokens, throughput]);

  // Calculate energy metrics
  const calculateMetrics = useCallback(() => {
    // Total tokens processed
    const totalTokens = promptTokens + outputTokens;

    // Time calculations
    const prefillTime = promptTokens / (throughput * 10); // prefill is ~10x faster
    const decodeTime = outputTokens / throughput;
    const totalTime = prefillTime + decodeTime;

    // Power consumption
    const totalPower = gpuPower * numGPUs; // watts
    const totalEnergy = totalPower * totalTime / 3600; // watt-hours
    const energyPerToken = (totalEnergy * 1000) / totalTokens; // milliwatt-hours per token

    // CO2 estimate (US average grid: ~0.4 kg CO2 per kWh)
    const co2PerKwh = 0.4;
    const co2Grams = totalEnergy / 1000 * co2PerKwh * 1000;

    // Cost estimate ($0.10 per kWh data center electricity)
    const costPerKwh = 0.10;
    const costCents = totalEnergy / 1000 * costPerKwh * 100;

    // Comparison metrics
    const smartphoneCharges = totalEnergy / 15; // ~15 Wh to charge a phone
    const ledBulbSeconds = totalEnergy * 3600 / 10; // 10W LED bulb
    const googleSearches = totalEnergy / 0.3; // ~0.3 Wh per search (rough estimate)

    return {
      totalTokens,
      totalTime,
      totalPower,
      totalEnergy,
      energyPerToken,
      co2Grams,
      costCents,
      smartphoneCharges,
      ledBulbSeconds,
      googleSearches,
      prefillTime,
      decodeTime,
    };
  }, [promptTokens, outputTokens, modelSize, gpuPower, numGPUs, throughput]);

  const predictions = [
    { id: 'free', label: 'Longer prompts are basically free once the model is loaded' },
    { id: 'linear', label: 'Energy scales linearly with tokens - more words, more joules' },
    { id: 'negligible', label: 'AI energy use is negligible compared to training' },
    { id: 'fixed', label: 'Energy cost is fixed regardless of prompt length' },
  ];

  const twistPredictions = [
    { id: 'verbose_better', label: 'Verbose prompts produce better answers, worth the energy' },
    { id: 'same_quality', label: 'Concise and verbose prompts give identical quality' },
    { id: 'concise_wins', label: 'Concise prompts can achieve same quality at fraction of energy' },
    { id: 'no_control', label: 'Users cannot control energy use anyway' },
  ];

  const transferApplications = [
    {
      title: 'API Pricing Models',
      description: 'OpenAI, Anthropic, and others charge per token for API access.',
      question: 'Why do AI APIs charge per token rather than per request?',
      answer: 'Token count directly correlates with compute time and energy consumption. A 1000-token prompt uses roughly 10x the resources of a 100-token prompt. Per-token pricing aligns costs with actual resource usage, incentivizing efficient prompting.',
    },
    {
      title: 'Data Center Carbon Footprint',
      description: 'AI data centers are becoming significant electricity consumers globally.',
      question: 'How does prompt efficiency affect data center sustainability?',
      answer: 'If every ChatGPT query used 2x more tokens than necessary, global AI energy consumption would roughly double. At scale, prompt efficiency becomes an environmental concern. System prompts that add 1000 tokens to every query consume megawatt-hours daily.',
    },
    {
      title: 'Edge AI vs Cloud AI',
      description: 'Some AI models run locally on phones and laptops instead of cloud servers.',
      question: 'Why might edge AI be more energy-efficient for simple tasks?',
      answer: 'Cloud AI requires network transmission (energy), data center overhead (cooling, infrastructure), and often uses oversized models. A small on-device model for simple tasks avoids these costs. However, complex tasks still benefit from powerful cloud GPUs.',
    },
    {
      title: 'Batch Processing Efficiency',
      description: 'Processing multiple requests together can improve throughput.',
      question: 'How does batching affect energy per token?',
      answer: 'Batching amortizes memory bandwidth costs across requests. Loading model weights once for 8 requests instead of 8 times reduces energy per token. This is why API batch endpoints offer discounts - the compute is genuinely cheaper.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the primary energy cost in LLM inference?',
      options: [
        { text: 'Network transmission', correct: false },
        { text: 'Loading and moving model weights through memory', correct: true },
        { text: 'Storing the conversation history', correct: false },
        { text: 'Compressing the output', correct: false },
      ],
    },
    {
      question: 'If you double the prompt length, energy consumption approximately:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: true },
        { text: 'Quadruples', correct: false },
        { text: 'Decreases', correct: false },
      ],
    },
    {
      question: 'GPU utilization during LLM inference is often limited by:',
      options: [
        { text: 'CPU bottlenecks', correct: false },
        { text: 'Memory bandwidth, not compute capacity', correct: true },
        { text: 'Network latency', correct: false },
        { text: 'Disk read speed', correct: false },
      ],
    },
    {
      question: 'A verbose system prompt repeated on every API call:',
      options: [
        { text: 'Has negligible cost since it is cached', correct: false },
        { text: 'Accumulates significant energy cost at scale', correct: true },
        { text: 'Actually improves efficiency', correct: false },
        { text: 'Is free after the first request', correct: false },
      ],
    },
    {
      question: 'Energy per token is affected by:',
      options: [
        { text: 'Only model size', correct: false },
        { text: 'Model size, GPU power, and throughput efficiency', correct: true },
        { text: 'Only the prompt content', correct: false },
        { text: 'Time of day', correct: false },
      ],
    },
    {
      question: 'The prefill phase (processing input tokens) is faster than decode because:',
      options: [
        { text: 'Input tokens are smaller', correct: false },
        { text: 'Input tokens can be processed in parallel', correct: true },
        { text: 'The model skips some layers', correct: false },
        { text: 'Prefill uses less memory', correct: false },
      ],
    },
    {
      question: 'Compared to a Google search, a ChatGPT query uses approximately:',
      options: [
        { text: '1/10th the energy', correct: false },
        { text: 'About the same energy', correct: false },
        { text: '10-100x more energy', correct: true },
        { text: '1000x more energy', correct: false },
      ],
    },
    {
      question: 'Per-token API pricing encourages users to:',
      options: [
        { text: 'Write longer prompts for better results', correct: false },
        { text: 'Be concise and efficient with prompts', correct: true },
        { text: 'Use more API calls', correct: false },
        { text: 'Ignore cost considerations', correct: false },
      ],
    },
    {
      question: 'Data center Power Usage Effectiveness (PUE) of 1.2 means:',
      options: [
        { text: 'Only 20% of power reaches the GPUs', correct: false },
        { text: 'For every 1W of compute, 0.2W goes to cooling/overhead', correct: true },
        { text: 'The data center is 120% efficient', correct: false },
        { text: '80% of power is wasted', correct: false },
      ],
    },
    {
      question: 'Reducing AI carbon footprint can be achieved by:',
      options: [
        { text: 'Only using smaller models', correct: false },
        { text: 'Efficient prompting, batching, and renewable-powered data centers', correct: true },
        { text: 'Turning off data centers at night', correct: false },
        { text: 'Using more GPUs', correct: false },
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
    const energyBarWidth = Math.min(200, metrics.totalEnergy * 10);
    const tokenProgress = isGenerating ? generatedCount / outputTokens : 0;

    return (
      <svg width="100%" height="480" viewBox="0 0 500 480" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="energyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="480" fill="#0f172a" rx="12" />

        {/* Title */}
        <text x="250" y="30" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
          Energy Per Token Calculator
        </text>

        {/* Token Flow Visualization */}
        <g transform="translate(20, 50)">
          <rect width="220" height="80" fill="rgba(59, 130, 246, 0.1)" rx="8" stroke="#3b82f6" strokeWidth="1" />
          <text x="110" y="20" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">INPUT TOKENS</text>
          <text x="110" y="45" fill="#f8fafc" fontSize="24" fontWeight="bold" textAnchor="middle">{promptTokens.toLocaleString()}</text>
          <text x="110" y="65" fill="#94a3b8" fontSize="10" textAnchor="middle">Prefill: {metrics.prefillTime.toFixed(2)}s</text>
        </g>

        <g transform="translate(260, 50)">
          <rect width="220" height="80" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="#22c55e" strokeWidth="1" />
          <text x="110" y="20" fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="middle">OUTPUT TOKENS</text>
          <text x="110" y="45" fill="#f8fafc" fontSize="24" fontWeight="bold" textAnchor="middle">{outputTokens.toLocaleString()}</text>
          <text x="110" y="65" fill="#94a3b8" fontSize="10" textAnchor="middle">Decode: {metrics.decodeTime.toFixed(2)}s</text>
        </g>

        {/* GPU Power Display */}
        <g transform="translate(20, 145)">
          <rect width="460" height="60" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="15" y="25" fill="#f59e0b" fontSize="11" fontWeight="bold">GPU CLUSTER</text>

          {/* GPU icons */}
          {Array.from({ length: Math.min(numGPUs, 8) }).map((_, i) => (
            <rect
              key={i}
              x={120 + i * 40}
              y={15}
              width="30"
              height="30"
              fill={isGenerating ? '#22c55e' : '#475569'}
              rx="4"
              opacity={isGenerating ? 0.5 + Math.sin(Date.now() / 200 + i) * 0.3 : 0.5}
            />
          ))}

          <text x="15" y="48" fill="#94a3b8" fontSize="10">
            {numGPUs} GPUs × {gpuPower}W = {metrics.totalPower.toLocaleString()}W
          </text>
        </g>

        {/* Energy Meter */}
        <g transform="translate(20, 220)">
          <rect width="460" height="90" fill="rgba(239, 68, 68, 0.1)" rx="8" stroke="#ef4444" strokeWidth="1" />
          <text x="230" y="25" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">ENERGY CONSUMPTION</text>

          {/* Energy bar */}
          <rect x="30" y="40" width="400" height="20" fill="#1e293b" rx="4" />
          <rect x="30" y="40" width={Math.min(400, energyBarWidth * 2)} height="20" fill="url(#energyGrad)" rx="4" />

          <text x="230" y="75" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
            {metrics.totalEnergy.toFixed(2)} Wh ({metrics.energyPerToken.toFixed(3)} mWh/token)
          </text>
        </g>

        {/* Equivalents */}
        <g transform="translate(20, 325)">
          <rect width="220" height="70" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="110" y="20" fill="#94a3b8" fontSize="10" textAnchor="middle">EQUIVALENTS</text>
          <text x="15" y="40" fill="#f8fafc" fontSize="10">Phone charges: {metrics.smartphoneCharges.toFixed(3)}</text>
          <text x="15" y="55" fill="#f8fafc" fontSize="10">LED bulb: {metrics.ledBulbSeconds.toFixed(1)}s</text>
        </g>

        <g transform="translate(260, 325)">
          <rect width="220" height="70" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="110" y="20" fill="#94a3b8" fontSize="10" textAnchor="middle">ENVIRONMENTAL</text>
          <text x="15" y="40" fill="#f8fafc" fontSize="10">CO2: {metrics.co2Grams.toFixed(2)} grams</text>
          <text x="15" y="55" fill="#f8fafc" fontSize="10">Cost: ${(metrics.costCents / 100).toFixed(4)}</text>
        </g>

        {/* Generation Animation */}
        {isGenerating && (
          <g transform="translate(20, 410)">
            <rect width="460" height="40" fill="rgba(34, 197, 94, 0.1)" rx="8" />
            <rect width={460 * tokenProgress} height="40" fill="rgba(34, 197, 94, 0.3)" rx="8" />
            <text x="230" y="25" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">
              Generating: {generatedCount} / {outputTokens} tokens ({(tokenProgress * 100).toFixed(0)}%)
            </text>
          </g>
        )}

        {/* Key Insight */}
        <g transform="translate(20, 460)">
          <text x="230" y="10" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Every token = memory movement = real joules = real cost
          </text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Prompt Tokens: {promptTokens}
          </label>
          <input
            type="range"
            min="50"
            max="4000"
            step="50"
            value={promptTokens}
            onChange={(e) => setPromptTokens(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Output Tokens: {outputTokens}
          </label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={outputTokens}
            onChange={(e) => setOutputTokens(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Model Size: {modelSize}B parameters
          </label>
          <input
            type="range"
            min="7"
            max="175"
            step="1"
            value={modelSize}
            onChange={(e) => setModelSize(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Number of GPUs: {numGPUs}
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={numGPUs}
            onChange={(e) => setNumGPUs(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Throughput: {throughput} tokens/second
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={throughput}
          onChange={(e) => setThroughput(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <button
        onClick={() => { setIsGenerating(true); setGeneratedCount(0); }}
        disabled={isGenerating}
        style={{
          padding: '16px',
          borderRadius: '8px',
          border: 'none',
          background: isGenerating ? '#475569' : '#22c55e',
          color: 'white',
          fontWeight: 'bold',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isGenerating ? 'Generating...' : 'Simulate Generation'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#ef4444', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI Energy</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #ef4444, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Energy Per Token
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
              Does longer prompting cost money even if the answer is "free"?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #ef4444' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              Every token you send to ChatGPT triggers billions of operations on power-hungry GPUs. Even when the API is "free," someone is paying for the electricity. How much energy does your prompt actually consume?
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #ef4444, #22c55e)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Make a Prediction
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
            <p style={{ fontSize: '16px' }}>
              You write a 1000-token prompt instead of a 100-token prompt to ask the same question. How does this affect energy consumption?
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
                  border: prediction === p.id ? '2px solid #ef4444' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
                background: '#ef4444',
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
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Energy Calculator</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            See how token count translates to real energy consumption
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '12px' }}>Try These Experiments:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Set prompt to 100 tokens, then 1000 - compare energy</li>
              <li>Increase model size - watch energy climb</li>
              <li>Reduce GPUs - see how throughput affects total energy</li>
              <li>Note: more tokens = more time = more joules</li>
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
              background: '#ef4444',
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
    const wasCorrect = prediction === 'linear';

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
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p>
              Energy scales roughly linearly with tokens. Each token requires loading model weights from memory and performing computations - there is no free lunch. Prompt bloat directly increases energy and latency.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>The Physics of AI Energy</h3>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Memory Movement Dominates</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                For each token, the GPU must load billions of model parameters from memory. This memory bandwidth is the primary energy cost - not the actual computation. More tokens = more memory movement = more energy.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>Real Numbers</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                A typical ChatGPT query uses 0.001-0.01 kWh (1-10 Wh). That is 10-100x more than a Google search. At billions of queries per day, this adds up to megawatts of power.
              </p>
            </div>

            <div>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Why It Matters</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                AI is projected to consume 3-4% of global electricity by 2030. Prompt efficiency is not just about cost - it is about sustainability. Every unnecessary token has a carbon footprint.
              </p>
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
              background: '#ef4444',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Next: A Twist!
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
          <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: Prompt Efficiency</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>
              Two developers ask the same question. One uses a 100-token prompt, the other uses 1000 tokens with extra context and verbosity. Both get equally good answers.
            </p>
            <p style={{ fontSize: '16px' }}>
              What is the lesson?
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
                  border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
                background: '#f59e0b',
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

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const conciseMetrics = calculateMetrics();
    const verbosePrompt = promptTokens * 5;

    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Concise vs Verbose</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Compare the energy cost of efficient vs bloated prompts
          </p>

          {renderVisualization()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #f59e0b' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Comparison (5x longer prompt):</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ color: '#22c55e', fontWeight: 'bold' }}>Concise ({promptTokens} tokens)</p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Energy: {conciseMetrics.totalEnergy.toFixed(3)} Wh</p>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Verbose ({verbosePrompt} tokens)</p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Energy: ~{(conciseMetrics.totalEnergy * 4).toFixed(3)} Wh</p>
              </div>
            </div>
            <p style={{ color: '#f8fafc', marginTop: '12px', fontSize: '14px' }}>
              Same answer quality, 4x the energy cost. At scale, this matters!
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
              background: '#f59e0b',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            See the Explanation
          </button>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'concise_wins';

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
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p>
              Concise prompts can often achieve the same quality at a fraction of the energy cost. Prompt engineering is not just about getting better answers - it is about efficiency. Clear, direct prompts waste less energy.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Efficient Prompting Tips</h3>
            <ul style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Be direct - state what you need clearly</li>
              <li>Avoid unnecessary filler words and context</li>
              <li>Use system prompts wisely - they are repeated every call</li>
              <li>Trim examples to minimum needed for quality</li>
              <li>Consider smaller models for simple tasks</li>
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
            Apply This Knowledge
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
            Energy per token affects pricing, sustainability, and system design
          </p>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #475569',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#f8fafc' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>Complete</span>}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#ef4444', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: 'transparent',
                    color: '#ef4444',
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

          <button
            onClick={onPhaseComplete}
            disabled={transferCompleted.size < 4}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: transferCompleted.size >= 4 ? '#ef4444' : '#475569',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: transferCompleted.size >= 4 ? 'pointer' : 'not-allowed',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {transferCompleted.size >= 4 ? 'Take the Test' : `Complete ${4 - transferCompleted.size} more applications`}
          </button>
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
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#94a3b8',
                    }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}

            <button
              onClick={onPhaseComplete}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: testScore >= 8 ? '#22c55e' : '#ef4444',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'}
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
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
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
                  background: testAnswers[i] !== null ? '#ef4444' : i === currentTestQuestion ? '#94a3b8' : '#475569',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px' }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #ef4444' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
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

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
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
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            You understand the physics of AI energy consumption
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Every token costs real energy (memory movement)</li>
              <li>Energy scales linearly with token count</li>
              <li>Prompt efficiency reduces cost and carbon</li>
              <li>Per-token pricing reflects physical costs</li>
              <li>AI energy is a growing sustainability concern</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>Your Impact:</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
              By understanding energy per token, you can write efficient prompts that achieve the same results with less environmental impact. At scale, this matters for the planet.
            </p>
          </div>

          <button
            onClick={onPhaseComplete}
            style={{
              marginTop: '24px',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #ef4444, #22c55e)',
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

export default EnergyPerTokenRenderer;
