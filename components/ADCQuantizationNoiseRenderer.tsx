'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// =============================================================================
// ADC Quantization Noise - Complete 10-Phase Game (#256)
// Understanding how analog-to-digital conversion introduces quantization noise,
// bit depth, sampling rate, SNR, and the staircase approximation of signals.
// =============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ADCQuantizationNoiseRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: 'An audio engineer records a concert using a 16-bit ADC at 44.1 kHz. She notices the quiet passages sound clean, but a colleague claims an 8-bit recording would have been fine.',
    question: 'What is the theoretical SNR improvement of a 16-bit ADC over an 8-bit ADC?',
    options: [
      { id: 'a', label: 'About 6 dB better' },
      { id: 'b', label: 'About 48 dB better (8 extra bits x 6.02 dB/bit)', correct: true },
      { id: 'c', label: 'About 96 dB better' },
      { id: 'd', label: 'They have the same SNR if the sampling rate is the same' },
    ],
    explanation: 'Each additional bit of resolution improves SNR by approximately 6.02 dB. Going from 8-bit to 16-bit adds 8 bits, yielding about 8 x 6.02 = 48.16 dB improvement. The 16-bit ADC achieves ~98 dB SNR vs ~50 dB for 8-bit.',
  },
  {
    scenario: 'A sensor system uses a 12-bit ADC with a 0-5V input range. The measured ENOB (Effective Number of Bits) is only 10.2 bits.',
    question: 'What does the gap between 12 ideal bits and 10.2 ENOB indicate?',
    options: [
      { id: 'a', label: 'The ADC is defective and should be returned' },
      { id: 'b', label: 'Non-ideal factors (noise, distortion, DNL/INL) degrade actual resolution below the ideal', correct: true },
      { id: 'c', label: 'The sampling rate is too low for the input signal' },
      { id: 'd', label: 'The input voltage exceeds the ADC range' },
    ],
    explanation: 'ENOB accounts for all real-world imperfections: thermal noise, harmonic distortion, differential and integral nonlinearity (DNL/INL). The formula is ENOB = (SINAD - 1.76) / 6.02. A 12-bit ADC rarely achieves a full 12 ENOB in practice.',
  },
  {
    scenario: 'A radar system digitizes a received signal with a 14-bit ADC. The quantization step size (LSB) is 0.5 mV. The input signal has a peak-to-peak amplitude of 4V.',
    question: 'How many quantization levels does this ADC provide?',
    options: [
      { id: 'a', label: '14 levels (one per bit)' },
      { id: 'b', label: '4096 levels' },
      { id: 'c', label: '16,384 levels (2^14)', correct: true },
      { id: 'd', label: '8,192 levels (2^14 / 2)' },
    ],
    explanation: 'An N-bit ADC provides 2^N quantization levels. For 14 bits: 2^14 = 16,384 distinct levels. With a full-scale range of ~8.19V (16384 x 0.5 mV), the 4V signal uses roughly half the available range.',
  },
  {
    scenario: 'A digital audio workstation shows quantization error uniformly distributed between -LSB/2 and +LSB/2 for a sinusoidal input signal.',
    question: 'What is the RMS value of this uniformly distributed quantization error?',
    options: [
      { id: 'a', label: 'LSB / 2' },
      { id: 'b', label: 'LSB / sqrt(12)', correct: true },
      { id: 'c', label: 'LSB / 4' },
      { id: 'd', label: 'LSB x sqrt(2)' },
    ],
    explanation: 'For a uniform distribution from -LSB/2 to +LSB/2, the RMS value (standard deviation) is LSB / sqrt(12). This is a fundamental result in quantization theory and is used to derive the SNR formula: SNR = 6.02N + 1.76 dB.',
  },
  {
    scenario: 'An engineer is designing a precision temperature measurement system. She needs at least 80 dB SNR from the ADC alone.',
    question: 'What is the minimum number of bits required to achieve 80 dB SNR from quantization alone?',
    options: [
      { id: 'a', label: '10 bits (giving ~62 dB)' },
      { id: 'b', label: '12 bits (giving ~74 dB)' },
      { id: 'c', label: '13 bits (giving ~80 dB)', correct: true },
      { id: 'd', label: '16 bits (giving ~98 dB)' },
    ],
    explanation: 'Using SNR = 6.02N + 1.76, solving for N: N = (80 - 1.76) / 6.02 = 12.99, so 13 bits minimum. A 12-bit ADC gives only ~74 dB, falling short. In practice, you would choose 14 or 16 bits to have margin.',
  },
  {
    scenario: 'A sigma-delta ADC oversamples at 256x the Nyquist rate, then digitally filters and decimates the output.',
    question: 'Approximately how many additional bits of resolution does 256x oversampling provide (assuming white quantization noise)?',
    options: [
      { id: 'a', label: '1 extra bit' },
      { id: 'b', label: '4 extra bits (each 4x oversampling gives 1 bit)', correct: true },
      { id: 'c', label: '8 extra bits (256 / 32)' },
      { id: 'd', label: '256 extra bits' },
    ],
    explanation: 'Oversampling by a factor of K improves SNR by 10*log10(K) dB, or equivalently adds log2(sqrt(K)) = 0.5*log2(K) bits. For K=256: 0.5*log2(256) = 0.5*8 = 4 extra bits. Each 4x oversampling ratio yields 1 additional bit of resolution.',
  },
  {
    scenario: 'A communications receiver adds a small amount of random noise (dither) to the input signal before quantizing with a low-resolution ADC.',
    question: 'Why does adding noise (dithering) actually improve the ADC output quality?',
    options: [
      { id: 'a', label: 'The added noise cancels the signal noise' },
      { id: 'b', label: 'Dither randomizes quantization error, converting it from distortion to broadband noise that can be filtered', correct: true },
      { id: 'c', label: 'Dither increases the effective sampling rate' },
      { id: 'd', label: 'Dither reduces the number of quantization levels needed' },
    ],
    explanation: 'Without dither, quantization error is correlated with the signal, creating harmonic distortion. Adding ~1 LSB of random noise decorrelates the error, spreading it uniformly across the spectrum as white noise. This noise can then be filtered, yielding cleaner output.',
  },
  {
    scenario: 'An oscilloscope displays a 1 kHz sine wave digitized at 8 bits. The waveform looks like a smooth staircase with visible steps.',
    question: 'If the ADC resolution is changed to 4 bits, how do the quantization steps change?',
    options: [
      { id: 'a', label: 'Steps become 2x larger' },
      { id: 'b', label: 'Steps become 4x larger' },
      { id: 'c', label: 'Steps become 16x larger (2^8/2^4 = 16)', correct: true },
      { id: 'd', label: 'The number of steps halves but size stays the same' },
    ],
    explanation: 'Going from 8-bit (256 levels) to 4-bit (16 levels) means 16x fewer quantization levels for the same voltage range. Each step becomes 16x taller, making the staircase much coarser and the quantization error much larger.',
  },
  {
    scenario: 'A software-defined radio uses a 16-bit ADC but the analog front-end only delivers 60 dB SNR to the ADC input.',
    question: 'What is the ENOB limited by the analog front-end noise?',
    options: [
      { id: 'a', label: 'Still 16 bits since the ADC has 16-bit resolution' },
      { id: 'b', label: 'About 9.7 bits, limited by the 60 dB input SNR', correct: true },
      { id: 'c', label: 'About 12 bits, the average of ADC and front-end' },
      { id: 'd', label: '0 bits since the front-end is noisy' },
    ],
    explanation: 'ENOB = (SINAD - 1.76) / 6.02. With only 60 dB SNR from the front-end, ENOB = (60 - 1.76) / 6.02 = 9.67 bits. No matter how good the ADC is, the system resolution is limited by the noisiest component. Those extra 6 bits of ADC resolution are wasted.',
  },
  {
    scenario: 'A noise-shaping sigma-delta ADC pushes quantization noise to higher frequencies, then uses a digital low-pass filter to remove it.',
    question: 'Why is noise shaping more effective than simple oversampling alone?',
    options: [
      { id: 'a', label: 'Noise shaping eliminates quantization noise entirely' },
      { id: 'b', label: 'Noise shaping redistributes noise spectrum, pushing most noise out of the signal band where it is filtered away', correct: true },
      { id: 'c', label: 'Noise shaping increases the ADC clock frequency' },
      { id: 'd', label: 'Noise shaping reduces the number of bits needed to zero' },
    ],
    explanation: 'Simple oversampling spreads noise uniformly across a wider bandwidth. Noise shaping actively pushes quantization noise to higher frequencies using feedback. A digital filter then removes the out-of-band noise. This yields much greater resolution improvement per oversampling ratio than simple oversampling.',
  },
];

