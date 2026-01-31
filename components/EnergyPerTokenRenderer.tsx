import React, { useState, useCallback, useEffect, useRef } from 'react';

// Phase type for internal state management
type EnergyPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface EnergyPerTokenRendererProps {
  gamePhase?: EnergyPhase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
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

const EnergyPerTokenRenderer: React.FC<EnergyPerTokenRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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

  // Internal phase state management
  const getInitialPhase = (): EnergyPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<EnergyPhase>(getInitialPhase);
  const lastPhaseChangeRef = useRef<number>(0);

  // Sync with external gamePhase prop for resume
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation functions
  const goToPhase = useCallback((newPhase: EnergyPhase) => {
    const now = Date.now();
    if (now - lastPhaseChangeRef.current < 300) return; // Debounce
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

  // Sound feedback
  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  // Progress bar component
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
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        marginTop: '24px',
        borderTop: '1px solid #334155'
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
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
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
          {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '12px 24px',
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

  // Wrapper for phase content
  const renderPhaseContent = (content: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {renderProgressBar()}
      <div style={{ padding: '0 24px 24px 24px' }}>
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

    return (
      <div>
        <svg width="100%" height="520" viewBox="0 0 500 520" style={{ maxWidth: '600px' }}>
          <defs>
            {/* Premium energy gradient with 6 color stops */}
            <linearGradient id="eptEnergyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Input token gradient - cool blue tones */}
            <linearGradient id="eptInputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="75%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Output token gradient - success green tones */}
            <linearGradient id="eptOutputGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="75%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* GPU power gradient - amber/orange heat */}
            <linearGradient id="eptGpuHeatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="25%" stopColor="#92400e" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* GPU active gradient */}
            <linearGradient id="eptGpuActiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* GPU idle gradient */}
            <linearGradient id="eptGpuIdleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Power consumption graph gradient */}
            <linearGradient id="eptPowerGraphGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
            </linearGradient>

            {/* Efficiency meter gradient */}
            <linearGradient id="eptEfficiencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="33%" stopColor="#84cc16" />
              <stop offset="66%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Token flow gradient */}
            <linearGradient id="eptTokenFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="eptBackgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#0c1525" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Radial glow for energy meter */}
            <radialGradient id="eptEnergyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>

            {/* Token pulse glow */}
            <radialGradient id="eptTokenPulseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter for energy elements */}
            <filter id="eptEnergyGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stronger glow for active elements */}
            <filter id="eptActiveGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner glow */}
            <filter id="eptInnerGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* GPU heat shimmer */}
            <filter id="eptHeatShimmerFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Token processing particle glow */}
            <filter id="eptParticleGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="500" height="520" fill="url(#eptBackgroundGradient)" rx="12" />

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {Array.from({ length: 25 }).map((_, i) => (
              <line key={`vgrid${i}`} x1={20 * i} y1="0" x2={20 * i} y2="520" stroke="#64748b" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 26 }).map((_, i) => (
              <line key={`hgrid${i}`} x1="0" y1={20 * i} x2="500" y2={20 * i} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>

          {/* Token Flow Visualization - Input */}
          <g transform="translate(20, 40)">
            <rect width="220" height="85" fill="rgba(59, 130, 246, 0.1)" rx="10" stroke="url(#eptInputGradient)" strokeWidth="2" />
            <rect x="2" y="2" width="216" height="81" fill="transparent" rx="8" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" strokeDasharray="4 2" />

            {/* Animated token particles */}
            {isGenerating && Array.from({ length: 3 }).map((_, i) => (
              <circle
                key={`intoken${i}`}
                r="3"
                fill="url(#eptTokenPulseGlow)"
                filter="url(#eptParticleGlowFilter)"
              >
                <animateMotion
                  dur={`${0.8 + i * 0.2}s`}
                  repeatCount="indefinite"
                  path="M10,42 Q110,20 210,42"
                />
              </circle>
            ))}
          </g>

          {/* Token Flow Visualization - Output */}
          <g transform="translate(260, 40)">
            <rect width="220" height="85" fill="rgba(34, 197, 94, 0.1)" rx="10" stroke="url(#eptOutputGradient)" strokeWidth="2" />
            <rect x="2" y="2" width="216" height="81" fill="transparent" rx="8" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="1" strokeDasharray="4 2" />

            {/* Animated token particles */}
            {isGenerating && Array.from({ length: 3 }).map((_, i) => (
              <circle
                key={`outtoken${i}`}
                r="3"
                fill="url(#eptTokenPulseGlow)"
                filter="url(#eptParticleGlowFilter)"
              >
                <animateMotion
                  dur={`${1 + i * 0.3}s`}
                  repeatCount="indefinite"
                  path="M10,42 Q110,60 210,42"
                />
              </circle>
            ))}
          </g>

          {/* Token flow connecting arrow */}
          <g transform="translate(240, 82)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="url(#eptTokenFlowGradient)" strokeWidth="3" filter="url(#eptEnergyGlowFilter)" />
            <polygon points="20,0 15,-4 15,4" fill="#06b6d4" filter="url(#eptParticleGlowFilter)" />
          </g>

          {/* GPU Power Display */}
          <g transform="translate(20, 140)">
            <rect width="300" height="70" fill="rgba(30, 41, 59, 0.9)" rx="10" stroke="#475569" strokeWidth="1" />

            {/* GPU icons with heat visualization */}
            {Array.from({ length: Math.min(numGPUs, 8) }).map((_, i) => (
              <g key={`gpu${i}`} transform={`translate(${15 + i * 35}, 15)`}>
                <rect
                  width="28"
                  height="40"
                  fill={isGenerating ? 'url(#eptGpuActiveGradient)' : 'url(#eptGpuIdleGradient)'}
                  rx="4"
                  filter={isGenerating ? 'url(#eptHeatShimmerFilter)' : undefined}
                />
                {/* Heat indicator bar */}
                <rect
                  x="4"
                  y={40 - (isGenerating ? 30 : 10)}
                  width="20"
                  height={isGenerating ? 30 : 10}
                  fill="url(#eptGpuHeatGradient)"
                  rx="2"
                  opacity={isGenerating ? 0.8 : 0.3}
                />
                {/* GPU chip detail */}
                <rect x="8" y="8" width="12" height="8" fill="rgba(0,0,0,0.3)" rx="1" />
              </g>
            ))}
          </g>

          {/* Power Consumption Graph */}
          <g transform="translate(330, 140)">
            <rect width="150" height="70" fill="rgba(30, 41, 59, 0.9)" rx="10" stroke="#475569" strokeWidth="1" />

            {/* Graph area */}
            <rect x="10" y="15" width="130" height="40" fill="url(#eptPowerGraphGradient)" rx="4" />

            {/* Power line visualization */}
            <polyline
              points={`10,55 ${10 + (130 * Math.min(1, metrics.totalPower / 5000))},${55 - (40 * Math.min(1, metrics.totalPower / 5000))}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              filter="url(#eptEnergyGlowFilter)"
            />
            <circle
              cx={10 + (130 * Math.min(1, metrics.totalPower / 5000))}
              cy={55 - (40 * Math.min(1, metrics.totalPower / 5000))}
              r="4"
              fill="#f59e0b"
              filter="url(#eptActiveGlowFilter)"
            />
          </g>

          {/* Energy Meter */}
          <g transform="translate(20, 225)">
            <rect width="380" height="95" fill="rgba(239, 68, 68, 0.05)" rx="10" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="2" />

            {/* Glow background */}
            <ellipse cx="190" cy="47" rx="180" ry="40" fill="url(#eptEnergyGlow)" opacity="0.3" />

            {/* Energy bar background */}
            <rect x="20" y="35" width="340" height="24" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />

            {/* Energy bar fill with gradient */}
            <rect
              x="22"
              y="37"
              width={Math.max(0, Math.min(336, energyBarWidth * 0.84))}
              height="20"
              fill="url(#eptEnergyGradient)"
              rx="4"
              filter="url(#eptEnergyGlowFilter)"
            />

            {/* Energy bar segments */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line
                key={`seg${i}`}
                x1={22 + i * 33.6}
                y1="35"
                x2={22 + i * 33.6}
                y2="59"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Efficiency Indicator */}
          <g transform="translate(410, 225)">
            <rect width="70" height="95" fill="rgba(30, 41, 59, 0.9)" rx="10" stroke="#475569" strokeWidth="1" />

            {/* Efficiency meter background */}
            <rect x="25" y="25" width="20" height="55" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />

            {/* Efficiency level */}
            <rect
              x="27"
              y={27 + (51 * (1 - efficiencyPercent / 100))}
              width="16"
              height={51 * (efficiencyPercent / 100)}
              fill="url(#eptEfficiencyGradient)"
              rx="2"
              filter="url(#eptInnerGlowFilter)"
            />

            {/* Efficiency marker lines */}
            {[0, 25, 50, 75, 100].map((mark) => (
              <line
                key={`mark${mark}`}
                x1="20"
                y1={80 - (mark * 0.51)}
                x2="50"
                y2={80 - (mark * 0.51)}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Equivalents Cards */}
          <g transform="translate(20, 335)">
            <rect width="220" height="75" fill="rgba(30, 41, 59, 0.9)" rx="10" stroke="#475569" strokeWidth="1" />

            {/* Phone icon */}
            <rect x="15" y="25" width="18" height="30" fill="none" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
            <line x1="21" y1="50" x2="27" y2="50" stroke="#94a3b8" strokeWidth="1.5" />

            {/* LED bulb icon */}
            <ellipse cx="24" cy="58" rx="8" ry="10" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
          </g>

          <g transform="translate(260, 335)">
            <rect width="220" height="75" fill="rgba(30, 41, 59, 0.9)" rx="10" stroke="#475569" strokeWidth="1" />

            {/* CO2 cloud icon */}
            <ellipse cx="30" cy="35" rx="12" ry="8" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            <ellipse cx="24" cy="40" rx="8" ry="6" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Dollar icon */}
            <circle cx="30" cy="58" r="8" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          </g>

          {/* Token Processing Animation */}
          {isGenerating && (
            <g transform="translate(20, 425)">
              <rect width="460" height="45" fill="rgba(34, 197, 94, 0.1)" rx="10" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="2" />

              {/* Progress bar background */}
              <rect x="10" y="12" width="440" height="20" fill="#1e293b" rx="5" />

              {/* Progress bar fill */}
              <rect
                x="12"
                y="14"
                width={Math.max(0, 436 * tokenProgress)}
                height="16"
                fill="url(#eptOutputGradient)"
                rx="4"
                filter="url(#eptEnergyGlowFilter)"
              />

              {/* Animated particles along progress */}
              {Array.from({ length: 5 }).map((_, i) => (
                <circle
                  key={`prog${i}`}
                  cx={12 + (436 * tokenProgress) - 10 - i * 15}
                  cy="22"
                  r="3"
                  fill="#4ade80"
                  opacity={Math.max(0, 1 - i * 0.2)}
                  filter="url(#eptParticleGlowFilter)"
                />
              ))}
            </g>
          )}

          {/* Key Insight Background */}
          <g transform="translate(20, 485)">
            <rect width="460" height="25" fill="rgba(148, 163, 184, 0.1)" rx="6" />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ maxWidth: '600px', margin: '0 auto', marginTop: '-510px', pointerEvents: 'none' }}>
          {/* Input Tokens Label */}
          <div style={{ position: 'relative', top: '50px', left: '20px', width: '220px', textAlign: 'center' }}>
            <div style={{ color: '#3b82f6', fontSize: typo.label, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Input Tokens</div>
            <div style={{ color: '#f8fafc', fontSize: typo.heading, fontWeight: 'bold', marginTop: '4px' }}>{promptTokens.toLocaleString()}</div>
            <div style={{ color: '#94a3b8', fontSize: typo.small, marginTop: '2px' }}>Prefill: {metrics.prefillTime.toFixed(2)}s</div>
          </div>

          {/* Output Tokens Label */}
          <div style={{ position: 'relative', top: '-35px', left: '260px', width: '220px', textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: typo.label, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Output Tokens</div>
            <div style={{ color: '#f8fafc', fontSize: typo.heading, fontWeight: 'bold', marginTop: '4px' }}>{outputTokens.toLocaleString()}</div>
            <div style={{ color: '#94a3b8', fontSize: typo.small, marginTop: '2px' }}>Decode: {metrics.decodeTime.toFixed(2)}s</div>
          </div>

          {/* GPU Cluster Label */}
          <div style={{ position: 'relative', top: '15px', left: '20px', width: '300px' }}>
            <div style={{ color: '#f59e0b', fontSize: typo.label, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>GPU Cluster</div>
            <div style={{ color: '#94a3b8', fontSize: typo.small, marginTop: '55px' }}>
              {numGPUs} GPUs x {gpuPower}W = {metrics.totalPower.toLocaleString()}W
            </div>
          </div>

          {/* Power Graph Label */}
          <div style={{ position: 'relative', top: '-50px', left: '340px', width: '140px', textAlign: 'center' }}>
            <div style={{ color: '#f59e0b', fontSize: typo.label, fontWeight: 'bold' }}>Power</div>
            <div style={{ color: '#f8fafc', fontSize: typo.body, marginTop: '50px' }}>{metrics.totalPower.toLocaleString()}W</div>
          </div>

          {/* Energy Consumption Label */}
          <div style={{ position: 'relative', top: '5px', left: '20px', width: '380px', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: typo.label, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Energy Consumption</div>
            <div style={{ color: '#f8fafc', fontSize: typo.bodyLarge, fontWeight: 'bold', marginTop: '60px' }}>
              {metrics.totalEnergy.toFixed(2)} Wh ({metrics.energyPerToken.toFixed(3)} mWh/token)
            </div>
          </div>

          {/* Efficiency Label */}
          <div style={{ position: 'relative', top: '-85px', left: '410px', width: '70px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: typo.label, fontWeight: 'bold' }}>Efficiency</div>
            <div style={{ color: efficiencyPercent > 66 ? '#22c55e' : efficiencyPercent > 33 ? '#f59e0b' : '#ef4444', fontSize: typo.body, fontWeight: 'bold', marginTop: '75px' }}>
              {efficiencyPercent.toFixed(0)}%
            </div>
          </div>

          {/* Equivalents Labels */}
          <div style={{ position: 'relative', top: '-15px', left: '20px', width: '220px' }}>
            <div style={{ color: '#94a3b8', fontSize: typo.label, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>Equivalents</div>
            <div style={{ color: '#f8fafc', fontSize: typo.small, marginTop: '25px', marginLeft: '50px' }}>Phone charges: {metrics.smartphoneCharges.toFixed(3)}</div>
            <div style={{ color: '#f8fafc', fontSize: typo.small, marginTop: '4px', marginLeft: '50px' }}>LED bulb: {metrics.ledBulbSeconds.toFixed(1)}s</div>
          </div>

          {/* Environmental Labels */}
          <div style={{ position: 'relative', top: '-75px', left: '260px', width: '220px' }}>
            <div style={{ color: '#94a3b8', fontSize: typo.label, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>Environmental</div>
            <div style={{ color: '#f8fafc', fontSize: typo.small, marginTop: '25px', marginLeft: '50px' }}>CO2: {metrics.co2Grams.toFixed(2)} grams</div>
            <div style={{ color: '#f8fafc', fontSize: typo.small, marginTop: '4px', marginLeft: '50px' }}>Cost: ${(metrics.costCents / 100).toFixed(4)}</div>
          </div>

          {/* Generation Progress Label */}
          {isGenerating && (
            <div style={{ position: 'relative', top: '-20px', left: '20px', width: '460px', textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: typo.body, fontWeight: 'bold' }}>
                Generating: {generatedCount} / {outputTokens} tokens ({(tokenProgress * 100).toFixed(0)}%)
              </div>
            </div>
          )}

          {/* Key Insight Label */}
          <div style={{ position: 'relative', top: isGenerating ? '20px' : '65px', left: '20px', width: '460px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: typo.small, fontStyle: 'italic' }}>
              Every token = memory movement = real joules = real cost
            </div>
          </div>
        </div>
      </div>
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
    return renderPhaseContent(
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
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Make a Prediction
        </button>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
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
            onClick={goNext}
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
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
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
          onClick={goNext}
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
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'linear';

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
          onClick={goNext}
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
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
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
            onClick={goNext}
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
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const conciseMetrics = calculateMetrics();
    const verbosePrompt = promptTokens * 5;

    return renderPhaseContent(
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
          onClick={goNext}
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
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'concise_wins';

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
          onClick={goNext}
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
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
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
          onClick={goNext}
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
            onClick={goNext}
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
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return renderPhaseContent(
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
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
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
            WebkitTapHighlightColor: 'transparent',
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
