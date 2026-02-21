'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';
// ============================================================================
// GAME 276: ACTIVE FILTER DESIGN
// Op-amp based active filters: LP, HP, BP, Notch
// fc = 1/(2piRC), Butterworth vs Chebyshev, filter order and rolloff
// ============================================================================

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

interface FilterDesignRendererProps {
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

// ============================================================================
// PHASE DEFINITIONS
// ============================================================================

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery',
];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Butterworth vs Chebyshev',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// ============================================================================
// FILTER TYPES
// ============================================================================

type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';
type ResponseType = 'butterworth' | 'chebyshev';

const FILTER_LABELS: Record<FilterType, string> = {
  lowpass: 'Low-Pass',
  highpass: 'High-Pass',
  bandpass: 'Band-Pass',
  notch: 'Notch',
};

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================

const testQuestions = [
  {
    id: 'q1',
    scenario: 'An engineer needs to remove 60 Hz power line hum from a sensitive audio signal while preserving frequencies above 200 Hz.',
    question: 'Which filter type is most appropriate?',
    options: [
      { id: 'a', label: 'A low-pass filter with fc = 200 Hz' },
      { id: 'b', label: 'A high-pass filter with fc = 100 Hz', correct: true },
      { id: 'c', label: 'A band-pass filter centered at 60 Hz' },
      { id: 'd', label: 'A notch filter at 60 Hz' },
    ],
    explanation: 'A high-pass filter with cutoff around 100 Hz would block the 60 Hz hum while passing desired audio content above 200 Hz. A notch filter at 60 Hz would also work but only removes that exact frequency, not broadband low-frequency noise.',
  },
  {
    id: 'q2',
    scenario: 'Given R = 10 kohm and C = 15.9 nF in a first-order active low-pass filter, the engineer wants to verify the cutoff frequency.',
    question: 'What is the cutoff frequency fc?',
    options: [
      { id: 'a', label: 'Approximately 100 Hz' },
      { id: 'b', label: 'Approximately 1 kHz', correct: true },
      { id: 'c', label: 'Approximately 10 kHz' },
      { id: 'd', label: 'Approximately 159 Hz' },
    ],
    explanation: 'fc = 1/(2*pi*R*C) = 1/(2*pi*10000*15.9e-9) = 1/(0.000999) = approximately 1000 Hz = 1 kHz. This is the fundamental formula for RC filter cutoff frequency.',
  },
  {
    id: 'q3',
    scenario: 'A second-order Butterworth low-pass filter has a cutoff frequency of 5 kHz. The signal at 50 kHz (one decade above cutoff) needs to be measured.',
    question: 'What is the approximate attenuation at 50 kHz?',
    options: [
      { id: 'a', label: '-20 dB (10x attenuation)' },
      { id: 'b', label: '-40 dB (100x attenuation)', correct: true },
      { id: 'c', label: '-60 dB (1000x attenuation)' },
      { id: 'd', label: '-3 dB (half power)' },
    ],
    explanation: 'A second-order filter rolls off at -40 dB/decade. One decade above cutoff (50 kHz vs 5 kHz) gives -40 dB of attenuation, reducing the signal to 1/100th its passband level.',
  },
  {
    id: 'q4',
    scenario: 'A designer wants the sharpest possible transition from passband to stopband but can tolerate small ripples in the passband response.',
    question: 'Which filter response type should they choose?',
    options: [
      { id: 'a', label: 'Butterworth - maximally flat response' },
      { id: 'b', label: 'Chebyshev Type I - allows passband ripple for sharper rolloff', correct: true },
      { id: 'c', label: 'First-order filter with high-Q components' },
      { id: 'd', label: 'Any filter type - rolloff depends only on order' },
    ],
    explanation: 'Chebyshev Type I filters trade passband flatness for a sharper transition band. By allowing ripple in the passband (typically 0.5-3 dB), the rolloff slope in the transition band is steeper than a Butterworth of the same order.',
  },
  {
    id: 'q5',
    scenario: 'An anti-aliasing filter is needed before a 44.1 kHz ADC. The audio band extends to 20 kHz and the Nyquist frequency is 22.05 kHz.',
    question: 'Why is a higher-order filter preferred here?',
    options: [
      { id: 'a', label: 'Higher order filters use fewer components' },
      { id: 'b', label: 'The narrow transition band (20 kHz to 22 kHz) requires steep rolloff', correct: true },
      { id: 'c', label: 'Higher order filters have better phase response' },
      { id: 'd', label: 'Lower order filters cannot reach -3 dB at cutoff' },
    ],
    explanation: 'With only 2.05 kHz between the passband edge (20 kHz) and Nyquist (22.05 kHz), a steep rolloff is essential. A 4th-order filter provides -80 dB/decade, giving much better attenuation at Nyquist than a 1st-order filter at -20 dB/decade.',
  },
  {
    id: 'q6',
    scenario: 'An engineer doubles the resistor value in a first-order active filter from 10 kohm to 20 kohm while keeping the capacitor the same.',
    question: 'What happens to the cutoff frequency?',
    options: [
      { id: 'a', label: 'It doubles' },
      { id: 'b', label: 'It is halved', correct: true },
      { id: 'c', label: 'It stays the same' },
      { id: 'd', label: 'It increases by the square root of 2' },
    ],
    explanation: 'Since fc = 1/(2*pi*R*C), doubling R doubles the denominator, halving fc. The cutoff frequency is inversely proportional to both R and C.',
  },
  {
    id: 'q7',
    scenario: 'A band-pass filter is designed with a lower cutoff of 1 kHz and upper cutoff of 10 kHz. The engineer needs to calculate the center frequency and bandwidth.',
    question: 'What is the geometric center frequency of this band-pass filter?',
    options: [
      { id: 'a', label: '5.5 kHz (arithmetic mean)' },
      { id: 'b', label: 'Approximately 3.16 kHz (geometric mean)', correct: true },
      { id: 'c', label: '10 kHz (upper cutoff)' },
      { id: 'd', label: '1 kHz (lower cutoff)' },
    ],
    explanation: 'The center frequency of a band-pass filter is the geometric mean of the cutoff frequencies: f0 = sqrt(fL * fH) = sqrt(1000 * 10000) = sqrt(10,000,000) = approximately 3162 Hz or 3.16 kHz.',
  },
  {
    id: 'q8',
    scenario: 'A Butterworth filter has a maximally flat magnitude response in the passband. A colleague argues the phase response is also ideal.',
    question: 'What is the main drawback of a Butterworth filter in terms of phase?',
    options: [
      { id: 'a', label: 'It has zero phase shift at all frequencies' },
      { id: 'b', label: 'It has non-linear phase response, causing group delay variation', correct: true },
      { id: 'c', label: 'Phase is always exactly 90 degrees' },
      { id: 'd', label: 'Butterworth filters have perfect linear phase' },
    ],
    explanation: 'While Butterworth filters have maximally flat magnitude response, their phase response is non-linear, particularly near cutoff. This means different frequencies experience different delays (group delay variation), which can distort transient signals.',
  },
  {
    id: 'q9',
    scenario: 'A 4th-order active low-pass filter is implemented using two cascaded 2nd-order Sallen-Key stages. Each stage has its own Q factor.',
    question: 'What happens to the overall rolloff rate?',
    options: [
      { id: 'a', label: '-20 dB/decade (same as 1st order)' },
      { id: 'b', label: '-40 dB/decade (same as 2nd order)' },
      { id: 'c', label: '-80 dB/decade (sum of both stages)', correct: true },
      { id: 'd', label: '-160 dB/decade (product of both stages)' },
    ],
    explanation: 'Each filter order contributes -20 dB/decade of rolloff. A 4th-order filter (two 2nd-order stages) gives 4 * (-20) = -80 dB/decade. The rolloff rates add (in dB) when stages are cascaded.',
  },
  {
    id: 'q10',
    scenario: 'A notch filter is designed to remove a specific 50 Hz interference while preserving signals at 45 Hz and 55 Hz.',
    question: 'What characteristic makes a notch filter different from a low-pass or high-pass filter?',
    options: [
      { id: 'a', label: 'It has a wider transition band' },
      { id: 'b', label: 'It rejects a narrow frequency band while passing frequencies above and below', correct: true },
      { id: 'c', label: 'It can only be built with passive components' },
      { id: 'd', label: 'It has no cutoff frequency' },
    ],
    explanation: 'A notch (band-reject) filter attenuates a narrow band of frequencies while passing everything else. It is the complement of a band-pass filter. The Q factor determines how narrow the rejection band is.',
  },
];