// =============================================================================
// REAL WORLD APPLICATIONS
// =============================================================================
const realWorldApps = [
  {
    icon: '🎵',
    title: 'Digital Audio (CD, Streaming)',
    short: 'Music and voice recording',
    tagline: 'Why CD audio uses 16-bit / 44.1 kHz',
    description: 'CD audio uses 16-bit resolution at 44.1 kHz sampling rate, providing ~96 dB dynamic range. Modern hi-res audio uses 24-bit / 192 kHz for even greater fidelity, though human hearing has limits around 120 dB dynamic range.',
    connection: 'Quantization noise determines the noise floor of digital audio. With 16 bits, quiet passages can be ~96 dB below full scale before quantization noise becomes audible. Dithering is always applied before reducing bit depth to avoid distortion artifacts.',
    howItWorks: 'A microphone produces an analog voltage. The ADC samples this voltage thousands of times per second, quantizing each sample to the nearest digital level. More bits = more levels = finer resolution = lower noise floor.',
    stats: [
      { value: '16 bit', label: 'CD audio standard', icon: '💿' },
      { value: '96 dB', label: 'CD dynamic range', icon: '📊' },
      { value: '44.1 kHz', label: 'CD sampling rate', icon: '🔊' },
    ],
    examples: ['CD players', 'Spotify/Apple Music streaming', 'Studio recording', 'Bluetooth audio codecs'],
    companies: ['Texas Instruments', 'AKM', 'ESS Technology', 'Cirrus Logic'],
    futureImpact: 'Immersive spatial audio and object-based formats (Dolby Atmos) demand higher channel counts and resolution, pushing ADC technology toward lower noise and higher sample rates.',
    color: '#8B5CF6',
  },
  {
    icon: '📷',
    title: 'Digital Imaging (Cameras, Medical)',
    short: 'Image sensor digitization',
    tagline: 'Every pixel is an ADC conversion',
    description: 'Digital cameras convert photon-generated charge to digital values using column-parallel ADCs. A 20 megapixel sensor performs 20 million ADC conversions per frame. Medical imaging (CT, MRI) requires even higher precision for diagnostic accuracy.',
    connection: 'In imaging, quantization noise manifests as banding in smooth gradients and reduced contrast in shadows. Higher bit depth (12-14 bit RAW) preserves detail in highlights and shadows that 8-bit JPEG cannot capture.',
    howItWorks: 'Each pixel accumulates charge proportional to light. Column ADCs convert this analog charge to digital values. The bit depth determines how many brightness levels can be distinguished. 14-bit RAW captures 16,384 levels vs JPEG\'s 256.',
    stats: [
      { value: '14 bit', label: 'Modern camera RAW depth', icon: '📸' },
      { value: '20M+', label: 'ADC conversions per frame', icon: '🖼️' },
      { value: '16 bit', label: 'Medical imaging depth', icon: '🏥' },
    ],
    examples: ['DSLR/mirrorless cameras', 'CT scanners', 'X-ray detectors', 'Satellite imaging'],
    companies: ['Sony Semiconductor', 'Samsung LSI', 'ON Semiconductor', 'Canon'],
    futureImpact: 'Computational photography and AI-driven image processing are pushing sensors toward higher dynamic range ADCs with on-chip noise shaping.',
    color: '#10B981',
  },
  {
    icon: '📡',
    title: '5G and Software-Defined Radio',
    short: 'Wideband wireless digitization',
    tagline: 'Digitizing the entire radio spectrum',
    description: 'Modern radio receivers digitize wide swaths of spectrum using high-speed ADCs. 5G base stations use 14-bit ADCs sampling at several GHz to capture and process multiple channels simultaneously.',
    connection: 'ADC quantization noise sets the receiver sensitivity floor. Each bit of resolution adds ~6 dB of dynamic range, allowing the receiver to handle both strong nearby signals and weak distant signals simultaneously (spurious-free dynamic range).',
    howItWorks: 'The antenna receives all signals in a band. After amplification and filtering, a high-speed ADC digitizes the entire band. Digital signal processing then separates, demodulates, and decodes individual channels - all in the digital domain.',
    stats: [
      { value: '14 bit', label: 'Typical RF ADC resolution', icon: '📶' },
      { value: '4 GSPS', label: 'Sampling speed', icon: '⚡' },
      { value: '2 GHz', label: 'Instantaneous bandwidth', icon: '📻' },
    ],
    examples: ['5G NR base stations', 'Phased array radar', 'Spectrum analyzers', 'Electronic warfare'],
    companies: ['Analog Devices', 'Texas Instruments', 'Renesas', 'Xilinx/AMD'],
    futureImpact: '6G systems will require ADCs with 100+ GHz bandwidth, pushing the limits of silicon technology and requiring novel architectures like time-interleaved and photonic ADCs.',
    color: '#3B82F6',
  },
  {
    icon: '🔬',
    title: 'Scientific Instrumentation',
    short: 'Precision measurement systems',
    tagline: 'When every microvolt matters',
    description: 'Scientific instruments like oscilloscopes, spectrum analyzers, and data acquisition systems use high-resolution ADCs (24-32 bit sigma-delta) to capture tiny signals with extreme precision.',
    connection: 'In precision measurements, quantization noise must be far below the signal of interest. A 24-bit ADC provides 144 dB theoretical dynamic range, allowing measurement of microvolt signals on a volt-scale input. Oversampling and noise shaping are essential.',
    howItWorks: 'Sigma-delta ADCs use 1-bit quantization at very high oversampling rates (MHz), then noise shaping pushes quantization noise out of the signal band. Digital decimation filters produce high-resolution output at lower rates.',
    stats: [
      { value: '32 bit', label: 'Max sigma-delta resolution', icon: '🎯' },
      { value: '144 dB', label: '24-bit dynamic range', icon: '📏' },
      { value: 'nV', label: 'Noise floor achievable', icon: '🔍' },
    ],
    examples: ['Precision multimeters', 'Seismographs', 'Biomedical sensors (EEG/ECG)', 'Strain gauge bridges'],
    companies: ['Analog Devices', 'Texas Instruments', 'Linear Technology', 'National Instruments'],
    futureImpact: 'Quantum sensing and single-molecule detection will push ADC requirements beyond current technology, requiring cryogenic electronics and novel quantum-limited amplifiers.',
    color: '#F59E0B',
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ADCQuantizationNoiseRenderer: React.FC<ADCQuantizationNoiseRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();

  // Simulation state
  const [bitDepth, setBitDepth] = useState(8);
  const [inputFrequency, setInputFrequency] = useState(3); // Hz for visualization
  const [inputAmplitude, setInputAmplitude] = useState(0.9); // 0-1 fraction of full scale
  const [samplingRate, setSamplingRate] = useState(40); // samples per period for visualization
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state
  const [oversamplingFactor, setOversamplingFactor] = useState(1);
  const [ditheringEnabled, setDitheringEnabled] = useState(false);
  const [ditherAmplitude, setDitherAmplitude] = useState(0.5); // fraction of LSB

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict phase step tracking
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  // Emit game event helper
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'adc_quantization_noise',
      gameTitle: 'ADC Quantization Noise',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  // Fire game_started on mount
  useEffect(() => {
    emitEvent('game_started', { phase: 'hook' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#6366f1',      // Indigo for mixed-signal theme
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    accentLight: '#818cf8',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    analogSignal: '#3B82F6',  // Blue for analog
    digitalSignal: '#22C55E', // Green for digital/quantized
    errorFill: '#EF4444',     // Red for quantization error
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitEvent('phase_changed', { from: phase, to: p });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // =============================================================================
  // ADC CALCULATIONS
  // =============================================================================
  const adcMetrics = useMemo(() => {
    const numLevels = Math.pow(2, bitDepth);
    const lsbSize = 1.0 / numLevels; // normalized 0-1
    const snrIdeal = 6.02 * bitDepth + 1.76; // dB
    const quantErrorRMS = lsbSize / Math.sqrt(12);
    const oversamplingGain = 10 * Math.log10(oversamplingFactor); // dB
    const effectiveBitsFromOversampling = 0.5 * Math.log2(oversamplingFactor);
    const effectiveSNR = snrIdeal + oversamplingGain;
    const enob = (effectiveSNR - 1.76) / 6.02;

    return {
      numLevels,
      lsbSize,
      snrIdeal,
      quantErrorRMS,
      oversamplingGain,
      effectiveBitsFromOversampling,
      effectiveSNR,
      enob,
    };
  }, [bitDepth, oversamplingFactor]);

  // Pseudo-random for dither (seeded by sample index)
  const pseudoRandom = useCallback((seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return (x - Math.floor(x)) - 0.5; // -0.5 to +0.5
  }, []);

  // Quantize a value
  const quantize = useCallback((value: number, bits: number) => {
    const levels = Math.pow(2, bits);
    const step = 1.0 / levels;
    return Math.round(value / step) * step;
  }, []);

  // =============================================================================
  // SVG VISUALIZATION: Main ADC Signal + Staircase + Error
  // =============================================================================
  const renderADCVisualization = (showError = true, showHistogram = true, showOversampling = false) => {
    const svgWidth = isMobile ? 340 : 520;
    const mainHeight = showHistogram ? (isMobile ? 200 : 250) : (isMobile ? 240 : 300);
    const histHeight = showHistogram ? (isMobile ? 100 : 120) : 0;
    const snrBarH = 40;
    const totalHeight = mainHeight + histHeight + snrBarH + 20;
    const pad = { top: 30, right: 20, bottom: 10, left: 50 };
    const plotW = svgWidth - pad.left - pad.right;
    const plotH = mainHeight - pad.top - pad.bottom;

    const numLevels = Math.pow(2, bitDepth);
    const lsbPx = plotH / numLevels;
    const numSamples = samplingRate;
    const timeOffset = animationFrame * 0.02;

    // Generate analog signal points
    const analogPoints: { x: number; y: number; val: number }[] = [];
    const resolution = 200;
    for (let i = 0; i <= resolution; i++) {
      const t = i / resolution;
      const val = 0.5 + inputAmplitude * 0.5 * Math.sin(2 * Math.PI * inputFrequency * t + timeOffset);
      const clamped = Math.max(0, Math.min(1, val));
      const x = pad.left + t * plotW;
      const y = pad.top + plotH - clamped * plotH;
      analogPoints.push({ x, y, val: clamped });
    }

    // Generate sampled + quantized points
    const sampledPoints: { x: number; y: number; yAnalog: number; val: number; analogVal: number; error: number }[] = [];
    const effectiveSamples = showOversampling ? numSamples * oversamplingFactor : numSamples;
    const displaySamples = Math.min(effectiveSamples, 200);

    for (let i = 0; i < displaySamples; i++) {
      const t = i / displaySamples;
      let val = 0.5 + inputAmplitude * 0.5 * Math.sin(2 * Math.PI * inputFrequency * t + timeOffset);

      // Add dither if enabled
      if (ditheringEnabled && showOversampling) {
        val += ditherAmplitude * (1.0 / numLevels) * pseudoRandom(i + animationFrame * 100);
      }

      const clamped = Math.max(0, Math.min(1, val));
      const quantized = quantize(clamped, bitDepth);
      const error = clamped - quantized;
      const x = pad.left + t * plotW;
      const yQ = pad.top + plotH - Math.max(0, Math.min(1, quantized)) * plotH;
      const yA = pad.top + plotH - clamped * plotH;
      sampledPoints.push({ x, y: yQ, yAnalog: yA, val: quantized, analogVal: clamped, error });
    }

    // Build analog path
    const analogPath = analogPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Build staircase path (stepped)
    let staircasePath = '';
    for (let i = 0; i < sampledPoints.length; i++) {
      const curr = sampledPoints[i];
      if (i === 0) {
        staircasePath = `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      } else {
        // Horizontal then vertical step
        staircasePath += ` L ${curr.x.toFixed(1)} ${sampledPoints[i - 1].y.toFixed(1)}`;
        staircasePath += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      }
    }

    // Build error fill polygon (area between analog and staircase)
    let errorFillPath = '';
    if (showError && sampledPoints.length > 1) {
      // Forward along analog
      const forwardParts: string[] = [];
      const backParts: string[] = [];
      for (let i = 0; i < sampledPoints.length; i++) {
        const sp = sampledPoints[i];
        forwardParts.push(`${i === 0 ? 'M' : 'L'} ${sp.x.toFixed(1)} ${sp.yAnalog.toFixed(1)}`);
      }
      // Backward along quantized staircase
      for (let i = sampledPoints.length - 1; i >= 0; i--) {
        backParts.push(`L ${sampledPoints[i].x.toFixed(1)} ${sampledPoints[i].y.toFixed(1)}`);
      }
      errorFillPath = forwardParts.join(' ') + ' ' + backParts.join(' ') + ' Z';
    }

    // Error waveform for sub-plot
    const errorWavePoints = sampledPoints.map(sp => ({
      x: sp.x,
      y: sp.error,
    }));

    // Error histogram bins
    const histBins = 20;
    const histCounts = new Array(histBins).fill(0);
    const halfLsb = 0.5 / numLevels;
    sampledPoints.forEach(sp => {
      const normalized = (sp.error + halfLsb) / (2 * halfLsb); // 0 to 1
      const bin = Math.min(histBins - 1, Math.max(0, Math.floor(normalized * histBins)));
      histCounts[bin]++;
    });
    const maxCount = Math.max(...histCounts, 1);

    // Quantization level markers
    const levelMarkers: number[] = [];
    const maxMarkers = Math.min(numLevels + 1, 33);
    const step = numLevels <= 32 ? 1 : Math.ceil(numLevels / 16);
    for (let i = 0; i <= numLevels && levelMarkers.length < maxMarkers; i += step) {
      levelMarkers.push(i);
    }

    const snr = showOversampling ? adcMetrics.effectiveSNR : adcMetrics.snrIdeal;
    const snrMax = 120;
    const snrFrac = Math.min(snr / snrMax, 1);

    return (
      <svg
        width={svgWidth}
        height={totalHeight}
        viewBox={`0 0 ${svgWidth} ${totalHeight}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="ADC Quantization Noise visualization"
      >
        <defs>
          <linearGradient id="analogGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.analogSignal} stopOpacity="1" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="digitalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.digitalSignal} stopOpacity="1" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="snrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.success} />
          </linearGradient>
          <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={totalHeight} fill={colors.bgCard} rx="12" />

        {/* Title */}
        <text x={svgWidth / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Analog vs Quantized Signal ({bitDepth}-bit, {numLevels} levels)
        </text>

        {/* Quantization level grid lines */}
        {levelMarkers.map(lvl => {
          const yPos = pad.top + plotH - (lvl / numLevels) * plotH;
          return (
            <g key={`lvl-${lvl}`}>
              <line x1={pad.left} y1={yPos} x2={pad.left + plotW} y2={yPos} stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,4" opacity="0.4" />
              {numLevels <= 32 && (
                <text x={pad.left - 4} y={yPos + 3} fill={colors.textMuted} fontSize="8" textAnchor="end">{lvl}</text>
              )}
            </g>
          );
        })}

        {/* Y axis label */}
        <text x={12} y={pad.top + plotH / 2} fill={colors.textMuted} fontSize="10" textAnchor="middle" transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}>
          Amplitude
        </text>

        {/* Error fill between curves */}
        {showError && errorFillPath && (
          <path d={errorFillPath} fill={colors.errorFill} opacity="0.2" />
        )}

        {/* Analog signal (smooth blue line) */}
        <path d={analogPath} fill="none" stroke="url(#analogGrad)" strokeWidth="2.5" filter="url(#glowBlue)" />

        {/* Quantized staircase (green stepped line) */}
        <path d={staircasePath} fill="none" stroke="url(#digitalGrad)" strokeWidth="2" />

        {/* Sample dots on staircase */}
        {sampledPoints.filter((_, i) => i % Math.max(1, Math.floor(sampledPoints.length / 40)) === 0).map((sp, i) => (
          <circle key={`dot-${i}`} cx={sp.x} cy={sp.y} r="2.5" fill={colors.digitalSignal} opacity="0.8" />
        ))}

        {/* Legend */}
        <line x1={pad.left + 10} y1={mainHeight - 6} x2={pad.left + 30} y2={mainHeight - 6} stroke={colors.analogSignal} strokeWidth="2.5" />
        <text x={pad.left + 34} y={mainHeight - 2} fill={colors.textMuted} fontSize="10">Analog</text>
        <line x1={pad.left + 90} y1={mainHeight - 6} x2={pad.left + 110} y2={mainHeight - 6} stroke={colors.digitalSignal} strokeWidth="2" />
        <text x={pad.left + 114} y={mainHeight - 2} fill={colors.textMuted} fontSize="10">Quantized</text>
        {showError && (
          <>
            <rect x={pad.left + 180} y={mainHeight - 11} width="16" height="8" fill={colors.errorFill} opacity="0.35" rx="1" />
            <text x={pad.left + 200} y={mainHeight - 2} fill={colors.textMuted} fontSize="10">Error</text>
          </>
        )}

        {/* ---- Error histogram below ---- */}
        {showHistogram && (
          <g transform={`translate(0, ${mainHeight + 5})`}>
            <text x={svgWidth / 2} y={12} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
              Quantization Error Distribution
            </text>
            {histCounts.map((count, i) => {
              const barW = (plotW / histBins) - 1;
              const barH = (count / maxCount) * (histHeight - 30);
              const barX = pad.left + i * (plotW / histBins) + 0.5;
              const barY = histHeight - 5 - barH;
              return (
                <rect key={`hist-${i}`} x={barX} y={barY} width={barW} height={barH} fill={colors.errorFill} opacity="0.6" rx="1" />
              );
            })}
            <text x={pad.left} y={histHeight - 1} fill={colors.textMuted} fontSize="9">-LSB/2</text>
            <text x={pad.left + plotW} y={histHeight - 1} fill={colors.textMuted} fontSize="9" textAnchor="end">+LSB/2</text>
            <line x1={pad.left} y1={histHeight - 5} x2={pad.left + plotW} y2={histHeight - 5} stroke={colors.border} strokeWidth="1" />
          </g>
        )}

        {/* SNR gauge bar */}
        <g transform={`translate(0, ${mainHeight + histHeight + 10})`}>
          <text x={pad.left} y={10} fill={colors.textSecondary} fontSize="11" fontWeight="600">
            SNR: {snr.toFixed(1)} dB
          </text>
          <text x={pad.left + plotW} y={10} fill={colors.textMuted} fontSize="9" textAnchor="end">
            ({bitDepth}-bit ideal: {adcMetrics.snrIdeal.toFixed(1)} dB)
          </text>
          <rect x={pad.left} y={16} width={plotW} height={12} fill={colors.bgSecondary} rx="6" />
          <rect x={pad.left} y={16} width={plotW * snrFrac} height={12} fill="url(#snrGrad)" rx="6" />
          <text x={pad.left + plotW * snrFrac + 4} y={26} fill={colors.textPrimary} fontSize="9" fontWeight="600">
            {snr.toFixed(0)} dB
          </text>
        </g>
      </svg>
    );
  };

  // =============================================================================
  // SHARED UI COMPONENTS
  // =============================================================================
  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '48px',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: `0 4px 15px ${colors.accentGlow}`,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: `2px solid ${colors.border}`,
    background: colors.bgCard,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '15px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '48px',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: isMobile ? '20px' : '28px',
    border: `1px solid ${colors.border}`,
  };

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  };

  // Progress bar
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 1001 }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentLight})`, transition: 'width 0.4s ease' }} />
      </div>
    );
  };

  // Nav bar
  const renderNavBar = () => (
    <div style={{
      position: 'fixed', top: '4px', left: 0, right: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 20px',
      background: `linear-gradient(180deg, ${colors.bgPrimary}ee, ${colors.bgPrimary}88)`,
      backdropFilter: 'blur(12px)',
    }}>
      <button onClick={prevPhase} disabled={phase === 'hook'} style={{ ...secondaryButtonStyle, padding: '8px 16px', minHeight: '36px', fontSize: '13px', opacity: phase === 'hook' ? 0.3 : 1 }}>
        Back
      </button>
      <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </span>
      <button onClick={nextPhase} disabled={phase === 'mastery'} style={{ ...secondaryButtonStyle, padding: '8px 16px', minHeight: '36px', fontSize: '13px', opacity: phase === 'mastery' ? 0.3 : 1 }}>
        Next
      </button>
    </div>
  );

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px', flexWrap: 'wrap' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          style={{
            width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
            background: p === phase ? colors.accent : phaseOrder.indexOf(phase) > i ? colors.success : colors.border,
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );

  // Slider component
  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit: string = '', formatFn?: (v: number) => string) => (
    <div style={sliderContainerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{label}</span>
        <span style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>
          {formatFn ? formatFn(value) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const v = parseFloat(e.target.value);
          onChange(v);
          emitEvent('slider_changed', { label, value: v });
        }}
        style={{ width: '100%', accentColor: colors.accent, cursor: 'pointer' }}
      />
    </div>
  );

  // Side-by-side layout
  const renderSideBySide = (svgContent: React.ReactNode, controlsContent: React.ReactNode) => (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      alignItems: isMobile ? 'center' : 'flex-start',
      width: '100%',
    }}>
      <div style={{ flex: isMobile ? 'none' : '1 1 55%', minWidth: 0 }}>
        {svgContent}
      </div>
      <div style={{ flex: isMobile ? 'none' : '1 1 45%', width: isMobile ? '100%' : 'auto' }}>
        {controlsContent}
      </div>
    </div>
  );

  // Page wrapper
  const pageWrap = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {renderNavBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px',
        paddingTop: '72px', maxWidth: '1000px', margin: '0 auto', width: '100%',
      }}>
        {content}
      </div>
      {renderNavDots()}
    </div>
  );

  // =============================================================================
  // HOOK PHASE
  // =============================================================================
  if (phase === 'hook') {
    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
        <div style={{ fontSize: '72px', marginBottom: '8px' }}>🎛️</div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, margin: 0 }}>
          Why Does Your Digital Audio Sound Grainy?
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px' }}>
          Every time you listen to music, take a photo, or measure a sensor reading, an <strong style={{ color: colors.analogSignal }}>analog signal</strong> is converted into <strong style={{ color: colors.digitalSignal }}>digital numbers</strong>. But numbers have limited precision, and that creates <strong style={{ color: colors.errorFill }}>quantization noise</strong>.
        </p>

        <div style={{ ...cardStyle, maxWidth: '600px', textAlign: 'left' }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginTop: 0 }}>The Core Problem</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            A smooth analog waveform has infinite precision. But an ADC (Analog-to-Digital Converter) can only output a fixed number of discrete levels. The difference between the true analog value and the nearest digital level is <strong style={{ color: colors.errorFill }}>quantization error</strong>.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            More bits = more levels = smaller steps = less error = better sound quality. That is why bit depth matters.
          </p>
        </div>

        {renderADCVisualization(true, false, false)}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: '3-bit (8 levels)', bits: 3, color: colors.error },
            { label: '8-bit (256 levels)', bits: 8, color: colors.warning },
            { label: '16-bit (65536 levels)', bits: 16, color: colors.success },
          ].map(preset => (
            <button
              key={preset.bits}
              onClick={() => { setBitDepth(preset.bits); playSound('click'); }}
              style={{
                ...secondaryButtonStyle,
                padding: '10px 16px',
                minHeight: '40px',
                fontSize: '13px',
                borderColor: bitDepth === preset.bits ? preset.color : colors.border,
                color: bitDepth === preset.bits ? preset.color : colors.textMuted,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button onClick={nextPhase} style={primaryButtonStyle}>
          Make a Prediction
        </button>
      </div>
    );
  }

  // =============================================================================
  // PREDICT PHASE
  // =============================================================================
  if (phase === 'predict') {
    const predictions = [
      { id: 'much_worse_4', label: '4-bit will have dramatically more error (visible staircase, distorted sound)' },
      { id: 'slightly_worse_4', label: '4-bit will be slightly worse, but still acceptable' },
      { id: 'same', label: 'Both 4-bit and 12-bit will look about the same' },
      { id: 'much_better_12', label: '12-bit will have ~48 dB less noise (nearly invisible error)' },
    ];

    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Predict: 4-bit vs 12-bit ADC
        </h2>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.accent}` }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            Imagine you have two ADCs converting the same 1 kHz sine wave. One uses <strong style={{ color: colors.warning }}>4-bit resolution</strong> (16 levels) and the other uses <strong style={{ color: colors.success }}>12-bit resolution</strong> (4,096 levels). How will the quantization error compare?
          </p>
        </div>

        {predictStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ ...typo.small, color: colors.textMuted }}>Select your prediction:</p>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPrediction(p.id);
                  playSound('click');
                  emitEvent('prediction_made', { prediction: p.id });
                }}
                style={{
                  ...secondaryButtonStyle,
                  textAlign: 'left',
                  borderColor: prediction === p.id ? colors.accent : colors.border,
                  background: prediction === p.id ? `${colors.accent}15` : colors.bgCard,
                }}
              >
                <span style={{ color: prediction === p.id ? colors.accent : colors.textSecondary, ...typo.small }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {prediction && predictStep === 0 && (
          <button onClick={() => { setPredictStep(1); playSound('transition'); }} style={primaryButtonStyle}>
            See the Result
          </button>
        )}

        {predictStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', width: '100%' }}>
              <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginTop: 0 }}>4-bit ADC</h3>
                <p style={{ ...typo.small, color: colors.textMuted }}>SNR = {(6.02 * 4 + 1.76).toFixed(1)} dB</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>16 levels, huge steps</p>
              </div>
              <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginTop: 0 }}>12-bit ADC</h3>
                <p style={{ ...typo.small, color: colors.textMuted }}>SNR = {(6.02 * 12 + 1.76).toFixed(1)} dB</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>4,096 levels, tiny steps</p>
              </div>
            </div>

            <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.success}`, width: '100%' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>The correct answer:</strong> 12-bit has about <strong>48 dB</strong> less quantization noise than 4-bit (8 extra bits x 6.02 dB/bit). The staircase steps are 256x smaller. The formula is <strong style={{ color: colors.accent }}>SNR = 6.02N + 1.76 dB</strong>, where N is the number of bits.
              </p>
            </div>

            <button onClick={nextPhase} style={primaryButtonStyle}>
              Explore Interactively
            </button>
          </div>
        )}
      </div>
    );
  }

  // =============================================================================
  // PLAY PHASE
  // =============================================================================
  if (phase === 'play') {
    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Experiment: Adjust Bit Depth and See the Staircase
        </h2>

        {renderSideBySide(
          renderADCVisualization(true, true, false),
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginTop: 0, marginBottom: '16px' }}>Controls</h3>

            {renderSlider('Bit Depth', bitDepth, 1, 16, 1, setBitDepth, ' bits')}
            {renderSlider('Input Frequency', inputFrequency, 1, 8, 0.5, setInputFrequency, ' Hz')}
            {renderSlider('Input Amplitude', inputAmplitude, 0.1, 1.0, 0.05, setInputAmplitude, '', v => (v * 100).toFixed(0) + '%')}
            {renderSlider('Sampling Rate', samplingRate, 10, 100, 5, setSamplingRate, ' samples/period')}

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '16px', marginTop: '8px' }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, fontWeight: 700, marginBottom: '8px' }}>Live Metrics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Levels', value: adcMetrics.numLevels.toLocaleString(), color: colors.digitalSignal },
                  { label: 'SNR', value: `${adcMetrics.snrIdeal.toFixed(1)} dB`, color: colors.accent },
                  { label: 'LSB Size', value: `${(adcMetrics.lsbSize * 100).toFixed(3)}%`, color: colors.warning },
                  { label: 'RMS Error', value: `${(adcMetrics.quantErrorRMS * 100).toFixed(4)}%`, color: colors.errorFill },
                ].map(m => (
                  <div key={m.label} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>{m.label}</div>
                    <div style={{ ...typo.small, color: m.color, fontWeight: 700 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px', background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                <strong style={{ color: colors.accent }}>SNR Formula:</strong> SNR = 6.02 x N + 1.76 dB
                <br />= 6.02 x {bitDepth} + 1.76 = <strong style={{ color: colors.success }}>{adcMetrics.snrIdeal.toFixed(2)} dB</strong>
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: '1-bit', bits: 1 },
            { label: '4-bit', bits: 4 },
            { label: '8-bit', bits: 8 },
            { label: '12-bit', bits: 12 },
            { label: '16-bit', bits: 16 },
          ].map(preset => (
            <button
              key={preset.bits}
              onClick={() => { setBitDepth(preset.bits); playSound('click'); }}
              style={{
                ...secondaryButtonStyle,
                padding: '8px 14px',
                minHeight: '36px',
                fontSize: '12px',
                borderColor: bitDepth === preset.bits ? colors.accent : colors.border,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button onClick={nextPhase} style={{ ...primaryButtonStyle, alignSelf: 'center' }}>
          Continue to Review
        </button>
      </div>
    );
  }

  // =============================================================================
  // REVIEW PHASE
  // =============================================================================
  if (phase === 'review') {
    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '750px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Understanding Quantization Noise
        </h2>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.analogSignal}` }}>
          <h3 style={{ ...typo.h3, color: colors.analogSignal, marginTop: 0 }}>The Quantization Noise Floor</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            When an ADC quantizes a signal, the error between the true analog value and the nearest digital level creates a noise floor. For a sinusoidal input that exercises many quantization levels, this error is approximately <strong style={{ color: colors.accent }}>uniformly distributed</strong> between -LSB/2 and +LSB/2.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            The RMS value of this error is <strong style={{ color: colors.accent }}>LSB / sqrt(12)</strong>, leading to the famous formula: <strong style={{ color: colors.success }}>SNR = 6.02N + 1.76 dB</strong>.
          </p>
        </div>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.warning}` }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginTop: 0 }}>ENOB: Effective Number of Bits</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            Real ADCs are not ideal. Thermal noise, harmonic distortion, differential nonlinearity (DNL), and integral nonlinearity (INL) all degrade performance. <strong style={{ color: colors.warning }}>ENOB</strong> (Effective Number of Bits) measures the actual resolution achieved:
          </p>
          <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', textAlign: 'center', margin: '12px 0' }}>
            <span style={{ ...typo.h3, color: colors.accent }}>ENOB = (SINAD - 1.76) / 6.02</span>
          </div>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            A 16-bit ADC might only achieve 13-14 ENOB in practice. The missing bits are consumed by non-ideal effects.
          </p>
        </div>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.digitalSignal}` }}>
          <h3 style={{ ...typo.h3, color: colors.digitalSignal, marginTop: 0 }}>Key Relationships</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '📐', title: 'Each +1 bit', desc: '+6.02 dB SNR, 2x more levels, half the step size' },
              { icon: '📊', title: 'Noise spectrum', desc: 'Quantization noise is white (flat) for busy signals' },
              { icon: '🔊', title: 'Dynamic range', desc: 'Sets the gap between loudest and softest signal levels' },
              { icon: '⚠️', title: 'Clipping', desc: 'Signals exceeding full scale cause severe distortion' },
            ].map((item, i) => (
              <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700 }}>{item.title}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={nextPhase} style={{ ...primaryButtonStyle, alignSelf: 'center' }}>
          Explore the Twist
        </button>
      </div>
    );
  }

  // =============================================================================
  // TWIST PREDICT PHASE
  // =============================================================================
  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'no_effect', label: 'Oversampling does not affect quantization noise at all' },
      { id: 'small_improvement', label: 'Oversampling reduces noise slightly (a few dB)' },
      { id: 'significant', label: 'Each 4x oversampling adds ~1 bit of resolution (6 dB)', correct: true },
      { id: 'eliminates', label: 'Oversampling completely eliminates quantization noise' },
    ];

    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          New Variable: What Happens with Oversampling?
        </h2>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.warning}` }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            What if we sample the signal at a rate <strong style={{ color: colors.warning }}>much higher</strong> than the Nyquist minimum, then digitally filter and decimate? Can we trade <strong>speed for resolution</strong>?
          </p>
        </div>

        {twistPredictStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ ...typo.small, color: colors.textMuted }}>What do you predict will happen?</p>
            {twistPredictions.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setTwistPrediction(p.id);
                  playSound('click');
                  emitEvent('prediction_made', { twist: true, prediction: p.id });
                }}
                style={{
                  ...secondaryButtonStyle,
                  textAlign: 'left',
                  borderColor: twistPrediction === p.id ? colors.accent : colors.border,
                  background: twistPrediction === p.id ? `${colors.accent}15` : colors.bgCard,
                }}
              >
                <span style={{ color: twistPrediction === p.id ? colors.accent : colors.textSecondary, ...typo.small }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {twistPrediction && twistPredictStep === 0 && (
          <button onClick={() => { setTwistPredictStep(1); playSound('transition'); }} style={primaryButtonStyle}>
            See the Result
          </button>
        )}

        {twistPredictStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Oversampling works!</strong> By sampling at K times the Nyquist rate, quantization noise is spread over a K-times wider bandwidth. A digital low-pass filter then removes the out-of-band noise, improving SNR by <strong style={{ color: colors.accent }}>10*log10(K) dB</strong>, or equivalently adding <strong>0.5 * log2(K) extra bits</strong>.
              </p>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <span style={{ ...typo.body, color: colors.accent, fontWeight: 700 }}>4x oversampling = +1 bit | 16x = +2 bits | 256x = +4 bits</span>
            </div>
            <button onClick={nextPhase} style={{ ...primaryButtonStyle, alignSelf: 'center' }}>
              Explore Oversampling and Dithering
            </button>
          </div>
        )}
      </div>
    );
  }

  // =============================================================================
  // TWIST PLAY PHASE
  // =============================================================================
  if (phase === 'twist_play') {
    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Oversampling and Dithering
        </h2>

        {renderSideBySide(
          renderADCVisualization(true, true, true),
          <div style={cardStyle}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginTop: 0, marginBottom: '16px' }}>Twist Controls</h3>

            {renderSlider('Bit Depth', bitDepth, 1, 16, 1, setBitDepth, ' bits')}
            {renderSlider('Oversampling Factor', oversamplingFactor, 1, 256, 1, setOversamplingFactor, 'x', v => {
              if (v === 1) return '1';
              return v.toString();
            })}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>Dithering</span>
                <button
                  onClick={() => { setDitheringEnabled(!ditheringEnabled); playSound('click'); }}
                  style={{
                    padding: '4px 16px',
                    borderRadius: '20px',
                    border: `2px solid ${ditheringEnabled ? colors.success : colors.border}`,
                    background: ditheringEnabled ? `${colors.success}22` : 'transparent',
                    color: ditheringEnabled ? colors.success : colors.textMuted,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    minHeight: '32px',
                  }}
                >
                  {ditheringEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {ditheringEnabled && renderSlider('Dither Amplitude', ditherAmplitude, 0.1, 2.0, 0.1, setDitherAmplitude, ' LSB')}
            </div>

            {renderSlider('Input Frequency', inputFrequency, 1, 8, 0.5, setInputFrequency, ' Hz')}

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '16px', marginTop: '8px' }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, fontWeight: 700, marginBottom: '8px' }}>Enhanced Metrics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Base SNR', value: `${adcMetrics.snrIdeal.toFixed(1)} dB`, color: colors.accent },
                  { label: 'OSR Gain', value: `+${adcMetrics.oversamplingGain.toFixed(1)} dB`, color: colors.info },
                  { label: 'Effective SNR', value: `${adcMetrics.effectiveSNR.toFixed(1)} dB`, color: colors.success },
                  { label: 'Effective Bits', value: `${adcMetrics.enob.toFixed(1)} ENOB`, color: colors.warning },
                  { label: 'Extra Bits', value: `+${adcMetrics.effectiveBitsFromOversampling.toFixed(1)}`, color: colors.digitalSignal },
                  { label: 'Levels', value: adcMetrics.numLevels.toLocaleString(), color: colors.textSecondary },
                ].map(m => (
                  <div key={m.label} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>{m.label}</div>
                    <div style={{ ...typo.small, color: m.color, fontWeight: 700 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[1, 4, 16, 64, 256].map(osr => (
                  <button
                    key={osr}
                    onClick={() => { setOversamplingFactor(osr); playSound('click'); }}
                    style={{
                      ...secondaryButtonStyle,
                      padding: '6px 10px',
                      minHeight: '30px',
                      fontSize: '11px',
                      borderColor: oversamplingFactor === osr ? colors.info : colors.border,
                      color: oversamplingFactor === osr ? colors.info : colors.textMuted,
                    }}
                  >
                    {osr}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={nextPhase} style={{ ...primaryButtonStyle, alignSelf: 'center' }}>
          Continue to Twist Review
        </button>
      </div>
    );
  }

  // =============================================================================
  // TWIST REVIEW PHASE
  // =============================================================================
  if (phase === 'twist_review') {
    return pageWrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '750px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Oversampling and Noise Shaping
        </h2>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.info}` }}>
          <h3 style={{ ...typo.h3, color: colors.info, marginTop: 0 }}>Oversampling: Trading Speed for Resolution</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            Oversampling spreads the fixed total quantization noise power over a wider bandwidth. A digital low-pass filter then removes noise outside the signal band. The improvement follows:
          </p>
          <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', textAlign: 'center', margin: '12px 0' }}>
            <div style={{ ...typo.h3, color: colors.accent }}>SNR improvement = 10 * log10(OSR) dB</div>
            <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>Extra bits = 0.5 * log2(OSR)</div>
          </div>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            The limitation: you need 4x oversampling for each extra bit. To gain 8 bits (48 dB), you would need 65,536x oversampling, which is impractical.
          </p>
        </div>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.warning}` }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginTop: 0 }}>Noise Shaping: The Sigma-Delta Advantage</h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            Sigma-delta (ΣΔ) ADCs use feedback to <strong>shape</strong> the quantization noise spectrum, pushing most noise energy to high frequencies where it is removed by the digital filter. This yields much more resolution per oversampling ratio than simple oversampling.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            A first-order noise shaper gains <strong>1.5 bits per octave</strong> of oversampling (vs 0.5 bits for simple oversampling). Higher-order shapers do even better, enabling 24-bit resolution from a 1-bit quantizer.
          </p>
        </div>

        <div style={{ ...cardStyle, borderLeft: `3px solid ${colors.success}` }}>
          <h3 style={{ ...typo.h3, color: colors.success, marginTop: 0 }}>Dithering: Linearizing the Quantizer</h3>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            Adding a small amount of random noise (~1 LSB RMS) before quantization <strong>decorrelates</strong> the quantization error from the signal. This converts harmonic distortion into white noise, which sounds much less objectionable and can be filtered. Dithering is essential in audio and is used in most practical ADC systems.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { title: 'Simple Oversampling', bits: '0.5 bits / octave', icon: '📈', color: colors.info },
            { title: '1st-Order ΣΔ', bits: '1.5 bits / octave', icon: '🔄', color: colors.warning },
            { title: '2nd-Order ΣΔ', bits: '2.5 bits / octave', icon: '⚡', color: colors.success },
          ].map((item, i) => (
            <div key={i} style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ ...typo.small, color: item.color, fontWeight: 700 }}>{item.title}</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>{item.bits}</div>
            </div>
          ))}
        </div>

        <button onClick={nextPhase} style={{ ...primaryButtonStyle, alignSelf: 'center' }}>
          See Real-World Applications
        </button>
      </div>
    );
  }

  // =============================================================================
  // TRANSFER PHASE
  // =============================================================================
  if (phase === 'transfer') {
    return pageWrap(
      <TransferPhaseView
        conceptName="ADC Quantization Noise"
        applications={realWorldApps}
        onComplete={nextPhase}
        isMobile={isMobile}
        colors={{
          primary: colors.accent,
          primaryDark: '#4F46E5',
          accent: colors.accentLight,
          secondary: colors.digitalSignal,
          success: colors.success,
          danger: colors.error,
          bgDark: colors.bgPrimary,
          bgCard: colors.bgCard,
          bgCardLight: colors.bgSecondary,
          textPrimary: colors.textPrimary,
          textSecondary: colors.textSecondary,
          textMuted: colors.textMuted,
          border: colors.border,
        }}
        typo={{
          h1: `font-size:${typo.h1.fontSize};font-weight:${typo.h1.fontWeight}`,
          h2: `font-size:${typo.h2.fontSize};font-weight:${typo.h2.fontWeight}`,
          h3: `font-size:${typo.h3.fontSize};font-weight:${typo.h3.fontWeight}`,
          body: `font-size:${typo.body.fontSize};font-weight:${typo.body.fontWeight}`,
          small: `font-size:${typo.small.fontSize};font-weight:${typo.small.fontWeight}`,
          label: `font-size:12px;font-weight:600`,
          heading: `font-size:${typo.h2.fontSize};font-weight:${typo.h2.fontWeight}`,
        }}
        playSound={playSound as unknown as (sound: string) => void}
      />
    );
  }

  // =============================================================================
  // TEST PHASE
  // =============================================================================
  if (phase === 'test') {
    const question = testQuestions[currentQuestion];

    if (testSubmitted) {
      // Show results summary then go to mastery
      return pageWrap(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '64px' }}>{testScore >= 8 ? '🏆' : testScore >= 6 ? '👍' : '📚'}</div>
          <h2 style={{ ...typo.h2, color: testScore >= 7 ? colors.success : colors.warning }}>
            You scored {testScore} / 10
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            {testScore >= 8
              ? 'Excellent! You have a strong understanding of ADC quantization noise.'
              : testScore >= 6
                ? 'Good work! Review the topics you missed to strengthen your understanding.'
                : 'Keep studying! Quantization noise is a deep topic. Review the earlier phases.'}
          </p>
          <div style={{ ...typo.h3, color: colors.accent }}>
            Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'A-' : testScore >= 7 ? 'B+' : testScore >= 6 ? 'B' : testScore >= 5 ? 'C+' : 'C'}
          </div>
          <button onClick={() => { goToPhase('mastery'); }} style={primaryButtonStyle}>
            View Mastery Summary
          </button>
        </div>
      );
    }

    return pageWrap(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
          Knowledge Test
        </h2>

        {/* Progress indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
            Q{currentQuestion + 1}: Question {currentQuestion + 1} of 10
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
              }} />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div style={{
          background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
          {question.question}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {question.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                playSound('click');
                const newAnswers = [...testAnswers];
                newAnswers[currentQuestion] = opt.id;
                setTestAnswers(newAnswers);
                emitEvent('answer_submitted', { question: currentQuestion, answer: opt.id });
              }}
              style={{
                background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                borderRadius: '10px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                fontSize: '12px', fontWeight: 700,
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.small }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              style={{ ...secondaryButtonStyle, flex: 1 }}
            >
              Previous
            </button>
          )}
          {currentQuestion < 9 ? (
            <button
              onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
              disabled={!testAnswers[currentQuestion]}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600, minHeight: '44px', fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, ans, i) => {
                  const correct = testQuestions[i].options.find(o => 'correct' in o && o.correct)?.id;
                  return acc + (ans === correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
                playSound(score >= 7 ? 'complete' : 'failure');
                emitEvent('game_completed', { score, total: 10 });
              }}
              disabled={testAnswers.some(a => a === null)}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                fontWeight: 600, minHeight: '44px', fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // =============================================================================
  // MASTERY PHASE
  // =============================================================================
  if (phase === 'mastery') {
    const finalScore = testScore;
    const total = 10;
    const pct = Math.round((finalScore / total) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Trophy and score */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>
              {pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📖'}
            </div>
            <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>

            <h1 style={{ ...typo.h1, color: pct >= 70 ? colors.success : colors.warning, margin: '0 0 8px 0' }}>
              {pct >= 90 ? 'ADC Quantization Master!' : pct >= 70 ? 'Great Understanding!' : 'Keep Learning!'}
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Score: {finalScore}/{total} ({pct}%) | Grade: {grade}
            </p>
          </div>

          {/* What you learned */}
          <div style={{ ...cardStyle, maxWidth: '600px', width: '100%', marginBottom: '24px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginTop: 0 }}>What You Learned</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Quantization is the price of digital: continuous values become discrete steps',
                'SNR = 6.02N + 1.76 dB - each bit adds ~6 dB of dynamic range',
                'ENOB measures real-world ADC performance vs ideal',
                'Oversampling trades speed for resolution (4x OSR = +1 bit)',
                'Noise shaping pushes quantization noise out of the signal band',
                'Dithering converts distortion to white noise for cleaner signals',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: colors.success, flexShrink: 0, marginTop: '2px' }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Key */}
          <div style={{ ...cardStyle, maxWidth: '700px', width: '100%', marginBottom: '100px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginTop: 0, marginBottom: '16px' }}>
              Answer Key
            </h3>
            {testQuestions.map((tq, i) => {
              const correctId = tq.options.find(o => 'correct' in o && o.correct)?.id;
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer === correctId;

              return (
                <div key={i} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: colors.bgSecondary,
                  borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700 }}>
                      Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                    <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 700 }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: '4px 0' }}>
                    {tq.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ ...typo.small, color: colors.error, margin: '4px 0' }}>
                      Your answer: {tq.options.find(o => o.id === userAnswer)?.label || 'No answer'}
                    </p>
                  )}
                  <p style={{ ...typo.small, color: colors.success, margin: '4px 0' }}>
                    Correct: {tq.options.find(o => o.id === correctId)?.label}
                  </p>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                    {tq.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed bottom Complete Game button */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 24px',
          background: `linear-gradient(to top, ${colors.bgPrimary} 80%, transparent)`,
          display: 'flex', justifyContent: 'center', zIndex: 1000,
        }}>
          <button
            onClick={() => {
              emitEvent('game_completed', { score: finalScore, total, pct, grade });
              onGameEvent?.({
                eventType: 'achievement_unlocked',
                gameType: 'adc_quantization_noise',
                gameTitle: 'ADC Quantization Noise',
                details: { achievement: 'mastery_achieved', score: finalScore, total, pct },
                timestamp: Date.now(),
              });
              window.location.href = '/games';
            }}
            style={{
              padding: '14px 48px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colors.accentGlow}`,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minHeight: '48px',
            }}
          >
            Complete Game
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ADCQuantizationNoiseRenderer;
