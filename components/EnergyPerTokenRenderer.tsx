import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

type EnergyPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface EnergyPerTokenRendererProps {
  gamePhase?: EnergyPhase;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const phaseOrder: EnergyPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<EnergyPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Learn',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Master'
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
};

const EnergyPerTokenRenderer: React.FC<EnergyPerTokenRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const getInitialPhase = (): EnergyPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<EnergyPhase>(getInitialPhase);
  const lastPhaseChangeRef = useRef<number>(0);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not available
    }
  };

  const goToPhase = useCallback((newPhase: EnergyPhase) => {
    const now = Date.now();
    if (now - lastPhaseChangeRef.current < 300) return;
    lastPhaseChangeRef.current = now;
    playSound();
    setPhase(newPhase);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [promptTokens, setPromptTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(200);
  const [modelSize, setModelSize] = useState(70);
  const [gpuPower, setGpuPower] = useState(400);
  const [numGPUs, setNumGPUs] = useState(8);
  const [throughput, setThroughput] = useState(50);
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

  const calculateMetrics = useCallback(() => {
    const totalTokens = promptTokens + outputTokens;
    const prefillTime = promptTokens / (throughput * 10);
    const decodeTime = outputTokens / throughput;
    const totalTime = prefillTime + decodeTime;
    const totalPower = gpuPower * numGPUs;
    const totalEnergy = totalPower * totalTime / 3600;
    const energyPerToken = (totalEnergy * 1000) / totalTokens;
    const co2PerKwh = 0.4;
    const co2Grams = totalEnergy / 1000 * co2PerKwh * 1000;
    const costPerKwh = 0.10;
    const costCents = totalEnergy / 1000 * costPerKwh * 100;
    const smartphoneCharges = totalEnergy / 15;
    const ledBulbSeconds = totalEnergy * 3600 / 10;
    const googleSearches = totalEnergy / 0.3;

    return {
      totalTokens, totalTime, totalPower, totalEnergy, energyPerToken,
      co2Grams, costCents, smartphoneCharges, ledBulbSeconds, googleSearches,
      prefillTime, decodeTime,
    };
  }, [promptTokens, outputTokens, modelSize, gpuPower, numGPUs, throughput]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      description: 'OpenAI, Anthropic, and Google charge per token for API access. A typical GPT-4 API call processes 500-2000 tokens at $0.03-0.06 per 1000 tokens. At 100 billion tokens per day globally, the electricity cost alone exceeds $10 million daily.',
      question: 'Why do AI APIs charge per token rather than per request?',
      answer: 'Token count directly correlates with compute time and energy consumption. A 1000-token prompt uses roughly 10x the resources of a 100-token prompt. Per-token pricing aligns costs with actual resource usage, incentivizing efficient prompting. This is why OpenAI charges $0.03/1K input tokens and $0.06/1K output tokens for GPT-4.',
    },
    {
      title: 'Data Center Carbon Footprint',
      description: 'Microsoft, Google, and Amazon operate AI data centers consuming 500MW-1GW each. AI workloads account for 15-25% of total data center electricity globally. The International Energy Agency projects AI will consume 4.5% of global electricity by 2030.',
      question: 'How does prompt efficiency affect data center sustainability?',
      answer: 'If every ChatGPT query used 2x more tokens than necessary, global AI energy consumption would roughly double. At scale, prompt efficiency becomes an environmental concern. System prompts that add 1000 tokens to every query consume megawatt-hours daily across millions of users.',
    },
    {
      title: 'Edge AI vs Cloud AI',
      description: 'Apple, Qualcomm, and Google now run AI models locally on phones consuming 1-5W versus cloud GPUs at 300-700W. The Apple Neural Engine processes 15.8 trillion operations per second at just 8W total chip power.',
      question: 'Why might edge AI be more energy-efficient for simple tasks?',
      answer: 'Cloud AI requires network transmission energy, data center overhead for cooling and infrastructure, and often uses oversized models. A small on-device model for simple tasks avoids these costs entirely. The Apple A17 Pro processes Siri requests locally using 100x less energy than sending them to cloud GPUs.',
    },
    {
      title: 'Batch Processing Efficiency',
      description: 'NVIDIA H100 GPUs process batched requests at 3000 tokens/second versus 60 tokens/second for single requests. Companies like Together AI and Anyscale offer 50-70% API discounts for batched workloads because the compute is genuinely cheaper.',
      question: 'How does batching affect energy per token?',
      answer: 'Batching amortizes memory bandwidth costs across requests. Loading model weights once for 8 requests instead of 8 separate times reduces energy per token by approximately 5-8x. This is why batch API endpoints offer significant discounts - the underlying compute uses far less energy per token processed.',
    },
  ];

  const testQuestions = [
    {
      scenario: 'A data center operates 10,000 NVIDIA H100 GPUs at 700W each, processing 50 million ChatGPT queries daily.',
      question: 'What is the primary energy cost in LLM inference?',
      options: [
        { text: 'Network transmission between servers', correct: false },
        { text: 'Loading and moving model weights through memory', correct: true },
        { text: 'Storing the conversation history on disk', correct: false },
        { text: 'Compressing the output before sending', correct: false },
      ],
    },
    {
      scenario: 'An engineer optimizes a system prompt from 2000 tokens down to 500 tokens. The API processes 10 million requests per day.',
      question: 'If you double the prompt length, energy consumption approximately:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: true },
        { text: 'Quadruples', correct: false },
        { text: 'Decreases', correct: false },
      ],
    },
    {
      scenario: 'An NVIDIA H100 has 80GB HBM3 memory with 3.35 TB/s bandwidth. A 70B parameter model requires loading 140GB of weights per forward pass.',
      question: 'GPU utilization during LLM inference is often limited by:',
      options: [
        { text: 'CPU bottlenecks from preprocessing', correct: false },
        { text: 'Memory bandwidth, not compute capacity', correct: true },
        { text: 'Network latency between data centers', correct: false },
        { text: 'Disk read speed for model loading', correct: false },
      ],
    },
    {
      scenario: 'A company deploys a chatbot with a 1500-token system prompt. The bot handles 5 million conversations per day across 200 GPU servers.',
      question: 'A verbose system prompt repeated on every API call:',
      options: [
        { text: 'Has negligible cost since it is cached', correct: false },
        { text: 'Accumulates significant energy cost at scale', correct: true },
        { text: 'Actually improves inference efficiency', correct: false },
        { text: 'Is free after the first request', correct: false },
      ],
    },
    {
      scenario: 'Comparing a 7B parameter model on a single A100 GPU at 300W versus a 175B model across 8 H100 GPUs at 700W each.',
      question: 'Energy per token is affected by:',
      options: [
        { text: 'Only model size in parameters', correct: false },
        { text: 'Model size, GPU power, and throughput efficiency', correct: true },
        { text: 'Only the prompt content and language', correct: false },
        { text: 'Time of day and server location', correct: false },
      ],
    },
    {
      scenario: 'A 1000-token prompt takes 20ms for prefill but generating 500 output tokens takes 10 seconds at 50 tokens/second.',
      question: 'The prefill phase (processing input tokens) is faster than decode because:',
      options: [
        { text: 'Input tokens are physically smaller in memory', correct: false },
        { text: 'Input tokens can be processed in parallel', correct: true },
        { text: 'The model skips attention layers during prefill', correct: false },
        { text: 'Prefill uses dedicated low-power circuits', correct: false },
      ],
    },
    {
      scenario: 'A Google search uses approximately 0.3 Wh of energy. A ChatGPT query with 500 input and 200 output tokens uses roughly 3-10 Wh.',
      question: 'Compared to a Google search, a ChatGPT query uses approximately:',
      options: [
        { text: '1/10th the energy', correct: false },
        { text: 'About the same energy', correct: false },
        { text: '10-100x more energy', correct: true },
        { text: '1000x more energy', correct: false },
      ],
    },
    {
      scenario: 'OpenAI charges $0.03 per 1000 input tokens and $0.06 per 1000 output tokens. A developer can achieve the same result with 200 or 2000 tokens.',
      question: 'Per-token API pricing encourages users to:',
      options: [
        { text: 'Write longer prompts for better results', correct: false },
        { text: 'Be concise and efficient with prompts', correct: true },
        { text: 'Use more API calls with shorter prompts', correct: false },
        { text: 'Ignore cost considerations entirely', correct: false },
      ],
    },
    {
      scenario: 'A hyperscale data center consumes 100MW total but only 83MW reaches the GPUs. The rest goes to cooling, networking, and lighting.',
      question: 'Data center Power Usage Effectiveness (PUE) of 1.2 means:',
      options: [
        { text: 'Only 20% of power reaches the GPUs', correct: false },
        { text: 'For every 1W of compute, 0.2W goes to cooling/overhead', correct: true },
        { text: 'The data center is 120% efficient', correct: false },
        { text: '80% of power is wasted as heat', correct: false },
      ],
    },
    {
      scenario: 'Microsoft has committed to being carbon negative by 2030. Their AI data centers in Sweden run on 100% renewable hydroelectric power.',
      question: 'Reducing AI carbon footprint can be achieved by:',
      options: [
        { text: 'Only using smaller models under 10B parameters', correct: false },
        { text: 'Efficient prompting, batching, and renewable-powered data centers', correct: true },
        { text: 'Turning off data centers during nighttime hours', correct: false },
        { text: 'Using more GPUs to finish faster', correct: false },
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

  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        flexWrap: 'wrap'
      }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: index === currentIndex
                ? '#ef4444'
                : index < currentIndex
                  ? '#22c55e'
                  : '#475569',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  };

  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#0f172a',
        borderTop: '1px solid #334155',
        boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            minHeight: '48px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: isFirst ? '#475569' : '#f8fafc',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back
        </button>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
          {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '12px 24px',
            minHeight: '48px',
            borderRadius: '8px',
            border: 'none',
            background: isLast ? '#475569' : '#ef4444',
            color: 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Next
        </button>
      </div>
    );
  };

  const renderPhaseContent = (content: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px', paddingTop: '48px', paddingBottom: '16px' }}>
        {content}
      </div>
      {renderBottomBar()}
    </div>
  );

  const renderVisualization = () => {
    const metrics = calculateMetrics();
    const energyBarWidth = Math.min(400, metrics.totalEnergy * 20);
    const tokenProgress = isGenerating ? generatedCount / outputTokens : 0;
    const efficiencyPercent = Math.max(0, Math.min(100, 100 - (metrics.energyPerToken * 50)));

    // Build energy curve data points
    const curvePoints: string[] = [];
    const svgW = 460;
    const graphH = 140;
    const graphY = 135;

    // Calculate max energy for normalization (at max tokens)
    const maxTokens = 4000;
    const maxTime = maxTokens / (throughput * 10) + outputTokens / throughput;
    const maxEnergy = gpuPower * numGPUs * maxTime / 3600;
    const minTokens = 50;
    const minTime = minTokens / (throughput * 10) + outputTokens / throughput;
    const minEnergy = gpuPower * numGPUs * minTime / 3600;
    const energyRange = maxEnergy - minEnergy || 0.001;

    for (let i = 0; i <= 10; i++) {
      const frac = i / 10;
      const tokens = 50 + frac * 3950;
      const tTime = tokens / (throughput * 10) + outputTokens / throughput;
      const tEnergy = (gpuPower * numGPUs * tTime / 3600);
      const x = 30 + frac * (svgW - 60);
      const normalizedEnergy = (tEnergy - minEnergy) / energyRange;
      const y = graphY + graphH - normalizedEnergy * graphH;
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');

    // Interactive point position
    const ptFrac = (promptTokens - 50) / 3950;
    const ptX = 30 + ptFrac * (svgW - 60);
    const ptNormalized = (metrics.totalEnergy - minEnergy) / energyRange;
    const ptY = graphY + graphH - ptNormalized * graphH;

    return (
      <div>
        <svg width="100%" height="480" viewBox="0 0 500 480" style={{ maxWidth: '600px' }}>
          <defs>
            <linearGradient id="eptEnergyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="eptInputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="eptOutputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="eptGpuHeatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="eptCurveGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="500" height="480" fill="#0f172a" rx="12" />

          {/* Token Input box */}
          <g className="input-tokens">
            <rect x="20" y="20" width="210" height="65" fill="rgba(59,130,246,0.1)" rx="8" stroke="url(#eptInputGradient)" strokeWidth="2" />
            <text x="125" y="42" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">INPUT TOKENS</text>
            <text x="125" y="62" textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="bold">{promptTokens}</text>
            <text x="125" y="80" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Prefill: {metrics.prefillTime.toFixed(2)}s</text>
          </g>

          {/* Token Output box */}
          <g className="output-tokens">
            <rect x="270" y="20" width="210" height="65" fill="rgba(34,197,94,0.1)" rx="8" stroke="url(#eptOutputGradient)" strokeWidth="2" />
            <text x="375" y="42" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">OUTPUT TOKENS</text>
            <text x="375" y="62" textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="bold">{outputTokens}</text>
            <text x="375" y="80" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Decode: {metrics.decodeTime.toFixed(2)}s</text>
          </g>

          {/* Arrow between boxes */}
          <g className="arrow">
            <line x1="232" y1="52" x2="268" y2="52" stroke="#06b6d4" strokeWidth="2" />
            <polygon points="268,52 262,48 262,56" fill="#06b6d4" />
          </g>

          {/* GPU cluster */}
          <g className="gpu-cluster">
            <rect x="20" y="95" width="460" height="35" fill="rgba(30,41,59,0.9)" rx="6" stroke="#475569" strokeWidth="1" />
            <text x="35" y="117" fill="#f59e0b" fontSize="11" fontWeight="bold">{numGPUs} GPUs x {gpuPower}W = {metrics.totalPower}W</text>
            {Array.from({ length: Math.min(numGPUs, 8) }).map((_, i) => (
              <rect key={`gpu${i}`} x={270 + i * 26} y={101} width="22" height="22" fill={isGenerating ? '#22c55e' : '#475569'} rx="3" />
            ))}
          </g>

          {/* Energy vs Tokens Graph */}
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line
              key={`hgrid${i}`}
              x1="30"
              y1={graphY + graphH * (1 - frac)}
              x2={svgW + 10}
              y2={graphY + graphH * (1 - frac)}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line
              key={`vgrid${i}`}
              x1={30 + frac * (svgW - 60)}
              y1={graphY}
              x2={30 + frac * (svgW - 60)}
              y2={graphY + graphH}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}

          {/* Axes */}
          <line x1="30" y1={graphY} x2="30" y2={graphY + graphH} stroke="#94a3b8" strokeWidth="1" />
          <line x1="30" y1={graphY + graphH} x2={svgW + 10} y2={graphY + graphH} stroke="#94a3b8" strokeWidth="1" />

          {/* Axis labels */}
          <text x="12" y={graphY + graphH / 2} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11" transform={`rotate(-90, 12, ${graphY + graphH / 2})`}>Energy (Wh)</text>
          <text x={svgW / 2} y={graphY + graphH + 13} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Prompt Tokens</text>

          {/* Fill area under curve */}
          <path d={`${curvePath} L ${(30 + (svgW - 60)).toFixed(1)} ${(graphY + graphH).toFixed(1)} L 30 ${(graphY + graphH).toFixed(1)} Z`} fill="url(#eptCurveGradient)" />

          {/* Energy curve */}
          <path d={curvePath} fill="none" stroke="#ef4444" strokeWidth="2.5" />

          {/* Interactive point */}
          <circle cx={ptX} cy={ptY} r={8} fill="#ef4444" filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          <text x={ptX} y={ptY - 14} textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">{metrics.totalEnergy.toFixed(3)} Wh</text>

          {/* Energy summary bar */}
          <rect x="20" y="300" width="460" height="45" fill="rgba(239,68,68,0.05)" rx="8" stroke="rgba(239,68,68,0.3)" strokeWidth="1" />
          <text x="250" y="315" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">ENERGY CONSUMPTION</text>
          <rect x="35" y="322" width="430" height="14" fill="#1e293b" rx="4" />
          <rect x="37" y="324" width={Math.max(0, Math.min(426, energyBarWidth * 1.06))} height="10" fill="url(#eptEnergyGradient)" rx="3" />
          <text x="250" y="344" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">{metrics.energyPerToken.toFixed(3)} mWh/token</text>

          {/* Equivalents - left */}
          <rect x="20" y="355" width="220" height="55" fill="rgba(30,41,59,0.9)" rx="8" stroke="#475569" strokeWidth="1" />
          <text x="130" y="371" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">COMPARISONS</text>
          <text x="130" y="387" textAnchor="middle" fill="#f8fafc" fontSize="11">Phone charges: {metrics.smartphoneCharges.toFixed(4)}</text>
          <text x="130" y="402" textAnchor="middle" fill="#f8fafc" fontSize="11">LED bulb: {metrics.ledBulbSeconds.toFixed(1)}s</text>

          {/* Equivalents - right */}
          <rect x="260" y="355" width="220" height="55" fill="rgba(30,41,59,0.9)" rx="8" stroke="#475569" strokeWidth="1" />
          <text x="370" y="371" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">ENVIRONMENTAL</text>
          <text x="370" y="387" textAnchor="middle" fill="#f8fafc" fontSize="11">CO2: {metrics.co2Grams.toFixed(3)}g</text>
          <text x="370" y="402" textAnchor="middle" fill="#f8fafc" fontSize="11">Cost: ${(metrics.costCents / 100).toFixed(5)}</text>

          {/* Token generation progress */}
          {isGenerating && (
            <>
              <rect x="20" y="420" width="460" height="30" fill="rgba(34,197,94,0.1)" rx="6" stroke="rgba(34,197,94,0.4)" strokeWidth="1" />
              <rect x="30" y="428" width="440" height="14" fill="#1e293b" rx="4" />
              <rect x="32" y="430" width={Math.max(0, 436 * tokenProgress)} height="10" fill="url(#eptOutputGradient)" rx="3" />
            </>
          )}

          {/* Formula */}
          <text x="250" y="465" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12" fontStyle="italic">
            Energy = Power x Time = (GPUs x Watts) x (Tokens / Throughput)
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <p style={{ color: '#e2e8f0', fontSize: '14px', textAlign: 'center', marginBottom: '8px' }}>
        Observe how changing each energy parameter affects power consumption. Adjust the sliders to explore.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Prompt Tokens (input energy): {promptTokens}
          </label>
          <input
            type="range"
            min="50"
            max="4000"
            step="50"
            value={promptTokens}
            onChange={(e) => setPromptTokens(parseInt(e.target.value))}
            style={sliderStyle}
            aria-label="Prompt Tokens slider controls input energy"
          />
        </div>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Output Tokens (response energy): {outputTokens}
          </label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={outputTokens}
            onChange={(e) => setOutputTokens(parseInt(e.target.value))}
            style={sliderStyle}
            aria-label="Output Tokens slider controls response energy"
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Model Size (billions of parameters): {modelSize}B
          </label>
          <input
            type="range"
            min="7"
            max="175"
            step="1"
            value={modelSize}
            onChange={(e) => setModelSize(parseInt(e.target.value))}
            style={sliderStyle}
            aria-label="Model Size slider controls model power"
          />
        </div>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            GPU Count (parallel power processors): {numGPUs}
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={numGPUs}
            onChange={(e) => setNumGPUs(parseInt(e.target.value))}
            style={sliderStyle}
            aria-label="GPU Count slider controls parallel power"
          />
        </div>
      </div>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Throughput (tokens per second): {throughput} tok/s
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={throughput}
          onChange={(e) => setThroughput(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Throughput slider controls tokens per second"
        />
      </div>
      <button
        onClick={() => { setIsGenerating(true); setGeneratedCount(0); }}
        disabled={isGenerating}
        style={{
          padding: '16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: isGenerating ? '#475569' : '#22c55e',
          color: 'white',
          fontWeight: 'bold',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        {isGenerating ? 'Generating...' : 'Simulate Generation'}
      </button>
    </div>
  );

  const renderTwistVisualization = () => {
    const metrics = calculateMetrics();
    return (
      <svg width="100%" height="300" viewBox="0 0 500 300" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="eptTwistGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="500" height="300" fill="#0f172a" rx="12" />

        {/* Grid */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line key={`tg${i}`} x1="40" y1={30 + frac * 200} x2="460" y2={30 + frac * 200} stroke="#475569" strokeDasharray="4 4" opacity="0.3" strokeWidth="1" />
        ))}

        {/* Comparison bars */}
        <text x="250" y="22" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">Concise vs Verbose Energy</text>
        <rect x="60" y="50" width="160" height="160" fill="rgba(34,197,94,0.15)" rx="8" stroke="#22c55e" strokeWidth="2" />
        <text x="140" y="75" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="bold">Concise</text>
        <text x="140" y="100" textAnchor="middle" fill="#f8fafc" fontSize="16">{promptTokens} tokens</text>
        <text x="140" y="125" textAnchor="middle" fill="#f8fafc" fontSize="14">{metrics.totalEnergy.toFixed(3)} Wh</text>
        <text x="140" y="150" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12">1x energy</text>
        <text x="140" y="195" textAnchor="middle" fill="#22c55e" fontSize="24">{'\u2714'}</text>

        <rect x="280" y="50" width="160" height="160" fill="rgba(239,68,68,0.15)" rx="8" stroke="#ef4444" strokeWidth="2" />
        <text x="360" y="75" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold">Verbose</text>
        <text x="360" y="100" textAnchor="middle" fill="#f8fafc" fontSize="16">{promptTokens * 5} tokens</text>
        <text x="360" y="125" textAnchor="middle" fill="#f8fafc" fontSize="14">~{(metrics.totalEnergy * 4).toFixed(3)} Wh</text>
        <text x="360" y="150" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12">~4x energy</text>
        <text x="360" y="195" textAnchor="middle" fill="#ef4444" fontSize="24">{'\u2718'}</text>

        <text x="250" y="240" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">Same answer quality, 4x the energy cost</text>
        <text x="250" y="265" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12">Energy = Power x Time = Tokens x Cost</text>
        <text x="250" y="285" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">At scale, prompt efficiency saves megawatt-hours</text>
      </svg>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Discover AI Energy</span>
          <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #ef4444, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Energy Per Token
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px', fontWeight: 'normal' }}>
            Let's explore how every token costs real energy. Does longer prompting cost money even if the answer is "free"?
          </p>
        </div>

        {renderVisualization()}

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #ef4444' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
            Every token you send to ChatGPT triggers billions of operations on power-hungry GPUs. Even when the API is "free," someone is paying for the electricity. How much energy does your prompt actually consume?
          </p>
        </div>

        <button
          onClick={goNext}
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
          }}
        >
          Make a Prediction
        </button>
      </div>
    );
  }

  // Static visualization for predict phase
  const renderStaticVisualization = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto 24px auto' }}>
      <svg width="100%" height="280" viewBox="0 0 500 280" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="eptStaticEnergyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="eptStaticInputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="eptStaticOutputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
        </defs>
        <rect width="500" height="280" fill="#0f172a" rx="12" />

        <g transform="translate(20, 30)">
          <rect width="200" height="70" fill="rgba(59, 130, 246, 0.1)" rx="8" stroke="url(#eptStaticInputGradient)" strokeWidth="2" />
          <text x="100" y="25" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">INPUT TOKENS</text>
          <text x="100" y="50" textAnchor="middle" fill="#f8fafc" fontSize="18">100 - 1000</text>
        </g>

        <g transform="translate(280, 30)">
          <rect width="200" height="70" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="url(#eptStaticOutputGradient)" strokeWidth="2" />
          <text x="100" y="25" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">OUTPUT TOKENS</text>
          <text x="100" y="50" textAnchor="middle" fill="#f8fafc" fontSize="18">~200</text>
        </g>

        <line x1="225" y1="65" x2="270" y2="65" stroke="#06b6d4" strokeWidth="3" />
        <polygon points="270,65 262,60 262,70" fill="#06b6d4" />

        <g transform="translate(20, 120)">
          <rect width="460" height="60" fill="rgba(239, 68, 68, 0.05)" rx="8" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="2" />
          <text x="230" y="20" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">ENERGY CONSUMPTION</text>
          <rect x="20" y="30" width="420" height="16" fill="#1e293b" rx="4" />
          <rect x="22" y="32" width="200" height="12" fill="url(#eptStaticEnergyGradient)" rx="3" />
          <text x="230" y="42" textAnchor="middle" fill="#f8fafc" fontSize="11">? Wh</text>
        </g>

        <g transform="translate(20, 200)">
          <rect width="460" height="60" fill="rgba(30, 41, 59, 0.9)" rx="8" stroke="#475569" strokeWidth="1" />
          <text x="30" y="20" fill="#f59e0b" fontSize="11" fontWeight="bold">GPU CLUSTER</text>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={`gpu${i}`} x={30 + i * 52} y={30} width="40" height="20" fill="#475569" rx="3" />
          ))}
        </g>
      </svg>
    </div>
  );

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '16px' }}>
          Prediction 1 of 2: Consider the scenario below
        </p>

        {renderStaticVisualization()}

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', color: '#e2e8f0' }}>
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
                minHeight: '48px',
                borderRadius: '12px',
                border: prediction === p.id ? '2px solid #ef4444' : '1px solid #475569',
                background: prediction === p.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              minHeight: '44px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#ef4444',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Energy Calculator</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
          See how token count translates to real energy consumption
        </p>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization()}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px', marginTop: '24px', border: '1px solid #22c55e' }}>
          <h3 style={{ color: '#22c55e', marginBottom: '8px' }}>Why This Matters in the Real World</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, fontWeight: 'normal' }}>
            Understanding energy per token is important because it directly affects the design of AI systems used in industry today. This practical application helps engineers build more sustainable AI infrastructure.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
          <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Try These Experiments:</h4>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Set prompt to 100 tokens, then 1000 - compare energy</li>
            <li>Increase model size - watch energy climb</li>
            <li>Reduce GPUs - see how throughput affects total energy</li>
            <li>Note: more tokens = more time = more joules</li>
          </ul>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            minHeight: '44px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#ef4444',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Review the Concepts
        </button>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'linear';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? '\u2713 Correct!' : '\u2717 Not Quite!'}
          </h3>
          <p style={{ color: '#e2e8f0', marginBottom: '12px' }}>
            <strong>Your prediction:</strong> {userPredictionLabel}
          </p>
          <p>
            The key insight is that energy scales roughly linearly with tokens because each token requires loading model weights from memory and performing computations. This demonstrates that there is no free lunch - prompt bloat directly increases energy and latency.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>The Physics of AI Energy</h3>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Memory Movement Dominates</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              The reason each token costs real energy is that GPUs must load billions of model parameters from memory. This shows that memory bandwidth is the primary energy cost, not the actual computation. The formula is: Energy = Power x Time, where Time = Tokens / Throughput.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>The Numbers Explained</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              A typical ChatGPT query uses 0.001-0.01 kWh (1-10 Wh). This means it consumes 10-100x more energy than a Google search. Therefore at billions of queries per day, this results in megawatts of power consumption. The equation E = P x t demonstrates why more tokens always cost more energy.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>Why This Matters</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              AI is projected to consume 3-4% of global electricity by 2030. Due to this scaling, prompt efficiency is not just about cost - it is about sustainability. Every unnecessary token has a carbon footprint because the relationship between tokens and energy is proportional.
            </p>
          </div>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            minHeight: '44px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#ef4444',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Next: A Twist!
        </button>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: Prompt Efficiency</h2>

        {renderTwistVisualization()}

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
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              minHeight: '44px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Concise vs Verbose</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
          Compare the energy cost of efficient vs bloated prompts
        </p>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization()}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #f59e0b' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Comparison (5x longer prompt):</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: '#22c55e', fontWeight: 'bold' }}>Concise ({promptTokens} tokens)</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Energy: {calculateMetrics().totalEnergy.toFixed(3)} Wh</p>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Verbose ({promptTokens * 5} tokens)</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Energy: ~{(calculateMetrics().totalEnergy * 4).toFixed(3)} Wh</p>
            </div>
          </div>
          <p style={{ color: '#f8fafc', marginTop: '12px', fontSize: '14px' }}>
            Same answer quality, 4x the energy cost. At scale, this matters!
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            minHeight: '44px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#f59e0b',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          See the Explanation
        </button>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'concise_wins';
    const userTwistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? '\u2713 Correct!' : '\u2717 Not Quite!'}
          </h3>
          <p style={{ color: '#e2e8f0', marginBottom: '12px' }}>
            <strong>Your prediction:</strong> {userTwistPredictionLabel}
          </p>
          <p>
            Concise prompts can often achieve the same quality at a fraction of the energy cost. Prompt engineering is not just about getting better answers - it is about efficiency. Clear, direct prompts waste less energy.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Efficient Prompting Tips</h3>
          <ul style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Be direct - state what you need clearly</li>
            <li>Avoid unnecessary filler words and context</li>
            <li>Use system prompts wisely - they are repeated every call</li>
            <li>Trim examples to minimum needed for quality</li>
            <li>Consider smaller models for simple tasks</li>
          </ul>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            minHeight: '44px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#22c55e',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Apply This Knowledge
        </button>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Energy Per Token"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
          Energy per token affects pricing, sustainability, and system design across the AI industry
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
              {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>{'\u2713'} Complete</span>}
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: '#ef4444', fontSize: '14px' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{
                  padding: '10px 20px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'transparent',
                  color: '#ef4444',
                  cursor: 'pointer',
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
          <>
            <button
              onClick={goNext}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#22c55e',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Got It
            </button>
            <button
              onClick={goNext}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#ef4444',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Take the Test
            </button>
          </>
        )}

        {transferCompleted.size < 4 && (
          <button
            onClick={goNext}
            disabled
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '16px',
              minHeight: '44px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#475569',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'not-allowed',
            }}
          >
            Complete {4 - transferCompleted.size} more applications
          </button>
        )}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {testScore >= 8 ? 'You scored great!' : 'Keep Learning!'}
            </h2>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>Test Complete! {testScore} / 10</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '12px' }}>Answer Review:</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <span key={qIndex} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isCorrect ? '#22c55e' : '#ef4444',
                    fontWeight: 'bold',
                  }}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </span>
                );
              })}
            </div>
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
                <p style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                  {qIndex + 1}. {q.question}
                </p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#e2e8f0',
                  }}>
                    {opt.correct ? '\u2713 Correct: ' : userAnswer === oIndex ? '\u2717 Your answer: ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }}
              style={{
                flex: 1,
                padding: '16px',
                minHeight: '44px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'transparent',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Replay Quiz
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                flex: 1,
                padding: '16px',
                minHeight: '44px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'transparent',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                color: '#3b82f6',
                cursor: 'pointer',
              }}
            >
              Return to Dashboard
            </button>
            <button
              onClick={goNext}
              style={{
                flex: 1,
                padding: '16px',
                minHeight: '44px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: testScore >= 8 ? '#22c55e' : '#ef4444',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {testScore >= 8 ? 'Complete Mastery' : 'Continue'}
            </button>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Knowledge Test</h2>
          <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
        </div>

        <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '13px', marginBottom: '16px', fontWeight: 'normal' }}>
          Read each scenario carefully and select the best answer based on your understanding of energy per token concepts, GPU power consumption, and AI inference efficiency.
        </p>

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

        <div style={{ background: 'rgba(245,158,11,0.1)', padding: '16px', borderRadius: '12px', marginBottom: '12px', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>Scenario:</p>
          <p style={{ fontSize: '14px', color: '#e2e8f0' }}>{currentQ.scenario}</p>
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
                minHeight: '44px',
                borderRadius: '12px',
                border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #ef4444' : '1px solid #475569',
                background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
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
              minHeight: '44px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: 'transparent',
              color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                cursor: 'pointer',
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
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
        <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
        <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
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
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
            By understanding energy per token, you can write efficient prompts that achieve the same results with less environmental impact. At scale, this matters for the planet.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            minHeight: '44px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #ef4444, #22c55e)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Complete
        </button>
      </div>
    );
  }

  return null;
};

export default EnergyPerTokenRenderer;