// ============================================================================
// TRANSFER APPLICATIONS
// ============================================================================

const realWorldApps = [
  {
    icon: '🎵',
    title: 'Audio Crossover Networks',
    short: 'Splitting audio signals for multi-driver speakers',
    tagline: 'Every hi-fi speaker depends on precise filter design',
    description: 'Audio crossover networks in loudspeakers use active filters to split the full audio spectrum into separate frequency bands directed to tweeters, midrange drivers, and woofers. Companies like JBL, Bose, and KEF use Butterworth and Linkwitz-Riley filter topologies to ensure flat combined response. Active crossovers in pro audio from brands like DBX and Behringer enable precise electronic control over crossover points.',
    connection: 'Without crossovers, sending low bass frequencies to a tweeter would destroy it, and sending high frequencies to a woofer would produce distortion. The -3dB crossover point and rolloff slope determine how cleanly the frequency bands merge.',
    howItWorks: 'Active crossovers use op-amp-based Sallen-Key or state-variable filter circuits. A 4th-order Linkwitz-Riley (two cascaded 2nd-order Butterworth) produces -6 dB at crossover so two drivers sum to 0 dB. DSP-based crossovers allow IIR and FIR implementations.',
    stats: [
      { value: '24dB/oct', label: 'Typical crossover slope', icon: '📉' },
      { value: '2-4kHz', label: 'Midrange-tweeter crossover', icon: '🔊' },
      { value: '<0.5dB', label: 'Combined ripple target', icon: '📊' },
    ],
    examples: ['JBL studio monitors', 'KEF LS50 speakers', 'DBX active crossovers', 'Car audio systems'],
    companies: ['JBL', 'Bose', 'KEF', 'Behringer'],
    futureImpact: 'DSP-based crossovers with FIR filters enable linear phase response, eliminating group delay issues inherent in analog IIR crossovers.',
    color: '#8B5CF6',
  },
  {
    icon: '📡',
    title: 'EMI/EMC Filtering',
    short: 'Protecting electronics from electromagnetic interference',
    tagline: 'Every electronic device must pass EMC compliance',
    description: 'Electromagnetic interference (EMI) filters on power lines and signal cables use combinations of low-pass filters to block high-frequency conducted noise. Companies like Murata, TDK, and Schaffner produce EMI filter modules. Medical devices from Medtronic and Siemens Healthineers use stringent EMI filtering to meet IEC 60601 standards. Automotive electronics from Bosch and Continental rely on EMI filters for ISO 11452 compliance.',
    connection: 'EMI filters are low-pass filters that block high-frequency noise while passing the desired DC or low-frequency power/signal. The cutoff frequency and filter order determine how much noise attenuation is achieved.',
    howItWorks: 'Common-mode and differential-mode LC filters attenuate noise. Pi-filters and T-filters provide multi-stage filtering. Feedthrough capacitors and ferrite beads form simple first-order filters. For stringent requirements, multi-stage active filters are used.',
    stats: [
      { value: '>60dB', label: 'Typical attenuation needed', icon: '📉' },
      { value: '150kHz-30MHz', label: 'Conducted emission range', icon: '📶' },
      { value: 'CISPR 32', label: 'Key standard', icon: '📋' },
    ],
    examples: ['Switch-mode power supplies', 'Medical equipment', 'Industrial drives', 'Telecom equipment'],
    companies: ['Murata', 'TDK', 'Schaffner', 'Wurth'],
    futureImpact: 'Higher switching frequencies in GaN and SiC power converters push EMI to higher frequencies, requiring more sophisticated filter designs.',
    color: '#3B82F6',
  },
  {
    icon: '📱',
    title: 'Wireless Communication Filters',
    short: 'Selecting specific radio channels from a crowded spectrum',
    tagline: 'Your phone uses dozens of filters simultaneously',
    description: 'Modern smartphones from Apple, Samsung, and Qualcomm contain 30-100 RF filters to separate cellular bands (4G/5G), WiFi, Bluetooth, and GPS signals. Companies like Skyworks, Qorvo, and Broadcom design SAW and BAW filters that implement band-pass filtering at GHz frequencies. Each filter selects a specific frequency band while rejecting all others.',
    connection: 'Band-pass filters with precise center frequencies and bandwidth select desired radio channels. The Q factor determines selectivity - higher Q means narrower bandwidth and better adjacent channel rejection.',
    howItWorks: 'At RF frequencies, acoustic wave filters (SAW/BAW/FBAR) replace traditional LC filters. These use piezoelectric materials to create mechanical resonances equivalent to very high-Q electrical circuits. Active filters handle baseband and IF processing.',
    stats: [
      { value: '30-100', label: 'Filters per smartphone', icon: '📱' },
      { value: '>50dB', label: 'Adjacent band rejection', icon: '🔕' },
      { value: '0.6-6GHz', label: 'Frequency range', icon: '📡' },
    ],
    examples: ['5G NR band selection', 'WiFi 6E channels', 'GPS L1/L5 bands', 'Bluetooth 5.0'],
    companies: ['Qualcomm', 'Skyworks', 'Qorvo', 'Broadcom'],
    futureImpact: 'Tunable filters using MEMS and varactors will replace fixed filters, enabling software-defined radio front-ends for future 6G systems.',
    color: '#10B981',
  },
  {
    icon: '🏥',
    title: 'Biomedical Signal Processing',
    short: 'Extracting vital signals from noisy biological data',
    tagline: 'Clean ECG signals save lives in cardiac monitoring',
    description: 'Medical instruments from GE Healthcare, Philips, and Medtronic use active filters extensively to clean up physiological signals. ECG monitors use band-pass filters (0.05-100 Hz) to isolate cardiac signals. EEG systems from Natus and Compumedics filter brainwave bands (delta, theta, alpha, beta). A 50/60 Hz notch filter removes power line interference from all biomedical signals.',
    connection: 'Biomedical signals are extremely weak (microvolts to millivolts) and embedded in noise. Active filters with precise cutoff frequencies and high-order rolloff extract the desired signal while rejecting noise, muscle artifacts, and interference.',
    howItWorks: 'Instrumentation amplifiers with active filter stages process signals. ECG front-ends use a 0.05 Hz high-pass (removes DC drift), 100 Hz low-pass (removes muscle noise), and 50/60 Hz notch. Digital filters in modern systems implement IIR Butterworth and FIR linear-phase designs.',
    stats: [
      { value: '0.05-100Hz', label: 'ECG filter bandwidth', icon: '💓' },
      { value: '1-50uV', label: 'EEG signal amplitude', icon: '🧠' },
      { value: '>40dB', label: 'Notch filter depth', icon: '🔕' },
    ],
    examples: ['ECG/EKG monitors', 'EEG brain monitoring', 'EMG muscle sensors', 'Pulse oximeters'],
    companies: ['GE Healthcare', 'Philips', 'Medtronic', 'Natus'],
    futureImpact: 'Wearable health monitors require ultra-low-power active filters integrated on-chip, pushing analog filter design to new efficiency frontiers.',
    color: '#F59E0B',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FilterDesignRenderer: React.FC<FilterDesignRendererProps> = ({ onGameEvent, gamePhase }) => {
  const validPhases: Phase[] = PHASES;

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();

  // Prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play state - filter parameters
  const [filterType, setFilterType] = useState<FilterType>('lowpass');
  const [resistance, setResistance] = useState(10); // kohm
  const [capacitance, setCapacitance] = useState(10); // nF
  const [filterOrder, setFilterOrder] = useState<1 | 2 | 4>(2);
  const [responseType, setResponseType] = useState<ResponseType>('butterworth');
  const [chebyshevRipple, setChebyshevRipple] = useState(1); // dB
  const [experimentCount, setExperimentCount] = useState(0);

  // Target for play phase challenge
  const [targetFc, setTargetFc] = useState(5000); // Hz

  // Test state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, string | null>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // ── Colors ──
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: 'rgba(30, 41, 59, 0.9)',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#334155',
    lowpass: '#3b82f6',
    highpass: '#8b5cf6',
    bandpass: '#10b981',
    notch: '#f59e0b',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    minHeight: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  };

  // ── Phase navigation ──
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    onGameEvent?.({
      eventType: 'phase_changed',
      gameType: 'active_filter_design',
      gameTitle: 'Active Filter Design',
      details: { phase: p },
      timestamp: Date.now(),
    });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

  // ── Emit game_started on mount ──
  useEffect(() => {
    onGameEvent?.({
      eventType: 'game_started',
      gameType: 'active_filter_design',
      gameTitle: 'Active Filter Design',
      details: {},
      timestamp: Date.now(),
    });
  }, []);

  // ── Randomize target on play phase entry ──
  useEffect(() => {
    if (phase === 'play') {
      const targets = [1000, 2000, 3000, 5000, 8000, 10000, 15000];
      setTargetFc(targets[Math.floor(Math.random() * targets.length)]);
    }
  }, [phase]);

  // ── Filter calculations ──
  const calculateCutoff = useCallback((r_kohm: number, c_nf: number): number => {
    const R = r_kohm * 1000; // ohms
    const C = c_nf * 1e-9; // farads
    return 1 / (2 * Math.PI * R * C);
  }, []);

  const cutoffFreq = calculateCutoff(resistance, capacitance);

  // Bode magnitude response calculation
  const getMagnitudeDb = useCallback((freq: number, fc: number, type: FilterType, order: 1 | 2 | 4, resp: ResponseType, ripple: number): number => {
    const fRatio = freq / fc;
    let magDb = 0;

    if (resp === 'chebyshev') {
      // Chebyshev Type I approximation
      const epsilon = Math.sqrt(Math.pow(10, ripple / 10) - 1);
      const n = order;
      let Tn: number;
      if (type === 'lowpass') {
        if (fRatio <= 1) {
          Tn = Math.cos(n * Math.acos(fRatio));
        } else {
          Tn = Math.cosh(n * Math.acosh(fRatio));
        }
        magDb = -10 * Math.log10(1 + epsilon * epsilon * Tn * Tn);
      } else if (type === 'highpass') {
        const invRatio = fc / freq;
        if (invRatio <= 1) {
          Tn = Math.cos(n * Math.acos(invRatio));
        } else {
          Tn = Math.cosh(n * Math.acosh(invRatio));
        }
        magDb = -10 * Math.log10(1 + epsilon * epsilon * Tn * Tn);
      } else if (type === 'bandpass') {
        const bw = fc * 0.5;
        const fCenter = fc;
        const normalizedF = (freq - fCenter) / (bw / 2);
        const absNorm = Math.abs(normalizedF);
        if (absNorm <= 1) {
          Tn = Math.cos(n * Math.acos(absNorm));
        } else {
          Tn = Math.cosh(n * Math.acosh(absNorm));
        }
        magDb = -10 * Math.log10(1 + epsilon * epsilon * Tn * Tn);
      } else {
        // notch
        const bw = fc * 0.3;
        const fCenter = fc;
        const normalizedF = (freq - fCenter) / (bw / 2);
        const absNorm = Math.abs(normalizedF);
        const notchDepth = -40;
        if (absNorm < 0.05) {
          magDb = notchDepth;
        } else {
          const recovery = Math.min(1, absNorm * absNorm);
          magDb = notchDepth * (1 - recovery);
        }
      }
    } else {
      // Butterworth
      if (type === 'lowpass') {
        magDb = -10 * order * Math.log10(1 + Math.pow(fRatio, 2));
      } else if (type === 'highpass') {
        const invRatio = fc / freq;
        magDb = -10 * order * Math.log10(1 + Math.pow(invRatio, 2));
      } else if (type === 'bandpass') {
        const bw = fc * 0.5;
        const fCenter = fc;
        const normalizedF = Math.abs(freq - fCenter) / (bw / 2);
        magDb = -10 * order * Math.log10(1 + Math.pow(normalizedF, 2));
      } else {
        // notch
        const bw = fc * 0.3;
        const fCenter = fc;
        const diff = Math.abs(freq - fCenter);
        const normalizedF = diff / (bw / 2);
        if (normalizedF < 0.01) {
          magDb = -60;
        } else {
          magDb = -10 * order * Math.log10(1 + Math.pow(1 / normalizedF, 2));
          magDb = Math.max(magDb, -60);
        }
      }
    }

    return Math.max(magDb, -80);
  }, []);

  // Format frequency
  const formatFreq = (hz: number): string => {
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
    return `${hz.toFixed(0)} Hz`;
  };

  // Quiz score computation
  const quizScore = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;

  // ── Progress bar ──
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    const progressPercent = ((currentIdx + 1) / PHASES.length) * 100;
    return (
      <nav
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid #334155' }}
        role="navigation"
        aria-label="Phase navigation"
      >
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${currentIdx + 1} of ${PHASES.length} phases`}
          style={{ height: '4px', backgroundColor: '#334155', width: '100%' }}
        >
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(to right, #3b82f6, #2563eb)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            aria-label="Go to previous phase"
            style={{ minHeight: '44px', minWidth: '44px', borderRadius: '8px', border: 'none', background: 'transparent', color: currentIdx === 0 ? '#475569' : '#cbd5e1', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontSize: '18px', transition: 'all 0.3s ease', opacity: currentIdx === 0 ? 0.3 : 1 }}
          >
            &#x2190;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }} role="tablist" aria-label="Phase dots">
              {PHASES.map((p, i) => (
                <button
                  key={p}
                  onClick={() => goToPhase(p)}
                  role="tab"
                  aria-selected={i === currentIdx}
                  aria-label={`${PHASE_LABELS[p]}${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
                  style={{ minHeight: '44px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: 'none', background: 'transparent', padding: 0, borderRadius: '9999px' }}
                >
                  <span style={{
                    display: 'block', height: '8px', borderRadius: '9999px', transition: 'all 0.3s ease',
                    width: i === currentIdx ? '24px' : '8px',
                    background: i === currentIdx ? '#3b82f6' : i < currentIdx ? '#10b981' : '#475569',
                  }} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(148, 163, 184, 0.7)', marginLeft: '8px' }}>
              {currentIdx + 1}/{PHASES.length}
            </span>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '12px', fontWeight: 600 }}>
            {PHASE_LABELS[phase]}
          </div>
        </div>
      </nav>
    );
  };

  // ── Bode Plot SVG ──
  const renderBodePlot = (width: number, height: number, showTarget?: boolean) => {
    const padL = 65, padR = 20, padT = 30, padB = 45;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    // Frequency range: 10 Hz to 1 MHz (log scale)
    const fMin = 10, fMax = 1e6;
    const logMin = Math.log10(fMin);
    const logMax = Math.log10(fMax);

    // Magnitude range: 0 dB to -80 dB
    const dbMax = 5, dbMin = -80;

    const freqToX = (f: number) => padL + ((Math.log10(f) - logMin) / (logMax - logMin)) * chartW;
    const dbToY = (db: number) => padT + ((dbMax - db) / (dbMax - dbMin)) * chartH;

    // Generate response curve points
    const numPoints = 200;
    const curvePoints: string[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const logF = logMin + (i / numPoints) * (logMax - logMin);
      const freq = Math.pow(10, logF);
      const db = getMagnitudeDb(freq, cutoffFreq, filterType, filterOrder, responseType, chebyshevRipple);
      const x = freqToX(freq);
      const y = dbToY(db);
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Area under curve
    const areaPath = curvePoints.join(' ') + ` L ${freqToX(fMax).toFixed(1)} ${dbToY(dbMin).toFixed(1)} L ${freqToX(fMin).toFixed(1)} ${dbToY(dbMin).toFixed(1)} Z`;

    // -3dB line Y position
    const db3Y = dbToY(-3);

    // Cutoff frequency X position
    const fcX = freqToX(cutoffFreq);
    const fcInRange = cutoffFreq >= fMin && cutoffFreq <= fMax;

    // Target fc marker
    const targetX = showTarget ? freqToX(targetFc) : 0;

    // Filter color
    const filterColor = colors[filterType as keyof typeof colors] || colors.accent;

    // Determine passband/stopband regions
    const passbandColor = 'rgba(16, 185, 129, 0.08)';
    const stopbandColor = 'rgba(239, 68, 68, 0.06)';
    const transitionColor = 'rgba(245, 158, 11, 0.08)';

    // Frequency grid lines (decades)
    const decadeFreqs = [10, 100, 1000, 10000, 100000, 1000000];
    // dB grid lines
    const dbLines = [0, -10, -20, -30, -40, -50, -60, -70, -80];

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Bode magnitude plot showing ${FILTER_LABELS[filterType]} filter response`}
      >
        <defs>
          <linearGradient id="bodeBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={filterColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={filterColor} stopOpacity="0.05" />
          </linearGradient>
          <filter id="curvGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="fcGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={filterColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={filterColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#bodeBg)" rx="12" />

        {/* Chart area background */}
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(15, 23, 42, 0.5)" rx="2" stroke="#334155" strokeWidth="0.5" />

        {/* Passband / stopband shading for lowpass */}
        {filterType === 'lowpass' && fcInRange && (
          <>
            <rect x={padL} y={padT} width={fcX - padL} height={chartH} fill={passbandColor} />
            <rect x={fcX} y={padT} width={Math.min(fcX * 0.3, chartW - (fcX - padL))} height={chartH} fill={transitionColor} />
            <rect x={Math.min(fcX + fcX * 0.3, padL + chartW)} y={padT} width={Math.max(0, padL + chartW - fcX - fcX * 0.3)} height={chartH} fill={stopbandColor} />
          </>
        )}
        {filterType === 'highpass' && fcInRange && (
          <>
            <rect x={padL} y={padT} width={Math.max(0, fcX - padL - (fcX - padL) * 0.3)} height={chartH} fill={stopbandColor} />
            <rect x={Math.max(padL, fcX - (fcX - padL) * 0.3)} y={padT} width={Math.min((fcX - padL) * 0.3, fcX - padL)} height={chartH} fill={transitionColor} />
            <rect x={fcX} y={padT} width={padL + chartW - fcX} height={chartH} fill={passbandColor} />
          </>
        )}

        {/* Frequency grid lines (vertical, per decade) */}
        {decadeFreqs.map(f => {
          const x = freqToX(f);
          return (
            <g key={`vg-${f}`}>
              <line x1={x} y1={padT} x2={x} y2={padT + chartH} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              <text x={x} y={padT + chartH + 16} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                {f >= 1e6 ? '1M' : f >= 1e3 ? `${f / 1e3}k` : `${f}`}
              </text>
            </g>
          );
        })}

        {/* dB grid lines (horizontal) */}
        {dbLines.map(db => {
          const y = dbToY(db);
          return (
            <g key={`hg-${db}`}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity={db === 0 ? 0.6 : 0.2} />
              <text x={padL - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                {db}
              </text>
            </g>
          );
        })}

        {/* -3 dB reference line */}
        <line x1={padL} y1={db3Y} x2={padL + chartW} y2={db3Y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
        <text x={padL + chartW + 2} y={db3Y + 3} fill="#f59e0b" fontSize="9" fontFamily="monospace">-3dB</text>

        {/* Area fill under curve */}
        <path d={areaPath} fill="url(#curveGrad)" />

        {/* Main response curve */}
        <path d={curvePoints.join(' ')} fill="none" stroke={filterColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#curvGlow)" />

        {/* Cutoff frequency marker */}
        {fcInRange && (
          <>
            <line x1={fcX} y1={padT} x2={fcX} y2={padT + chartH} stroke={filterColor} strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
            <circle cx={fcX} cy={db3Y} r="12" fill="url(#fcGlow)" />
            <circle cx={fcX} cy={db3Y} r="5" fill={filterColor} stroke="#fff" strokeWidth="1.5" />
            <text x={fcX} y={padT - 8} fill={filterColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              fc = {formatFreq(cutoffFreq)}
            </text>
          </>
        )}

        {/* Target frequency marker */}
        {showTarget && (
          <>
            <line x1={targetX} y1={padT} x2={targetX} y2={padT + chartH} stroke="#ef4444" strokeWidth="2" strokeDasharray="8 4" opacity="0.8" />
            <text x={targetX} y={padT + chartH + 32} fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">
              Target: {formatFreq(targetFc)}
            </text>
          </>
        )}

        {/* Axis labels */}
        <text x={padL + chartW / 2} y={height - 4} fill="#94a3b8" fontSize="11" textAnchor="middle">Frequency (Hz)</text>
        <text x={14} y={padT + chartH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 14, ${padT + chartH / 2})`}>Magnitude (dB)</text>

        {/* Rolloff rate annotation */}
        {filterType !== 'notch' && filterType !== 'bandpass' && fcInRange && (
          <text x={padL + chartW - 10} y={padT + 18} fill="#94a3b8" fontSize="10" textAnchor="end" fontStyle="italic">
            Rolloff: {-20 * filterOrder} dB/decade
          </text>
        )}
      </svg>
    );
  };

  // ── Slider component ──
  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (v: number) => void,
    color: string = colors.accent,
    displayValue?: string,
  ) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: color, fontWeight: 600 }}>{displayValue || `${value} ${unit}`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(v);
          setExperimentCount(prev => prev + 1);
        }}
        style={{
          width: '100%', height: '20px', touchAction: 'pan-y',
          WebkitAppearance: 'none' as const, accentColor: color, cursor: 'pointer',
          borderRadius: '4px',
          background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  );

  // ── Nav dots ──
  const renderNavDots = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0' }}>
        {PHASES.map((_, i) => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : '#475569',
          }} />
        ))}
      </div>
    );
  };

  // ── Page wrapper ──
  const pageWrapper = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px',
      overflowY: 'auto', flex: 1, paddingTop: '60px',
    }}>
      {renderProgressBar()}
      <div style={{ maxWidth: '900px', margin: '60px auto 0' }}>
        {children}
      </div>
      {renderNavDots()}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // HOOK PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'hook') {
    return pageWrapper(
      <>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>📻</div>
          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            How does your radio pick just one station from thousands?
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', margin: '0 auto 24px' }}>
            Right now, hundreds of radio signals at different frequencies are passing through your body.
            Your radio uses a <strong style={{ color: colors.accent }}>filter</strong> to select just one
            frequency band and reject all the others.
          </p>
        </div>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Active filters shape the frequency response of circuits:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { type: 'Low-Pass', desc: 'Passes low frequencies, blocks high', color: colors.lowpass },
              { type: 'High-Pass', desc: 'Passes high frequencies, blocks low', color: colors.highpass },
              { type: 'Band-Pass', desc: 'Passes a frequency range, blocks others', color: colors.bandpass },
              { type: 'Notch', desc: 'Blocks one frequency, passes others', color: colors.notch },
            ].map(f => (
              <div key={f.type} style={{
                background: colors.bgSecondary, borderRadius: '10px', padding: '14px',
                borderLeft: `3px solid ${f.color}`,
              }}>
                <div style={{ ...typo.small, color: f.color, fontWeight: 700, marginBottom: '4px' }}>{f.type}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}11`, borderRadius: '12px', padding: '20px', marginBottom: '24px',
          border: `1px solid ${colors.accent}33`, textAlign: 'center',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            The key formula: <strong style={{ color: colors.accent, fontSize: '20px' }}>fc = 1 / (2piRC)</strong>
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
            Just two components - a resistor and a capacitor - set the cutoff frequency of a filter.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Start Learning Filters &#x2192;
          </button>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PREDICT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'predict') {
    const predictionR = 10; // kohm
    const predictionC = 15.9; // nF
    const actualFc = calculateCutoff(predictionR, predictionC);

    return pageWrapper(
      <>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
            Predict the Cutoff Frequency
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            A first-order low-pass filter uses <strong style={{ color: colors.accent }}>R = 10 kohm</strong> and <strong style={{ color: colors.accent }}>C = 15.9 nF</strong>.
          </p>
          <p style={{ ...typo.body, color: colors.textMuted }}>
            Using fc = 1/(2piRC), what is the cutoff frequency?
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px',
        }}>
          {[
            { label: 'About 100 Hz', value: '100Hz' },
            { label: 'About 1 kHz', value: '1kHz' },
            { label: 'About 10 kHz', value: '10kHz' },
            { label: 'About 100 kHz', value: '100kHz' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                playSound('click');
                setPrediction(opt.value);
                onGameEvent?.({
                  eventType: 'prediction_made',
                  gameType: 'active_filter_design',
                  gameTitle: 'Active Filter Design',
                  details: { prediction: opt.value },
                  timestamp: Date.now(),
                });
              }}
              style={{
                padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                background: prediction === opt.value ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${prediction === opt.value ? colors.accent : colors.border}`,
                color: prediction === opt.value ? colors.accent : colors.textPrimary,
                fontSize: '16px', fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{
            background: prediction === '1kHz' ? `${colors.success}15` : `${colors.warning}15`,
            border: `1px solid ${prediction === '1kHz' ? colors.success : colors.warning}44`,
            borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: prediction === '1kHz' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
              {prediction === '1kHz' ? 'Correct!' : 'Not quite!'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              fc = 1/(2pi * 10,000 * 15.9e-9) = 1/(0.000999) = <strong style={{ color: colors.accent }}>{formatFreq(actualFc)}</strong>.
              {prediction !== '1kHz' && ' The answer is about 1 kHz. Let us explore why!'}
            </p>
          </div>
        )}

        {prediction && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test My Prediction &#x2192;
            </button>
          </div>
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PLAY PHASE - Interactive Bode Plot
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'play') {
    const fcDiff = Math.abs(cutoffFreq - targetFc) / targetFc;
    const isOnTarget = fcDiff < 0.1;
    const hasExperimented = experimentCount >= 5;

    return pageWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Design Your Active Filter
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
          Adjust R and C to hit the target cutoff frequency. Explore how filter type and order change the response.
        </p>
        <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
          Target: <strong style={{ color: '#ef4444' }}>{formatFreq(targetFc)}</strong> |
          Your fc: <strong style={{ color: isOnTarget ? colors.success : colors.accent }}>{formatFreq(cutoffFreq)}</strong>
          {isOnTarget && <span style={{ color: colors.success }}> -- On target!</span>}
        </p>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px',
          width: '100%', alignItems: isMobile ? 'center' : 'flex-start', marginBottom: '24px',
        }}>
          {/* Bode plot */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: isMobile ? '12px' : '20px' }}>
              {renderBodePlot(isMobile ? 360 : 520, isMobile ? 280 : 340, true)}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ ...typo.small, color: '#10b981' }}>&#9632; Passband</span>
                <span style={{ ...typo.small, color: '#f59e0b' }}>&#9632; Transition</span>
                <span style={{ ...typo.small, color: '#ef4444' }}>&#9632; Stopband</span>
                <span style={{ ...typo.small, color: '#f59e0b' }}>- - -3dB point</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px' }}>
              {/* Filter type selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Filter Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(ft => (
                    <button
                      key={ft}
                      onClick={() => { playSound('click'); setFilterType(ft); setExperimentCount(p => p + 1); }}
                      style={{
                        padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: filterType === ft ? `${colors[ft as keyof typeof colors]}33` : colors.bgSecondary,
                        color: filterType === ft ? (colors[ft as keyof typeof colors] as string) : colors.textMuted,
                        fontSize: '12px', fontWeight: filterType === ft ? 700 : 400, transition: 'all 0.2s',
                      }}
                    >
                      {FILTER_LABELS[ft]}
                    </button>
                  ))}
                </div>
              </div>

              {/* R slider */}
              {renderSlider('Resistance (R)', resistance, 1, 100, 1, 'kohm', setResistance, colors.accent, `${resistance} kohm`)}

              {/* C slider */}
              {renderSlider('Capacitance (C)', capacitance, 1, 100, 1, 'nF', setCapacitance, colors.accent, `${capacitance} nF`)}

              {/* Filter order selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Filter Order</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {([1, 2, 4] as const).map(ord => (
                    <button
                      key={ord}
                      onClick={() => { playSound('click'); setFilterOrder(ord); setExperimentCount(p => p + 1); }}
                      style={{
                        padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: filterOrder === ord ? `${colors.accent}33` : colors.bgSecondary,
                        color: filterOrder === ord ? colors.accent : colors.textMuted,
                        fontSize: '13px', fontWeight: filterOrder === ord ? 700 : 400,
                      }}
                    >
                      {ord === 1 ? '1st' : ord === 2 ? '2nd' : '4th'}
                      <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.7 }}>
                        {-20 * ord}dB/dec
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current cutoff display */}
              <div style={{
                background: isOnTarget ? `${colors.success}15` : colors.bgSecondary,
                borderRadius: '10px', padding: '12px', textAlign: 'center',
                border: `1px solid ${isOnTarget ? colors.success : colors.border}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cutoff Frequency</div>
                <div style={{ ...typo.h3, color: isOnTarget ? colors.success : colors.accent }}>
                  {formatFreq(cutoffFreq)}
                </div>
                {isOnTarget && (
                  <div style={{ ...typo.small, color: colors.success, marginTop: '4px' }}>
                    Within 10% of target!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rolloff comparison cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px',
        }}>
          {([1, 2, 4] as const).map(ord => {
            const attenuation1Dec = -20 * ord;
            const attenuation2Dec = -40 * ord;
            return (
              <div key={ord} style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px', textAlign: 'center',
                borderTop: `3px solid ${filterOrder === ord ? colors.accent : colors.border}`,
              }}>
                <div style={{ ...typo.h3, color: filterOrder === ord ? colors.accent : colors.textMuted }}>
                  {ord === 1 ? '1st' : ord === 2 ? '2nd' : '4th'} Order
                </div>
                <div style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px' }}>
                  {attenuation1Dec} dB/decade
                </div>
                <div style={{ ...typo.small, color: colors.textMuted, marginTop: '2px' }}>
                  {attenuation2Dec} dB at 2 decades
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            disabled={!hasExperimented}
            style={{
              ...primaryButtonStyle,
              opacity: hasExperimented ? 1 : 0.5,
              cursor: hasExperimented ? 'pointer' : 'not-allowed',
            }}
          >
            {hasExperimented ? 'Review What I Learned \u2192' : `Experiment more (${experimentCount}/5)`}
          </button>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REVIEW PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'review') {
    return pageWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          Understanding Active Filters
        </h2>

        {/* Key formula */}
        <div style={{
          background: `${colors.accent}11`, borderRadius: '16px', padding: '24px', marginBottom: '24px',
          border: `1px solid ${colors.accent}33`, textAlign: 'center',
        }}>
          <div style={{ ...typo.h2, color: colors.accent, marginBottom: '12px' }}>
            fc = 1 / (2piRC)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <div style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>fc</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Cutoff frequency (Hz) where gain drops to -3 dB</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <div style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>R</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Resistance (ohms) - inversely proportional to fc</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <div style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>C</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Capacitance (farads) - inversely proportional to fc</div>
            </div>
          </div>
        </div>

        {/* Filter order and rolloff */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Filter Order and Rolloff</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              Each filter order adds <strong style={{ color: colors.accent }}>-20 dB/decade</strong> of rolloff in the stopband.
              The -3 dB point is where the output power drops to half (-3.01 dB = 10*log10(0.5)).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                { order: '1st order', rolloff: '-20 dB/dec', note: 'Single RC stage' },
                { order: '2nd order', rolloff: '-40 dB/dec', note: 'Sallen-Key topology' },
                { order: '3rd order', rolloff: '-60 dB/dec', note: 'Cascaded stages' },
                { order: '4th order', rolloff: '-80 dB/dec', note: 'Two 2nd-order stages' },
              ].map(item => (
                <div key={item.order} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px' }}>
                  <div style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>{item.order}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary }}>{item.rolloff}</div>
                  <div style={{ ...typo.small, color: colors.textMuted, fontSize: '11px' }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The -3 dB Point</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              At the cutoff frequency, the signal amplitude drops to <strong style={{ color: '#f59e0b' }}>70.7%</strong> of its passband value
              (voltage ratio = 1/sqrt(2)). This corresponds to <strong style={{ color: '#f59e0b' }}>half the power</strong> being passed through.
              This is the standard definition for filter bandwidth.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Active vs Passive Filters</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Active filters use <strong style={{ color: colors.accent }}>op-amps</strong> to provide gain, buffering, and higher Q factors
              without inductors. They can achieve steeper rolloff, lower output impedance, and adjustable gain compared to passive RC/LC networks.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Explore Butterworth vs Chebyshev &#x2192;
          </button>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TWIST PREDICT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'twist_predict') {
    return pageWrapper(
      <>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#x1F914;</div>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
            New Variable: Filter Response Type
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            Two 4th-order low-pass filters have the same cutoff frequency. One is Butterworth, the other is Chebyshev.
          </p>
          <p style={{ ...typo.body, color: colors.textMuted }}>
            Which filter provides sharper rolloff in the transition band?
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px',
        }}>
          {[
            { label: 'Butterworth (maximally flat passband)', value: 'butterworth' },
            { label: 'Chebyshev (allows passband ripple)', value: 'chebyshev' },
            { label: 'Both have identical rolloff', value: 'same' },
            { label: 'It depends on the cutoff frequency', value: 'depends' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { playSound('click'); setTwistPrediction(opt.value); }}
              style={{
                padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                background: twistPrediction === opt.value ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${twistPrediction === opt.value ? colors.accent : colors.border}`,
                color: twistPrediction === opt.value ? colors.accent : colors.textPrimary,
                fontSize: '14px', fontWeight: 600,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{
            background: twistPrediction === 'chebyshev' ? `${colors.success}15` : `${colors.warning}15`,
            border: `1px solid ${twistPrediction === 'chebyshev' ? colors.success : colors.warning}44`,
            borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center',
          }}>
            <p style={{
              ...typo.body,
              color: twistPrediction === 'chebyshev' ? colors.success : colors.warning,
              fontWeight: 600, marginBottom: '8px',
            }}>
              {twistPrediction === 'chebyshev' ? 'Correct!' : 'Not quite!'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Chebyshev filters trade passband flatness for a steeper transition band.
              By allowing ripple in the passband (equiripple behavior), the rolloff slope in the transition
              region is significantly steeper than a Butterworth of the same order.
            </p>
          </div>
        )}

        {twistPrediction && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Compare Them Interactively &#x2192;
            </button>
          </div>
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TWIST PLAY PHASE - Butterworth vs Chebyshev comparison
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'twist_play') {
    // Generate both curves for comparison
    const bodeW = isMobile ? 360 : 520;
    const bodeH = isMobile ? 280 : 340;
    const padL = 65, padR = 20, padT = 30, padB = 45;
    const chartW = bodeW - padL - padR;
    const chartH = bodeH - padT - padB;

    const fMin = 10, fMax = 1e6;
    const logMin = Math.log10(fMin), logMax = Math.log10(fMax);
    const dbMax = 5, dbMin2 = -80;

    const freqToX = (f: number) => padL + ((Math.log10(f) - logMin) / (logMax - logMin)) * chartW;
    const dbToY = (db: number) => padT + ((dbMax - db) / (dbMax - dbMin2)) * chartH;

    const numPts = 200;
    const buttPoints: string[] = [];
    const chebPoints: string[] = [];

    for (let i = 0; i <= numPts; i++) {
      const logF = logMin + (i / numPts) * (logMax - logMin);
      const freq = Math.pow(10, logF);
      const bDb = getMagnitudeDb(freq, cutoffFreq, filterType, filterOrder, 'butterworth', 0);
      const cDb = getMagnitudeDb(freq, cutoffFreq, filterType, filterOrder, 'chebyshev', chebyshevRipple);
      buttPoints.push(`${i === 0 ? 'M' : 'L'} ${freqToX(freq).toFixed(1)} ${dbToY(bDb).toFixed(1)}`);
      chebPoints.push(`${i === 0 ? 'M' : 'L'} ${freqToX(freq).toFixed(1)} ${dbToY(cDb).toFixed(1)}`);
    }

    const decadeFreqs = [10, 100, 1000, 10000, 100000, 1000000];
    const dbLines = [0, -10, -20, -30, -40, -50, -60, -70, -80];
    const db3Y = dbToY(-3);
    const fcX = freqToX(cutoffFreq);
    const fcInRange = cutoffFreq >= fMin && cutoffFreq <= fMax;

    return pageWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Butterworth vs Chebyshev
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
          Compare the two response types side by side. Adjust ripple and order to see the tradeoff.
        </p>

        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px',
          marginBottom: '24px',
        }}>
          {/* Comparison Bode plot */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: isMobile ? '12px' : '20px' }}>
              <svg viewBox={`0 0 ${bodeW} ${bodeH}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Butterworth vs Chebyshev comparison Bode plot">
                <defs>
                  <linearGradient id="twistBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <filter id="glowB" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect width={bodeW} height={bodeH} fill="url(#twistBg)" rx="12" />
                <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(15, 23, 42, 0.5)" rx="2" stroke="#334155" strokeWidth="0.5" />

                {/* Grid */}
                {decadeFreqs.map(f => {
                  const x = freqToX(f);
                  return (
                    <g key={`tvg-${f}`}>
                      <line x1={x} y1={padT} x2={x} y2={padT + chartH} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                      <text x={x} y={padT + chartH + 16} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                        {f >= 1e6 ? '1M' : f >= 1e3 ? `${f / 1e3}k` : `${f}`}
                      </text>
                    </g>
                  );
                })}
                {dbLines.map(db => {
                  const y = dbToY(db);
                  return (
                    <g key={`thg-${db}`}>
                      <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity={db === 0 ? 0.6 : 0.2} />
                      <text x={padL - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">{db}</text>
                    </g>
                  );
                })}

                {/* -3dB line */}
                <line x1={padL} y1={db3Y} x2={padL + chartW} y2={db3Y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 3" opacity="0.5" />

                {/* Butterworth curve */}
                <path d={buttPoints.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" filter="url(#glowB)" />

                {/* Chebyshev curve */}
                <path d={chebPoints.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 4" filter="url(#glowB)" />

                {/* fc marker */}
                {fcInRange && (
                  <line x1={fcX} y1={padT} x2={fcX} y2={padT + chartH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                )}

                {/* Legend */}
                <rect x={padL + 8} y={padT + 8} width="130" height="40" fill="rgba(15, 23, 42, 0.8)" rx="6" />
                <line x1={padL + 16} y1={padT + 22} x2={padL + 40} y2={padT + 22} stroke="#3b82f6" strokeWidth="2.5" />
                <text x={padL + 46} y={padT + 26} fill="#3b82f6" fontSize="10">Butterworth</text>
                <line x1={padL + 16} y1={padT + 38} x2={padL + 40} y2={padT + 38} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
                <text x={padL + 46} y={padT + 42} fill="#f59e0b" fontSize="10">Chebyshev</text>

                {/* Axis labels */}
                <text x={padL + chartW / 2} y={bodeH - 4} fill="#94a3b8" fontSize="11" textAnchor="middle">Frequency (Hz)</text>
                <text x={14} y={padT + chartH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 14, ${padT + chartH / 2})`}>Magnitude (dB)</text>
              </svg>
            </div>
          </div>

          {/* Controls */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px' }}>
              {/* Filter type */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Filter Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(ft => (
                    <button key={ft} onClick={() => { playSound('click'); setFilterType(ft); }}
                      style={{
                        padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: filterType === ft ? `${colors[ft as keyof typeof colors]}33` : colors.bgSecondary,
                        color: filterType === ft ? (colors[ft as keyof typeof colors] as string) : colors.textMuted,
                        fontSize: '12px', fontWeight: filterType === ft ? 700 : 400,
                      }}>
                      {FILTER_LABELS[ft]}
                    </button>
                  ))}
                </div>
              </div>

              {renderSlider('Resistance (R)', resistance, 1, 100, 1, 'kohm', setResistance, colors.accent, `${resistance} kohm`)}
              {renderSlider('Capacitance (C)', capacitance, 1, 100, 1, 'nF', setCapacitance, colors.accent, `${capacitance} nF`)}

              {/* Order */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Filter Order</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {([1, 2, 4] as const).map(ord => (
                    <button key={ord} onClick={() => { playSound('click'); setFilterOrder(ord); }}
                      style={{
                        padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: filterOrder === ord ? `${colors.accent}33` : colors.bgSecondary,
                        color: filterOrder === ord ? colors.accent : colors.textMuted,
                        fontSize: '13px', fontWeight: filterOrder === ord ? 700 : 400,
                      }}>
                      {ord === 1 ? '1st' : ord === 2 ? '2nd' : '4th'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chebyshev ripple */}
              {renderSlider('Chebyshev Ripple', chebyshevRipple, 0.5, 3, 0.1, 'dB', setChebyshevRipple, '#f59e0b', `${chebyshevRipple.toFixed(1)} dB`)}

              <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cutoff Frequency</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{formatFreq(cutoffFreq)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key insight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: `${colors.lowpass}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.lowpass}33` }}>
            <div style={{ ...typo.small, color: '#3b82f6', fontWeight: 700, marginBottom: '6px' }}>Butterworth</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>
              Maximally flat passband - no ripple. Monotonic rolloff. Preferred when amplitude accuracy in the passband is critical.
            </div>
          </div>
          <div style={{ background: `${colors.notch}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.notch}33` }}>
            <div style={{ ...typo.small, color: '#f59e0b', fontWeight: 700, marginBottom: '6px' }}>Chebyshev Type I</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>
              Allows equiripple in passband for steeper transition. Same order achieves sharper cutoff. Ripple amplitude is a design parameter.
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            Deep Understanding &#x2192;
          </button>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TWIST REVIEW PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'twist_review') {
    return pageWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          The Art of Filter Response Selection
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: '#3b82f6', marginBottom: '12px' }}>Butterworth: Maximally Flat Magnitude</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              The Butterworth response provides the <strong style={{ color: '#3b82f6' }}>flattest possible passband</strong>.
              No ripple, monotonic rolloff. The magnitude response is described by:
            </p>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <code style={{ color: '#3b82f6', fontSize: '14px' }}>|H(jw)|^2 = 1 / (1 + (w/wc)^(2n))</code>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
              Best for: audio processing, measurement instruments, ADC anti-aliasing where passband accuracy matters.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: '#f59e0b', marginBottom: '12px' }}>Chebyshev Type I: Equiripple Passband</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              By tolerating <strong style={{ color: '#f59e0b' }}>controlled ripple in the passband</strong>, Chebyshev filters achieve
              a steeper transition band than Butterworth of the same order. Uses Chebyshev polynomials:
            </p>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <code style={{ color: '#f59e0b', fontSize: '14px' }}>|H(jw)|^2 = 1 / (1 + e^2 * Tn^2(w/wc))</code>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
              Best for: RF channel selection, tight anti-aliasing with narrow transition bands, EMI filtering.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Design Tradeoff Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { property: 'Passband', butt: 'Maximally flat', cheb: 'Equiripple' },
                { property: 'Transition', butt: 'Gradual', cheb: 'Steeper' },
                { property: 'Phase', butt: 'Better', cheb: 'Worse (more nonlinear)' },
              ].map(row => (
                <div key={row.property} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px' }}>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700, marginBottom: '4px' }}>{row.property}</div>
                  <div style={{ ...typo.small, color: '#3b82f6' }}>Butt: {row.butt}</div>
                  <div style={{ ...typo.small, color: '#f59e0b' }}>Cheb: {row.cheb}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Key Insight</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              There is no universally "best" filter. The choice between Butterworth and Chebyshev depends on what matters most:
              passband accuracy or transition steepness. Higher order always means steeper rolloff but adds complexity and group delay.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
            See Real-World Applications &#x2192;
          </button>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TRANSFER PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Active Filter Design"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEST PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'test') {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;

    // Handle answer selection
    const handleAnswerSelect = (optId: string) => {
      if (answerConfirmed) return;
      setSelectedAnswer(optId);
    };

    // Handle answer confirmation
    const handleConfirmAnswer = () => {
      if (!selectedAnswer) return;
      playSound('click');
      setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
      setAnswerConfirmed(true);
    };

    // Handle next question
    const handleNextQuestion = () => {
      if (isLastQuestion) {
        setTestSubmitted(true);
        const computedScore = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
        setTestScore(computedScore);
        onGameEvent?.({
          eventType: 'game_completed',
          gameType: 'active_filter_design',
          gameTitle: 'Active Filter Design',
          details: { score: computedScore, total: testQuestions.length },
          timestamp: Date.now(),
        });
        playSound(computedScore >= 7 ? 'complete' : 'failure');
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerConfirmed(false);
      }
    };

    // Test results screen
    if (testSubmitted) {
      const passed = testScore >= 7;
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

      return pageWrapper(
        <>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🎉' : '📚'}</div>
            <h2 style={{ ...typo.h1, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <div style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / {testQuestions.length}
            </div>
            <div style={{
              display: 'inline-block', padding: '8px 24px', borderRadius: '12px', marginBottom: '16px',
              background: passed ? `${colors.success}22` : `${colors.warning}22`,
              border: `2px solid ${passed ? colors.success : colors.warning}`,
            }}>
              <span style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>Grade: {grade}</span>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {passed ? 'You have mastered Active Filter Design!' : 'Review the concepts and try again.'}
            </p>
          </div>

          {/* Answer key - rich colored indicators */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>Answer Key</h3>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[q.id];
              const correctAnswer = q.options.find(o => o.correct)?.id;
              const isCorrect = userAnswer === correctAnswer;
              const wasSkipped = !userAnswer;
              const bgColor = isCorrect ? 'rgba(16, 185, 129, 0.1)' : wasSkipped ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
              const borderColor = isCorrect ? '#10b981' : wasSkipped ? '#f59e0b' : '#ef4444';
              const statusLabel = isCorrect ? 'Correct' : wasSkipped ? 'Skipped' : 'Incorrect';
              const statusColor = isCorrect ? colors.success : wasSkipped ? colors.warning : colors.error;

              return (
                <div key={q.id} style={{
                  background: bgColor, borderRadius: '12px', padding: '16px', marginBottom: '10px',
                  border: `1px solid ${borderColor}44`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700 }}>Q{i + 1}: {q.question.substring(0, 60)}...</span>
                    <span style={{
                      padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                      background: `${statusColor}22`, color: statusColor,
                    }}>{statusLabel}</span>
                  </div>
                  {!isCorrect && (
                    <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                      Correct: {q.options.find(o => o.correct)?.label}
                    </div>
                  )}
                  <div style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {passed ? (
              <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
                Complete Lesson &#x2192;
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers({});
                  setCurrentQuestionIndex(0);
                  setSelectedAnswer(null);
                  setAnswerConfirmed(false);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
        </>
      );
    }

    // Question display
    return pageWrapper(
      <>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>
            Question {currentQuestionIndex + 1} of {testQuestions.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {testQuestions.map((q, i) => (
              <div key={q.id} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i === currentQuestionIndex ? colors.accent : testAnswers[q.id] ? colors.success : colors.border,
              }} />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div style={{
          background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{currentQuestion.scenario}</p>
        </div>

        {/* Question */}
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {currentQuestion.options.map(opt => {
            const isSelected = selectedAnswer === opt.id;
            const isCorrectOption = opt.correct;
            let optBg = colors.bgCard;
            let optBorder = colors.border;
            let optColor = colors.textPrimary;

            if (answerConfirmed) {
              if (isCorrectOption) {
                optBg = `${colors.success}22`;
                optBorder = colors.success;
                optColor = colors.success;
              } else if (isSelected && !isCorrectOption) {
                optBg = `${colors.error}22`;
                optBorder = colors.error;
                optColor = colors.error;
              }
            } else if (isSelected) {
              optBg = `${colors.accent}22`;
              optBorder = colors.accent;
              optColor = colors.accent;
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleAnswerSelect(opt.id)}
                style={{
                  background: optBg, border: `2px solid ${optBorder}`, borderRadius: '10px',
                  padding: '14px 16px', textAlign: 'left', cursor: answerConfirmed ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: isSelected ? optBorder : colors.bgSecondary,
                  color: isSelected ? '#fff' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                  verticalAlign: 'middle',
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: optColor, ...typo.small }}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation after confirming */}
        {answerConfirmed && (
          <div style={{
            background: `${colors.accent}11`, borderRadius: '10px', padding: '14px', marginBottom: '16px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {!answerConfirmed ? (
            <button
              onClick={handleConfirmAnswer}
              disabled={!selectedAnswer}
              style={{
                flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                background: selectedAnswer ? colors.accent : colors.border,
                color: '#fff', cursor: selectedAnswer ? 'pointer' : 'not-allowed', fontWeight: 600,
              }}
            >
              Confirm Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              style={{
                flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                background: isLastQuestion ? colors.success : colors.accent,
                color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}
            >
              {isLastQuestion ? 'Submit Test' : 'Next Question \u2192'}
            </button>
          )}
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MASTERY PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', paddingBottom: '100px', textAlign: 'center', overflowY: 'auto', flex: 1, paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '100px', marginBottom: '24px' }}>
          <span role="img" aria-label="trophy">&#x1F3C6;</span>
        </div>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Active Filter Design Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '24px' }}>
          You now understand how active filters shape frequency response using op-amps, resistors, and capacitors.
        </p>

        {/* Score recap */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px',
          maxWidth: '450px', width: '100%',
        }}>
          <div style={{ ...typo.h2, color: colors.accent, marginBottom: '4px' }}>
            Test Score: {testScore}/{testQuestions.length}
          </div>
          <div style={{ ...typo.small, color: colors.textMuted }}>
            {Math.round((testScore / testQuestions.length) * 100)}% Correct
          </div>
        </div>

        {/* Key takeaways */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px',
          maxWidth: '450px', width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'fc = 1/(2piRC) sets the cutoff frequency',
              'Filter order determines rolloff steepness (-20 dB/dec per order)',
              'LP, HP, BP, and notch filter types for different applications',
              'Butterworth: maximally flat vs Chebyshev: sharper transition',
              'The -3 dB point marks half-power bandwidth',
              'Real-world applications: audio, EMI, RF, biomedical',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: colors.success, flexShrink: 0, marginTop: '2px' }}>&#x2713;</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.textSecondary, cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        </div>

        {/* Complete Game sticky button */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: '1px solid rgba(59, 130, 246, 0.3)',
          zIndex: 1000,
        }}>
          <button
            onClick={() => {
              onGameEvent?.({
                eventType: 'game_completed',
                gameType: 'active_filter_design',
                gameTitle: 'Active Filter Design',
                details: { mastery_achieved: true, score: testScore, total: testQuestions.length },
                timestamp: Date.now(),
              });
              window.location.href = '/games';
            }}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#ffffff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', minHeight: '44px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            }}
          >
            Complete Game
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.textPrimary }}>Loading Active Filter Design...</p>
    </div>
  );
};

export default FilterDesignRenderer;
