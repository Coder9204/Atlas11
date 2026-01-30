'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface QuantizationPrecisionRendererProps {
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
  twist_play: 'Sensitivity Lab',
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
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  fp32: '#3b82f6',
  fp16: '#8b5cf6',
  int8: '#22c55e',
  int4: '#f97316',
};

// Precision specs
const PRECISION_SPECS = {
  FP32: { bits: 32, range: '1.2e-38 to 3.4e38', memoryRatio: 1, speedRatio: 1, color: colors.fp32 },
  FP16: { bits: 16, range: '6.1e-5 to 65504', memoryRatio: 0.5, speedRatio: 2, color: colors.fp16 },
  INT8: { bits: 8, range: '-128 to 127', memoryRatio: 0.25, speedRatio: 4, color: colors.int8 },
  INT4: { bits: 4, range: '-8 to 7', memoryRatio: 0.125, speedRatio: 8, color: colors.int4 },
};

const TEST_QUESTIONS = [
  { text: 'Quantization reduces model size by using fewer bits per parameter.', correct: true },
  { text: 'FP32 training is necessary because gradients require high precision.', correct: true },
  { text: 'INT8 quantization always reduces model accuracy significantly.', correct: false },
  { text: 'All neural network layers can be quantized equally well.', correct: false },
  { text: 'Quantization calibration finds the optimal scale for converting values.', correct: true },
  { text: 'Running inference in INT8 uses 4x less memory than FP32.', correct: true },
  { text: 'The first and last layers are most sensitive to quantization errors.', correct: true },
  { text: 'Dynamic quantization happens during training, not inference.', correct: false },
  { text: 'Mixed precision uses different bit widths for different operations.', correct: true },
  { text: 'Quantization-aware training produces better quantized models than post-training quantization.', correct: true },
];

const TRANSFER_APPS = [
  {
    title: 'Mobile AI (Smartphones)',
    description: 'Your phone runs AI models in INT8 or INT4. The A17/Snapdragon chips have dedicated hardware for low-precision math.',
    insight: 'iPhone neural engine: INT8',
  },
  {
    title: 'ChatGPT/LLM Inference',
    description: 'Running GPT-4 would need 1.7TB of memory in FP32. INT4 quantization makes it fit in 200GB across 8 GPUs.',
    insight: 'GPTQ: 4-bit with <1% quality loss',
  },
  {
    title: 'Self-Driving Cars',
    description: 'Tesla FSD runs INT8 on custom hardware. Every millisecond of latency matters at highway speeds.',
    insight: 'FSD chip: 144 TOPS @ INT8',
  },
  {
    title: 'Real-time Image Generation',
    description: 'Stable Diffusion on consumer GPUs uses FP16. INT8 versions run on phones generating images in seconds.',
    insight: 'SD on iPhone: INT8 CoreML',
  },
];

