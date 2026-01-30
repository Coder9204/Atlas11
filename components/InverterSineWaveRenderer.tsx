import React, { useState, useEffect, useCallback, useRef } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface InverterSineWaveRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional, only for resume
}

// Simple audio feedback
const playSound = (type: 'click' | 'success' | 'error' | 'transition') => {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number> = { click: 600, success: 800, error: 300, transition: 500 };
    oscillator.frequency.value = frequencies[type] || 440;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) { /* Audio not available */ }
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dc: '#3b82f6',
  ac: '#22c55e',
  pwm: '#a855f7',
  harmonic: '#ec4899',
};

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const InverterSineWaveRenderer: React.FC<InverterSineWaveRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  // Phase order and labels
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Play',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Explore',
    twist_review: 'Explain',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  // Get initial phase from gamePhase prop or default to 'hook'
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Emit game event helper
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, phase, data, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  // Navigation functions with debouncing
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_change', {
      from: phase,
      to: p,
      label: phaseLabels[p],
      index: phaseOrder.indexOf(p)
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phase, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  // Simulation state
  const [waveformType, setWaveformType] = useState<'square' | 'modified' | 'pwm'>('square');
  const [dcVoltage, setDcVoltage] = useState(400);
  const [frequency, setFrequency] = useState(60);
  const [pwmFrequency, setPwmFrequency] = useState(20); // kHz
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.05) % (2 * Math.PI * 4));
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Generate waveform data
  const generateWaveform = useCallback((type: string, numPoints: number = 200) => {
    const points: { x: number; y: number }[] = [];
    const period = 2 * Math.PI;

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * period * 2; // Two complete cycles
      let y = 0;

      if (type === 'square') {
        // Simple square wave
        y = Math.sin(t) >= 0 ? 1 : -1;
      } else if (type === 'modified') {
        // Modified sine wave (stepped approximation)
        const sine = Math.sin(t);
        if (Math.abs(sine) < 0.33) y = 0;
        else y = sine > 0 ? 1 : -1;
      } else if (type === 'pwm') {
        // PWM approximation of sine wave
        const sine = Math.sin(t);
        // High frequency PWM modulated by sine
        const pwmPhase = (t * pwmFrequency) % (2 * Math.PI);
        const dutyCycle = (sine + 1) / 2; // 0 to 1
        y = pwmPhase < dutyCycle * 2 * Math.PI ? 1 : -1;
        // Low-pass filter effect (simplified)
        y = sine * 0.9 + y * 0.1;
      } else if (type === 'sine') {
        y = Math.sin(t);
      }

      points.push({ x: i, y: y * dcVoltage / 2 });
    }
    return points;
  }, [dcVoltage, pwmFrequency]);

  // Calculate THD (Total Harmonic Distortion) approximation
  const calculateTHD = useCallback(() => {
    if (waveformType === 'square') return 48.3; // Theoretical THD of square wave
    if (waveformType === 'modified') return 23.8;
    if (waveformType === 'pwm') return 3.2; // Low THD with proper filtering
    return 0;
  }, [waveformType]);

  const squareWave = generateWaveform('square');
  const outputWave = generateWaveform(waveformType);
  const sineWave = generateWaveform('sine');
  const thd = calculateTHD();

  const predictions = [
    { id: 'switch_fast', label: 'Switching very fast creates a smooth sine wave automatically' },
    { id: 'pwm_filter', label: 'PWM switching + low-pass filtering synthesizes a sine wave' },
    { id: 'resistor', label: 'Resistors shape the square wave into a sine' },
    { id: 'capacitor_only', label: 'Capacitors alone can convert DC to AC' },
  ];

  const twistPredictions = [
    { id: 'no_problem', label: 'Square waves work fine for all appliances' },
    { id: 'motor_heat', label: 'Motors and transformers waste energy and overheat on square waves' },
    { id: 'lights_only', label: 'Only affects LED lights, not motors' },
    { id: 'more_power', label: 'Square waves actually deliver more power' },
  ];

  const transferApplications = [
    {
      title: 'Grid-Tied Solar Inverters',
      description: 'Solar inverters must produce perfectly synchronized AC that matches the grid frequency, voltage, and phase angle.',
      question: 'Why must grid-tied inverters have such low THD (under 5%)?',
      answer: 'High THD creates harmonics that flow into the grid, causing interference with other equipment, overheating transformers, and violating utility interconnection standards. Anti-islanding protection also requires clean waveforms for accurate detection.',
    },
    {
      title: 'Variable Frequency Drives (VFDs)',
      description: 'Industrial motors use VFDs to control speed by varying the frequency and voltage of the AC output.',
      question: 'How do VFDs use PWM to control motor speed and torque?',
      answer: 'VFDs create variable-frequency AC by adjusting both the PWM duty cycle (controls voltage) and the fundamental frequency (controls speed). The V/f ratio is kept constant to maintain motor torque. A motor designed for 60Hz can run at 30Hz with half the voltage.',
    },
    {
      title: 'Uninterruptible Power Supplies (UPS)',
      description: 'Online UPS systems continuously convert AC to DC to AC, providing isolation and power conditioning.',
      question: 'Why do high-quality UPS systems use double conversion (AC-DC-AC)?',
      answer: 'Double conversion provides complete isolation from grid disturbances. The rectifier charges batteries while powering the inverter. The output is a perfect sine wave regardless of input quality. This protects sensitive equipment from sags, surges, and harmonics.',
    },
    {
      title: 'Electric Vehicle Chargers',
      description: 'Bidirectional chargers can both charge the EV battery and feed power back to the grid (V2G - vehicle to grid).',
      question: 'What makes V2G inverters more complex than regular chargers?',
      answer: 'V2G requires four-quadrant operation: charging (DC from AC), discharging (AC from DC), absorbing reactive power, and supplying reactive power. The inverter must seamlessly transition between modes while maintaining grid synchronization and meeting power quality standards.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the main challenge in converting DC to AC?',
      options: [
        { text: 'DC has too much power', correct: false },
        { text: 'Creating a smooth sinusoidal waveform from switched DC', correct: true },
        { text: 'AC requires more voltage', correct: false },
        { text: 'DC cannot be switched on and off', correct: false },
      ],
    },
    {
      question: 'PWM (Pulse Width Modulation) in inverters works by:',
      options: [
        { text: 'Varying the DC voltage directly', correct: false },
        { text: 'Switching at high frequency with varying duty cycle to approximate a sine', correct: true },
        { text: 'Using resistors to create the wave shape', correct: false },
        { text: 'Mechanical rotation of magnets', correct: false },
      ],
    },
    {
      question: 'Total Harmonic Distortion (THD) measures:',
      options: [
        { text: 'The total power output', correct: false },
        { text: 'How much the waveform deviates from a pure sine wave', correct: true },
        { text: 'The frequency of the output', correct: false },
        { text: 'The voltage level', correct: false },
      ],
    },
    {
      question: 'Why is a square wave problematic for motors?',
      options: [
        { text: 'Motors only work with DC', correct: false },
        { text: 'Harmonics cause extra heating and vibration', correct: true },
        { text: 'Square waves have no voltage', correct: false },
        { text: 'Square waves spin motors backwards', correct: false },
      ],
    },
    {
      question: 'A modified sine wave inverter produces:',
      options: [
        { text: 'A perfect sine wave', correct: false },
        { text: 'A stepped waveform that approximates a sine', correct: true },
        { text: 'Pure DC output', correct: false },
        { text: 'Random noise', correct: false },
      ],
    },
    {
      question: 'Grid-tied inverters must synchronize their output to:',
      options: [
        { text: 'The battery voltage', correct: false },
        { text: 'The grid frequency, voltage, and phase angle', correct: true },
        { text: 'The solar panel output', correct: false },
        { text: 'A random reference', correct: false },
      ],
    },
    {
      question: 'Higher PWM switching frequency allows:',
      options: [
        { text: 'Higher output power', correct: false },
        { text: 'Smaller filter components and cleaner output', correct: true },
        { text: 'Lower efficiency', correct: false },
        { text: 'Louder operation', correct: false },
      ],
    },
    {
      question: 'An H-bridge in an inverter is used to:',
      options: [
        { text: 'Step up voltage', correct: false },
        { text: 'Switch DC polarity to create AC positive and negative half-cycles', correct: true },
        { text: 'Store energy', correct: false },
        { text: 'Filter harmonics', correct: false },
      ],
    },
    {
      question: 'Anti-islanding protection in grid-tied inverters:',
      options: [
        { text: 'Prevents the inverter from overheating', correct: false },
        { text: 'Shuts down the inverter if grid power fails for safety', correct: true },
        { text: 'Increases power output', correct: false },
        { text: 'Connects multiple inverters together', correct: false },
      ],
    },
    {
      question: 'The low-pass filter in an inverter output stage:',
      options: [
        { text: 'Increases the switching frequency', correct: false },
        { text: 'Removes high-frequency PWM components, leaving the fundamental sine', correct: true },
        { text: 'Adds harmonics for more power', correct: false },
        { text: 'Converts AC back to DC', correct: false },
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
    if (score >= 8) {
      playSound('success');
      emitGameEvent('completion', { score, total: 10, passed: true });
    }
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const graphWidth = 360;
    const graphHeight = 100;
    const graphX = 20;

    // Scale for waveforms
    const scaleX = (i: number) => graphX + (i / 200) * graphWidth;
    const scaleY = (v: number, centerY: number) => centerY - (v / (dcVoltage / 2)) * (graphHeight / 2 - 5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Title */}
          <text x="200" y="22" fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="bold">
            DC to AC Conversion: {waveformType === 'square' ? 'Square Wave' : waveformType === 'modified' ? 'Modified Sine' : 'PWM Sine Wave'}
          </text>

          {/* DC Input representation */}
          <g transform="translate(20, 40)">
            <rect x="0" y="0" width="60" height="35" fill="rgba(59, 130, 246, 0.2)" stroke={colors.dc} strokeWidth="2" rx="4" />
            <text x="30" y="15" fill={colors.dc} fontSize="9" textAnchor="middle">DC Input</text>
            <text x="30" y="28" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="bold">{dcVoltage}V</text>
          </g>

          {/* H-Bridge representation */}
          <g transform="translate(100, 40)">
            <rect x="0" y="0" width="80" height="35" fill="rgba(168, 85, 247, 0.2)" stroke={colors.pwm} strokeWidth="2" rx="4" />
            <text x="40" y="15" fill={colors.pwm} fontSize="9" textAnchor="middle">H-Bridge</text>
            <text x="40" y="28" fill={colors.textSecondary} fontSize="8" textAnchor="middle">PWM Control</text>
            {/* Switching animation */}
            <rect x="10" y="8" width="15" height="10" fill={Math.sin(animationTime) > 0 ? colors.success : '#374151'} rx="2" />
            <rect x="55" y="8" width="15" height="10" fill={Math.sin(animationTime) > 0 ? '#374151' : colors.success} rx="2" />
            <rect x="10" y="22" width="15" height="10" fill={Math.sin(animationTime) > 0 ? '#374151' : colors.success} rx="2" />
            <rect x="55" y="22" width="15" height="10" fill={Math.sin(animationTime) > 0 ? colors.success : '#374151'} rx="2" />
          </g>

          {/* Filter representation */}
          <g transform="translate(200, 40)">
            <rect x="0" y="0" width="70" height="35" fill="rgba(34, 197, 94, 0.2)" stroke={colors.ac} strokeWidth="2" rx="4" />
            <text x="35" y="15" fill={colors.ac} fontSize="9" textAnchor="middle">LC Filter</text>
            <text x="35" y="28" fill={colors.textSecondary} fontSize="8" textAnchor="middle">{pwmFrequency}kHz cutoff</text>
          </g>

          {/* AC Output */}
          <g transform="translate(290, 40)">
            <rect x="0" y="0" width="90" height="35" fill="rgba(34, 197, 94, 0.2)" stroke={colors.ac} strokeWidth="2" rx="4" />
            <text x="45" y="15" fill={colors.ac} fontSize="9" textAnchor="middle">AC Output</text>
            <text x="45" y="28" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">{frequency}Hz</text>
          </g>

          {/* Connection arrows */}
          <path d="M80 57 L95 57" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />
          <path d="M180 57 L195 57" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />
          <path d="M270 57 L285 57" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill={colors.textMuted} />
            </marker>
          </defs>

          {/* Waveform Graph - Before Filter (Raw PWM/Switching) */}
          <g transform="translate(0, 85)">
            <rect x={graphX - 5} y="0" width={graphWidth + 10} height={graphHeight + 20} fill="rgba(0,0,0,0.3)" rx="6" />
            <text x={graphX} y="15" fill={colors.pwm} fontSize="10">Before Filter (Switching Output)</text>

            {/* Grid lines */}
            <line x1={graphX} y1={graphHeight/2 + 20} x2={graphX + graphWidth} y2={graphHeight/2 + 20} stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="2,2" />

            {/* Square wave (raw switching) */}
            <path
              d={squareWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 20);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={colors.pwm}
              strokeWidth="2"
              opacity="0.8"
            />

            <text x={graphX + graphWidth - 5} y={graphHeight + 15} fill={colors.textMuted} fontSize="8" textAnchor="end">
              +/- {(dcVoltage/2).toFixed(0)}V peak
            </text>
          </g>

          {/* Waveform Graph - After Filter (Output) */}
          <g transform="translate(0, 200)">
            <rect x={graphX - 5} y="0" width={graphWidth + 10} height={graphHeight + 20} fill="rgba(0,0,0,0.3)" rx="6" />
            <text x={graphX} y="15" fill={colors.ac} fontSize="10">After Filter (AC Output)</text>

            {/* Grid lines */}
            <line x1={graphX} y1={graphHeight/2 + 20} x2={graphX + graphWidth} y2={graphHeight/2 + 20} stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="2,2" />

            {/* Ideal sine wave (reference) */}
            <path
              d={sineWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 20);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />

            {/* Actual output waveform */}
            <path
              d={outputWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 20);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={colors.ac}
              strokeWidth="2"
            />

            <text x={graphX + graphWidth - 5} y={graphHeight + 15} fill={colors.textMuted} fontSize="8" textAnchor="end">
              Dashed = ideal sine
            </text>
          </g>

          {/* Stats panel */}
          <g transform="translate(20, 325)">
            <rect x="0" y="0" width="360" height="45" fill="rgba(0,0,0,0.4)" rx="6" stroke={colors.accent} strokeWidth="1" />
            <text x="10" y="18" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Waveform Quality:</text>
            <text x="120" y="18" fill={thd < 5 ? colors.success : thd < 25 ? colors.warning : colors.error} fontSize="11">
              THD: {thd.toFixed(1)}%
            </text>
            <text x="200" y="18" fill={colors.textSecondary} fontSize="10">
              ({thd < 5 ? 'Excellent - Grid Safe' : thd < 25 ? 'Acceptable for most loads' : 'Poor - Motors will overheat'})
            </text>
            <text x="10" y="36" fill={colors.textSecondary} fontSize="10">
              Output: {(dcVoltage * 0.707 / Math.sqrt(2)).toFixed(0)}V RMS | Type: {waveformType === 'pwm' ? 'Pure Sine Wave' : waveformType === 'modified' ? 'Modified Sine' : 'Square Wave'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            {(['square', 'modified', 'pwm'] as const).map(type => (
              <button
                key={type}
                onClick={() => setWaveformType(type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: waveformType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: waveformType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: waveformType === type ? colors.accent : colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {type === 'square' ? 'Square' : type === 'modified' ? 'Modified Sine' : 'PWM Sine'}
              </button>
            ))}
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause' : 'Animate'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          DC Input Voltage: {dcVoltage}V
        </label>
        <input
          type="range"
          min="100"
          max="600"
          step="10"
          value={dcVoltage}
          onInput={(e) => setDcVoltage(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setDcVoltage(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>100V (Low)</span>
          <span>600V (Grid-Tied)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Output Frequency: {frequency}Hz
        </label>
        <input
          type="range"
          min="50"
          max="60"
          step="5"
          value={frequency}
          onInput={(e) => setFrequency(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>50Hz (Europe/Asia)</span>
          <span>60Hz (Americas)</span>
        </div>
      </div>

      {waveformType === 'pwm' && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            PWM Switching Frequency: {pwmFrequency}kHz
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={pwmFrequency}
            onInput={(e) => setPwmFrequency(parseInt((e.target as HTMLInputElement).value))}
            onChange={(e) => setPwmFrequency(parseInt(e.target.value))}
            style={{ width: '100%', height: '32px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
            <span>5kHz (Large filter)</span>
            <span>50kHz (Small filter)</span>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(34, 197, 94, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.ac}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          How PWM Creates Sine Waves
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          The H-bridge switches at high frequency (10-50kHz). By varying the duty cycle following a sine pattern,
          the average voltage traces out a sine wave. The LC filter removes the high-frequency switching,
          leaving a clean sinusoidal output.
        </div>
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button
              onClick={() => index <= currentIndex && goToPhase(p)}
              disabled={index > currentIndex}
              style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                borderRadius: '50%',
                border: 'none',
                background: index === currentIndex
                  ? colors.accent
                  : index < currentIndex
                    ? colors.success
                    : 'rgba(255,255,255,0.2)',
                color: index <= currentIndex ? 'white' : colors.textMuted,
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: 'bold',
                cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              title={phaseLabels[p]}
            >
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{
                width: isMobile ? '12px' : '20px',
                height: '2px',
                background: index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const getBottomBarConfig = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    let canProceed = true;
    let nextLabel = 'Next';

    switch (phase) {
      case 'hook':
        nextLabel = 'Make a Prediction';
        break;
      case 'predict':
        canProceed = !!prediction;
        nextLabel = 'Test My Prediction';
        break;
      case 'play':
        nextLabel = 'Continue to Review';
        break;
      case 'review':
        nextLabel = 'Next: A Twist!';
        break;
      case 'twist_predict':
        canProceed = !!twistPrediction;
        nextLabel = 'Test My Prediction';
        break;
      case 'twist_play':
        nextLabel = 'See the Explanation';
        break;
      case 'twist_review':
        nextLabel = 'Apply This Knowledge';
        break;
      case 'transfer':
        canProceed = transferCompleted.size >= 4;
        nextLabel = 'Take the Test';
        break;
      case 'test':
        canProceed = testSubmitted && testScore >= 8;
        nextLabel = testSubmitted ? (testScore >= 8 ? 'Complete Mastery' : 'Review & Retry') : 'Submit Test';
        break;
      case 'mastery':
        nextLabel = 'Complete Game';
        break;
    }

    return { isFirst, isLast, canProceed, nextLabel };
  };

  const renderBottomBar = () => {
    const { isFirst, isLast, canProceed, nextLabel } = getBottomBarConfig();

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
        gap: '12px',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 'bold',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>
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
            fontSize: '14px',
            flex: 1,
            maxWidth: '300px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Render phase content
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
                Inverter Sine Wave Synthesis
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                How do inverters create AC from DC?
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
                  Solar panels produce DC power, but the grid and most appliances need AC. An <strong style={{ color: colors.ac }}>inverter</strong> must
                  synthesize a smooth sinusoidal waveform from switched DC. Poor waveform quality wastes energy and damages equipment!
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Switch between Square, Modified Sine, and PWM Sine to see how waveform quality improves!
                </p>
              </div>
            </div>
          </>
        );

      case 'predict':
        return (
          <>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                DC voltage is fed to an H-bridge (4 switches) that can connect the output to +DC, -DC, or zero.
                The output then passes through an LC (inductor-capacitor) filter to smooth it out.
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                How does an inverter create a smooth sine wave from DC?
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
          </>
        );

      case 'play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Waveform Synthesis</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Compare different inverter technologies
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
                <li>Compare THD between Square (48%), Modified (24%), and PWM (&lt;5%)</li>
                <li>With PWM, increase switching frequency and see THD improve</li>
                <li>Note: PWM with filtering produces nearly perfect sine waves</li>
                <li>Grid-tied inverters require THD under 5% by law!</li>
              </ul>
            </div>
          </>
        );

      case 'review':
        const wasCorrect = prediction === 'pwm_filter';
        return (
          <>
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
                <strong>PWM + low-pass filtering</strong> is the key! By switching at high frequency with a duty cycle
                that varies sinusoidally, then filtering out the high-frequency components, we get a clean sine wave.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>How Sine Wave Synthesis Works</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>H-Bridge Switching:</strong> Four MOSFETs arranged in
                  an H can connect the output to +V, -V, or 0V. This creates the basic alternating polarity.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>PWM Modulation:</strong> Instead of switching at
                  the output frequency (60Hz), we switch at 10-50kHz with duty cycle following a sine pattern.
                  The average voltage traces out a sine wave.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>LC Filter:</strong> A low-pass filter (inductor +
                  capacitor) removes the high-frequency PWM components, leaving only the fundamental sine wave.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Total Harmonic Distortion (THD):</strong> Measures
                  how much the output deviates from a pure sine. Grid-tied inverters must achieve &lt;5% THD.
                </p>
              </div>
            </div>
          </>
        );

      case 'twist_predict':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                What happens when you run motors on non-sine waves?
              </p>
            </div>

            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A cheap square-wave or modified-sine inverter is connected to a refrigerator, air conditioner,
                or power tools with motors. The waveform has high harmonic content (THD &gt; 25%).
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                What happens to motors running on distorted waveforms?
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
          </>
        );

      case 'twist_play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Harmonic Effects</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                See how harmonics affect power quality
              </p>
            </div>

            {renderVisualization(true)}
            {renderControls()}

            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.error}`,
            }}>
              <h4 style={{ color: colors.error, marginBottom: '8px' }}>Real Problems with Poor Waveforms:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
                <li><strong>Motors:</strong> Harmonics create torque pulsations, vibration, and 15-25% more heat</li>
                <li><strong>Transformers:</strong> Eddy current losses increase dramatically with harmonic frequency</li>
                <li><strong>Electronics:</strong> Switching power supplies may malfunction or make noise</li>
                <li><strong>Energy waste:</strong> Harmonics contribute to reactive power, increasing losses</li>
              </ul>
            </div>
          </>
        );

      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'motor_heat';
        return (
          <>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistWasCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Motors and transformers are highly sensitive to harmonics. The extra frequency components create
                additional losses, vibration, noise, and <strong>significant overheating</strong> that can
                reduce equipment lifespan by 50% or more.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Harmonics Cause Problems</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Motor Heating:</strong> Harmonics (3rd, 5th, 7th...)
                  induce currents in the rotor that the motor is not designed to handle. These create heat without
                  producing useful torque.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Transformer Losses:</strong> Eddy current losses
                  scale with frequency squared. The 7th harmonic (420Hz) causes 49x more eddy current loss than
                  the fundamental!
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Equipment Ratings:</strong> Motors on distorted
                  power must be derated by 10-30%. Many manufacturers void warranties if THD exceeds limits.
                  This is why pure sine inverters are essential for inductive loads.
                </p>
              </div>
            </div>
          </>
        );

      case 'transfer':
        return (
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Inverters are critical in renewable energy and power electronics
            </p>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  margin: '16px 0',
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
                    style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
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
        );

      case 'test':
        if (testSubmitted) {
          return (
            <>
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
            </>
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
              )}
            </div>
          </div>
        );

      case 'mastery':
        return (
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
              <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered inverter sine wave synthesis</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>H-bridge switching to create AC from DC</li>
                <li>PWM modulation with sinusoidal duty cycle</li>
                <li>LC filtering to remove switching harmonics</li>
                <li>Total Harmonic Distortion (THD) and its effects</li>
                <li>Why pure sine inverters matter for motors</li>
                <li>Grid synchronization requirements</li>
              </ul>
            </div>
            {renderVisualization(true)}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default InverterSineWaveRenderer;