const QuantizationPrecisionRenderer: React.FC<QuantizationPrecisionRendererProps> = ({
  gamePhase,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(boolean | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Simulation state
  const [precision, setPrecision] = useState<keyof typeof PRECISION_SPECS>('FP32');
  const [modelSize, setModelSize] = useState(7); // billion parameters
  const [showQuantizationError, setShowQuantizationError] = useState(true);
  const [layerSensitivity, setLayerSensitivity] = useState<'input' | 'middle' | 'output'>('middle');
  const [animationFrame, setAnimationFrame] = useState(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
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

  // Example values for visualization
  const [originalValue] = useState(0.3927);
  const quantizedValues = {
    FP32: 0.3927,
    FP16: 0.3926,
    INT8: 0.39,
    INT4: 0.375,
  };

  useEffect(() => {
    if (initialPhase) setPhase(initialPhase);
  }, [initialPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const spec = PRECISION_SPECS[precision];
  const memoryGB = (modelSize * 4 * spec.memoryRatio).toFixed(1); // 4 bytes per FP32 param
  const quantizationError = Math.abs(originalValue - quantizedValues[precision]) / originalValue * 100;
  const throughputMultiplier = spec.speedRatio;

  // Layer sensitivity affects quality loss
  const sensitivityMultiplier = layerSensitivity === 'input' ? 3 : layerSensitivity === 'output' ? 2.5 : 1;
  const effectiveQualityLoss = Math.min(10, quantizationError * sensitivityMultiplier);

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === TEST_QUESTIONS[index].correct) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 400;
    const height = 320;

    // Binary representation visualization
    const getBinaryPattern = (precision: string) => {
      switch (precision) {
        case 'FP32': return Array(32).fill(0).map((_, i) => Math.random() > 0.5);
        case 'FP16': return Array(16).fill(0).map((_, i) => Math.random() > 0.5);
        case 'INT8': return Array(8).fill(0).map((_, i) => Math.random() > 0.5);
        case 'INT4': return Array(4).fill(0).map((_, i) => Math.random() > 0.5);
        default: return [];
      }
    };

    const bits = getBinaryPattern(precision);
    const bitWidth = Math.min(10, 300 / bits.length);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#1e293b', borderRadius: '12px' }}
      >
        {/* Title */}
        <text x={200} y={30} textAnchor="middle" fill={colors.textPrimary} fontSize={16} fontWeight="bold">
          {precision}: {spec.bits} bits per number
        </text>

        {/* Binary representation */}
        <g transform="translate(50, 50)">
          {bits.map((bit, i) => (
            <rect
              key={i}
              x={i * (bitWidth + 2)}
              y={0}
              width={bitWidth}
              height={30}
              rx={2}
              fill={bit ? spec.color : 'rgba(255,255,255,0.1)'}
              stroke={spec.color}
              strokeWidth={1}
            />
          ))}
          <text x={150} y={50} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
            {bits.length} bits = {Math.pow(2, bits.length).toLocaleString()} possible values
          </text>
        </g>

        {/* Value comparison */}
        <g transform="translate(50, 120)">
          <text x={0} y={0} fill={colors.textSecondary} fontSize={12}>Original (FP32):</text>
          <text x={150} y={0} fill={colors.fp32} fontSize={14} fontWeight="bold">{originalValue}</text>

          <text x={0} y={30} fill={colors.textSecondary} fontSize={12}>Quantized ({precision}):</text>
          <text x={150} y={30} fill={spec.color} fontSize={14} fontWeight="bold">
            {quantizedValues[precision]}
          </text>

          {showQuantizationError && (
            <>
              <text x={0} y={60} fill={colors.textSecondary} fontSize={12}>Quantization Error:</text>
              <text
                x={150}
                y={60}
                fill={quantizationError > 1 ? colors.warning : colors.success}
                fontSize={14}
                fontWeight="bold"
              >
                {quantizationError.toFixed(2)}%
              </text>
            </>
          )}
        </g>

        {/* Memory comparison bars */}
        <g transform="translate(50, 210)">
          <text x={0} y={-10} fill={colors.textMuted} fontSize={11}>Memory Usage</text>

          <rect x={0} y={0} width={280} height={20} rx={4} fill="rgba(255,255,255,0.1)" />
          <rect
            x={0}
            y={0}
            width={280 * spec.memoryRatio}
            height={20}
            rx={4}
            fill={spec.color}
          />
          <text x={285} y={15} fill={colors.textSecondary} fontSize={11}>
            {(spec.memoryRatio * 100).toFixed(0)}%
          </text>

          <text x={0} y={50} fill={colors.textMuted} fontSize={11}>Throughput Multiplier</text>
          <rect x={0} y={60} width={280} height={20} rx={4} fill="rgba(255,255,255,0.1)" />
          <rect
            x={0}
            y={60}
            width={Math.min(280, 280 * spec.speedRatio / 8)}
            height={20}
            rx={4}
            fill={colors.success}
          />
          <text x={285} y={75} fill={colors.textSecondary} fontSize={11}>
            {spec.speedRatio}x
          </text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Precision Format
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(PRECISION_SPECS) as Array<keyof typeof PRECISION_SPECS>).map(p => (
            <button
              key={p}
              onClick={() => setPrecision(p)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: precision === p ? `2px solid ${PRECISION_SPECS[p].color}` : '1px solid rgba(255,255,255,0.2)',
                background: precision === p ? `${PRECISION_SPECS[p].color}22` : 'transparent',
                color: PRECISION_SPECS[p].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize}B parameters
        </label>
        <input
          type="range"
          min={1}
          max={70}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px' }}>
          <span>1B (Phi-2)</span>
          <span>7B (LLaMA)</span>
          <span>70B (LLaMA-70B)</span>
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Memory Required</div>
          <div style={{ color: spec.color, fontSize: '24px', fontWeight: 'bold' }}>{memoryGB} GB</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Speed Boost</div>
          <div style={{ color: colors.success, fontSize: '24px', fontWeight: 'bold' }}>{throughputMultiplier}x</div>
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        zIndex: 1000,
        gap: '12px'
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          Quantization
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canProceed: boolean, buttonText: string, action?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={action || goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Phase renders
  const renderHook = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            Quantization and Precision
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            How can AI run on 8-bit numbers when training uses 32-bit?
          </p>
        </div>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginTop: '24px'
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
            A 7-billion parameter model needs 28GB of memory in FP32. But your phone's AI chip
            only has 8GB. How does AI run everywhere from phones to watches?
          </p>
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              The secret: Quantization - trading precision for speed and memory
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              FP32 (28GB) to INT8 (7GB) to INT4 (3.5GB)
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'crash', text: 'Using fewer bits makes the AI completely wrong' },
      { id: 'identical', text: 'INT8 and FP32 produce identical outputs' },
      { id: 'tradeoff', text: 'Fewer bits = small accuracy loss, big memory/speed gains' },
      { id: 'random', text: 'Results become random noise with fewer bits' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens when you reduce numerical precision from 32 bits to 8 bits?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: prediction === 'tradeoff' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'tradeoff' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'tradeoff' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'tradeoff' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Quantization trades small accuracy losses (typically less than 1%) for 4x memory reduction
                and 2-8x speed improvements. Neural networks are surprisingly robust to reduced precision!
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!prediction, 'Explore the Lab')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Quantization Lab
        </h2>

        {renderVisualization()}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Observations:</h3>
          <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>FP32 to FP16: 50% memory, 2x speed, minimal quality loss</li>
            <li>FP32 to INT8: 25% memory, 4x speed, slight quality loss</li>
            <li>FP32 to INT4: 12.5% memory, 8x speed, noticeable but usable</li>
            <li>Larger models are MORE robust to quantization</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review Concepts')}
    </div>
  );

  const renderReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Understanding Quantization
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp32, marginBottom: '8px' }}>FP32 (Training)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              32 bits = 1 sign + 8 exponent + 23 mantissa. Used for training because
              gradients need high precision to accumulate correctly over millions of steps.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>FP16/BF16 (Mixed Precision)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              16 bits with different exponent/mantissa trade-offs. BF16 keeps FP32's range
              but reduces precision - great for training with 2x speedup.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int8, marginBottom: '8px' }}>INT8 (Inference)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              8-bit integers need calibration to map the weight distribution.
              Achieves 4x compression with minimal accuracy loss when done right.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int4, marginBottom: '8px' }}>INT4/NF4 (Extreme)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              4-bit quantization using techniques like GPTQ or AWQ. Enables 70B models
              to run on consumer GPUs with surprisingly good quality.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Layer Sensitivity')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'all_same', text: 'All layers can be quantized equally' },
      { id: 'first_last', text: 'First and last layers need higher precision' },
      { id: 'middle', text: 'Only middle layers can be quantized' },
      { id: 'random', text: 'Sensitivity is random across layers' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Layer Sensitivity
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Some layers are more sensitive to quantization than others. Which ones?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: twistPrediction === 'first_last' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'first_last' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'first_last' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                The first layer processes raw input (small errors amplify) and the last layer
                produces final outputs (errors directly visible). Middle layers are more forgiving
                because errors can average out through many subsequent operations.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Layer Sensitivity')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Layer Sensitivity Lab
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '12px' }}>
            Select Layer Type:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['input', 'middle', 'output'] as const).map(layer => (
              <button
                key={layer}
                onClick={() => setLayerSensitivity(layer)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: layerSensitivity === layer ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: layerSensitivity === layer ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {renderVisualization()}

        <div style={{
          background: layerSensitivity === 'middle' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${layerSensitivity === 'middle' ? colors.success : colors.error}`
        }}>
          <h3 style={{ color: layerSensitivity === 'middle' ? colors.success : colors.error, marginBottom: '8px' }}>
            {layerSensitivity === 'input' && 'High Sensitivity - Keep FP16 or higher'}
            {layerSensitivity === 'middle' && 'Low Sensitivity - Safe for INT8/INT4'}
            {layerSensitivity === 'output' && 'High Sensitivity - Keep FP16 or higher'}
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {layerSensitivity === 'input' && 'Input layers process raw data. Small errors here propagate through the entire network.'}
            {layerSensitivity === 'middle' && 'Middle layers have redundancy. Errors average out across many parameters and operations.'}
            {layerSensitivity === 'output' && 'Output layers directly affect predictions. Errors here immediately impact model quality.'}
          </p>
          <p style={{ color: colors.warning, fontSize: '14px', marginTop: '8px' }}>
            Quality Impact: {effectiveQualityLoss.toFixed(1)}% (with {precision} quantization)
          </p>
        </div>

        {renderControls()}
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Mixed-Precision Strategy
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>Input/Output Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Keep at FP16 or higher. These layers are bottlenecks for quality.
              Often only 1-2% of total parameters.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Middle Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Safe for INT8 or even INT4. These contain 95%+ of parameters.
              Maximum memory savings with minimal quality impact.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Calibration is Key</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quantization needs calibration data to find the right scale factors.
              Running a few hundred samples through the model finds optimal mappings.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>QAT vs PTQ</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>Post-Training Quantization (PTQ):</strong> Fast, simple, good results.<br/>
              <strong>Quantization-Aware Training (QAT):</strong> Better quality but requires retraining.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Real-World Applications')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Explore all 4 applications to continue
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {TRANSFER_APPS.map((app, i) => (
            <div
              key={i}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(i) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
              </div>
              {!transferCompleted.has(i) && (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, i]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
    </div>
  );

  const renderTest = () => {
    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {passed ? 'Trophy' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px' }}>
                {score}/10 Correct
              </h2>
              <p style={{ color: colors.textSecondary }}>
                {passed ? 'Excellent! You understand quantization and precision.' : 'Review the material and try again.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TEST_QUESTIONS.map((q, i) => (
                <div key={i} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: testAnswers[i] === q.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderLeft: `3px solid ${testAnswers[i] === q.correct ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>{q.text}</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                    Correct answer: {q.correct ? 'True' : 'False'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {renderBottomBar(passed, passed ? 'Complete Mastery' : 'Review & Retry', () => {
            if (passed) {
              goNext();
            } else {
              setTestSubmitted(false);
              setTestAnswers(new Array(10).fill(null));
              setCurrentTestIndex(0);
            }
          })}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            Knowledge Test
          </h2>
          <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            Question {currentTestIndex + 1} of 10
          </p>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', justifyContent: 'center' }}>
            {TEST_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestIndex(i)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: 'none',
                  background: testAnswers[i] !== null
                    ? (testAnswers[i] === TEST_QUESTIONS[i].correct ? colors.success : colors.error)
                    : (i === currentTestIndex ? colors.accent : 'rgba(255,255,255,0.1)'),
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              />
            ))}
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>{currentQ.text}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[currentTestIndex] = true;
                setTestAnswers(newAnswers);
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestIndex] === true ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestIndex] === true ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              TRUE
            </button>
            <button
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[currentTestIndex] = false;
                setTestAnswers(newAnswers);
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestIndex] === false ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestIndex] === false ? 'rgba(239, 68, 68, 0.2)' : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              FALSE
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestIndex < 9 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
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
                onClick={() => setTestSubmitted(true)}
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
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.int8})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Quantization Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand how AI models shrink without breaking
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>FP32/FP16/INT8/INT4 precision trade-offs</li>
            <li>Memory and speed benefits of quantization</li>
            <li>Layer sensitivity (first/last vs middle)</li>
            <li>Calibration and scale factors</li>
            <li>Mixed-precision strategies</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(168, 85, 247, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "Precision is expensive. Use only what you need."
          </p>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      {renderProgressBar()}
      {/* Main content with padding for fixed header */}
      <div style={{ paddingTop: '60px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default QuantizationPrecisionRenderer;
