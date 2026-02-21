'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

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

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// ────────────────────────────────────────────────────────────────────────────
// SOUND UTILITY
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ────────────────────────────────────────────────────────────────────────────

const colors = {
  primary: '#eab308',
  primaryDark: '#ca8a04',
  accent: '#f59e0b',
  accentDark: '#d97706',
  warning: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  border: '#475569',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#64748b',
};

// ────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed solar applications
// ────────────────────────────────────────────────────────────────────────────

const realWorldApps = [
  {
    icon: '🏠',
    title: 'Residential Rooftop Systems',
    short: 'Home solar installations',
    tagline: 'Powering homes with optimized strings',
    description: 'Home systems typically use 8-12 panels per string, carefully sized for the inverter MPPT range and local temperature extremes. Proper string sizing maximizes energy harvest year-round.',
    connection: 'The string voltage equation V = N x Voc directly determines how many panels can safely connect to your home inverter without damage.',
    howItWorks: 'Installers calculate maximum cold-weather voltage to stay under inverter limits, and minimum hot-weather voltage to stay in MPPT range. This ensures optimal performance in all seasons.',
    stats: [
      { value: '12x', label: 'Panels per string', icon: '🔢' },
      { value: '400V', label: 'Typical string voltage', icon: '⚡' },
      { value: '5000W', label: 'System capacity', icon: '📋' }
    ],
    examples: ['Single-family homes', 'Townhouses', 'Small commercial', 'Agricultural buildings'],
    companies: ['Tesla', 'Sunrun', 'SunPower', 'Vivint Solar'],
    futureImpact: 'Smart inverters will automatically adjust MPPT ranges based on real-time temperature data, maximizing harvest in all conditions.',
    color: '#f59e0b'
  },
  {
    icon: '☀️',
    title: 'Utility-Scale Solar Farms',
    short: 'Grid-scale power plants',
    tagline: 'Megawatts from optimized string design',
    description: 'Large installations use central inverters with multiple string combiner boxes. String length is optimized for cable costs, voltage drop, and inverter specifications.',
    connection: 'At utility scale, even small string sizing errors multiply across thousands of panels. Precise voltage calculations prevent millions in losses or damage.',
    howItWorks: 'Engineers use software like PVsyst to model string configurations, accounting for temperature extremes, cable losses, and inverter specifications. Strings are often longer (15-20+ panels) with higher-voltage inverters.',
    stats: [
      { value: '1500V', label: 'DC system voltage', icon: '⚡' },
      { value: '100MW+', label: 'Plant capacity', icon: '🔌' },
      { value: '30+', label: 'Panels per string', icon: '🔢' }
    ],
    examples: ['Desert installations', 'Agricultural land', 'Floating solar', 'Brownfield sites'],
    companies: ['First Solar', 'NextEra', 'AES', 'Enel'],
    futureImpact: 'Bifacial panels and tracker systems add complexity to string sizing but increase energy yield by 10-20%.',
    color: '#3b82f6'
  },
  {
    icon: '❄️',
    title: 'Cold Climate Installations',
    short: 'Northern region solar design',
    tagline: 'Winter voltage spikes demand careful design',
    description: 'In northern regions, winter cold can push string voltage 15-20% higher than rated. Fewer panels per string prevent inverter damage during cold snaps.',
    connection: 'The temperature coefficient (-0.3%/C) means a panel at -20C produces significantly higher voltage than at 25C. This is the critical constraint in cold climates.',
    howItWorks: 'Designers use minimum expected temperature (often -30C to -40C) to calculate worst-case Voc. String length is reduced to keep maximum voltage under inverter limits with safety margin.',
    stats: [
      { value: '-40C', label: 'Design temperature', icon: '🌡️' },
      { value: '+18%', label: 'Voltage increase', icon: '📈' },
      { value: '6-8', label: 'Panels per string', icon: '🔢' }
    ],
    examples: ['Canada', 'Scandinavia', 'Alaska', 'Northern Europe'],
    companies: ['Canadian Solar', 'Fortis', 'Vattenfall', 'Statkraft'],
    futureImpact: 'Panels with lower temperature coefficients and wider MPPT inverters will allow longer strings in cold regions.',
    color: '#8b5cf6'
  },
  {
    icon: '🏜️',
    title: 'Desert Installations',
    short: 'Hot climate optimization',
    tagline: 'Heat reduces voltage but enables longer strings',
    description: 'Hot climates reduce panel voltage but increase current. More panels can be strung together without exceeding limits, but thermal management and cable sizing become critical.',
    connection: 'High temperatures mean lower Voc, allowing more panels per string. However, the minimum voltage constraint (MPPT range) becomes the limiting factor.',
    howItWorks: 'Desert designs focus on hot-day voltage to ensure strings stay within MPPT range. Cable sizing accounts for higher currents. Cleaning and cooling systems maintain performance.',
    stats: [
      { value: '60C+', label: 'Cell temperature', icon: '🌡️' },
      { value: '-15%', label: 'Voltage reduction', icon: '📉' },
      { value: '12-15', label: 'Panels per string', icon: '🔢' }
    ],
    examples: ['UAE', 'Saudi Arabia', 'Australia', 'Southwest USA'],
    companies: ['ACWA Power', 'Masdar', 'Engie', 'EDF'],
    futureImpact: 'Floating solar on cooling ponds and agrivoltaics combine shading with power generation to reduce thermal losses.',
    color: '#22c55e'
  }
];

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA - Scenario-based multiple choice questions
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  // Question 1: Core concept - series voltage (Easy)
  {
    scenario: "A homeowner is installing a solar system with panels rated at 40V open-circuit voltage (Voc). They want to connect panels in a series string to their inverter.",
    question: "If they connect 10 panels in series, what is the total string voltage?",
    options: [
      { id: 'a', text: "40V - voltage stays the same in series", correct: false },
      { id: 'b', text: "400V - voltages add in series", correct: true },
      { id: 'c', text: "4V - voltage divides among panels", correct: false },
      { id: 'd', text: "Cannot be determined without current rating", correct: false }
    ],
    explanation: "When panels are connected in series, their voltages add together. 10 panels x 40V = 400V total string voltage. This is the fundamental principle of string sizing."
  },
  // Question 2: Maximum voltage limit (Easy-Medium)
  {
    scenario: "An installer is configuring a residential system. The inverter specifications show a maximum DC input voltage of 450V. The panels are rated at 42V Voc each.",
    question: "What is the maximum number of panels that can be safely connected in one string?",
    options: [
      { id: 'a', text: "11 panels (462V) - a little over is fine", correct: false },
      { id: 'b', text: "10 panels (420V) - with safety margin", correct: true },
      { id: 'c', text: "15 panels (630V) - more panels means more power", correct: false },
      { id: 'd', text: "8 panels (336V) - always stay 25% under limit", correct: false }
    ],
    explanation: "Maximum voltage is a hard limit - exceeding it damages the inverter. 10 panels at 420V leaves a safe margin below 450V. However, this doesn't account for cold weather voltage increases, which require even more margin."
  },
  // Question 3: MPPT range concept (Medium)
  {
    scenario: "A commercial installer reviews inverter specs showing an MPPT range of 150V-400V. This means the inverter can only optimize power extraction when string voltage is within this window.",
    question: "What happens if the string voltage drops below the MPPT minimum (150V)?",
    options: [
      { id: 'a', text: "The inverter stops producing power entirely", correct: false },
      { id: 'b', text: "The inverter operates but cannot optimize power, reducing efficiency", correct: true },
      { id: 'c', text: "Nothing - MPPT range is just a recommendation", correct: false },
      { id: 'd', text: "The inverter automatically adjusts its limits", correct: false }
    ],
    explanation: "Below the MPPT range, the inverter cannot perform maximum power point tracking effectively. It may still produce some power, but efficiency drops significantly. This is why hot-weather voltage must stay above MPPT minimum."
  },
  // Question 4: Temperature effect direction (Medium)
  {
    scenario: "A solar designer is planning a system in Minnesota where winter temperatures can reach -30C (-22F). They're concerned about voltage behavior in extreme cold.",
    question: "How does extreme cold affect solar panel voltage compared to the rated 25C (77F) test conditions?",
    options: [
      { id: 'a', text: "Voltage decreases - cold reduces panel efficiency", correct: false },
      { id: 'b', text: "Voltage stays the same - temperature doesn't affect voltage", correct: false },
      { id: 'c', text: "Voltage increases - cold significantly raises open-circuit voltage", correct: true },
      { id: 'd', text: "Voltage fluctuates randomly in cold weather", correct: false }
    ],
    explanation: "Solar panels have a negative temperature coefficient for voltage (typically -0.3%/C). This means voltage INCREASES as temperature drops. At -30C (55 degrees below STC), voltage increases by about 16.5%, which can push strings over inverter limits."
  },
  // Question 5: Temperature calculation (Medium-Hard)
  {
    scenario: "A panel has Voc of 40V at STC (25C) with a temperature coefficient of -0.3%/C. The installation site has a minimum expected temperature of -15C.",
    question: "What is the maximum expected Voc at -15C?",
    options: [
      { id: 'a', text: "About 35V (voltage drops in cold)", correct: false },
      { id: 'b', text: "About 40V (no significant change)", correct: false },
      { id: 'c', text: "About 45V (12% increase)", correct: true },
      { id: 'd', text: "About 52V (30% increase)", correct: false }
    ],
    explanation: "Temperature delta is -15C - 25C = -40C. Voltage change = -0.3% x (-40) = +12%. So Voc at -15C = 40V x 1.12 = 44.8V (about 45V). This 12% increase must be factored into string sizing."
  },
  // Question 6: Real-world design scenario (Hard)
  {
    scenario: "You're designing a system with panels rated 45V Voc at STC (-0.3%/C coefficient). The inverter has 600V max input and 300V-500V MPPT range. Site minimum temperature is -20C, maximum is 50C.",
    question: "What is the optimal number of panels per string?",
    options: [
      { id: 'a', text: "8 panels - maximizes power within all limits", correct: false },
      { id: 'b', text: "10 panels - balances cold and hot extremes", correct: true },
      { id: 'c', text: "13 panels - stays just under 600V max", correct: false },
      { id: 'd', text: "6 panels - provides maximum safety margin", correct: false }
    ],
    explanation: "At -20C: Voc increases ~13.5% to 51V/panel. 10 panels = 510V (under 600V max). At 50C: Voc decreases ~7.5% to 41.6V. Under load ~85% of Voc = 35V/panel. 10 panels = 350V (within 300-500V MPPT). 10 panels is optimal."
  },
  // Question 7: Voc vs operating voltage (Hard)
  {
    scenario: "A designer is confused about which voltage to use for string calculations. Panels show both Voc (open-circuit voltage) of 42V and Vmp (maximum power voltage) of 35V on the datasheet.",
    question: "Which voltage should be used when calculating maximum string voltage against inverter limits?",
    options: [
      { id: 'a', text: "Vmp - this is the actual operating voltage", correct: false },
      { id: 'b', text: "Voc - this is the maximum possible voltage", correct: true },
      { id: 'c', text: "Average of Voc and Vmp", correct: false },
      { id: 'd', text: "Either one - they're close enough", correct: false }
    ],
    explanation: "Always use Voc for maximum voltage calculations because this represents the highest voltage the string can produce (at open circuit, like during inverter startup or shutdown). Using Vmp would underestimate the maximum and risk damage."
  },
  // Question 8: Parallel vs series (Hard)
  {
    scenario: "An installer needs to connect 20 panels to an inverter with 500V max and two MPPT inputs. They're deciding between string configurations.",
    question: "What's the advantage of using two parallel strings of 10 panels each vs one string of 20 panels?",
    options: [
      { id: 'a', text: "Two parallel strings produce double the voltage", correct: false },
      { id: 'b', text: "Two parallel strings stay within voltage limits while using all panels", correct: true },
      { id: 'c', text: "Single long string is always more efficient", correct: false },
      { id: 'd', text: "There's no difference - total power is the same", correct: false }
    ],
    explanation: "20 panels in series would produce ~800V+ (way over 500V limit). Two parallel strings of 10 panels each produces ~400V per string, staying safely under the limit. Parallel strings share current, not voltage."
  },
  // Question 9: Practical installation (Hard)
  {
    scenario: "During a site inspection, an installer notices the existing 10-panel string shows 380V on a mild 20C day. The inverter maximum is 450V. The site can experience -25C in winter.",
    question: "Is this installation safe for winter operation?",
    options: [
      { id: 'a', text: "Yes - there's 70V of margin below the limit", correct: false },
      { id: 'b', text: "No - cold weather voltage increase will exceed the limit", correct: true },
      { id: 'c', text: "Maybe - depends on panel orientation", correct: false },
      { id: 'd', text: "Yes - inverters have built-in protection", correct: false }
    ],
    explanation: "At 20C the string shows 380V. At -25C (45 degrees colder), voltage increases ~13.5% to ~431V. Add cold morning conditions and the string could spike to 460V+, exceeding the 450V limit. This installation needs modification."
  },
  // Question 10: System design trade-offs (Hard)
  {
    scenario: "A utility is planning a 100MW solar farm. They can choose between 1000V and 1500V system voltage. Higher voltage allows longer strings but requires different equipment.",
    question: "What is the primary advantage of choosing 1500V system voltage for a utility-scale project?",
    options: [
      { id: 'a', text: "Higher voltage panels produce more power", correct: false },
      { id: 'b', text: "Longer strings reduce combiner boxes and cable costs significantly", correct: true },
      { id: 'c', text: "1500V systems don't need inverters", correct: false },
      { id: 'd', text: "Higher voltage eliminates temperature concerns", correct: false }
    ],
    explanation: "Higher system voltage allows more panels per string (30+ vs 15-20), reducing the number of strings, combiner boxes, and cable runs. For large projects, this translates to millions in savings on balance-of-system costs."
  }
];

interface StringSizingRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function StringSizingRenderer({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: StringSizingRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL PHASE STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [panelCount, setPanelCount] = useState(8);
  const [panelVoc, setPanelVoc] = useState(40); // Volts per panel
  const [inverterMaxV] = useState(450);
  const [inverterMpptMin] = useState(150);
  const [inverterMpptMax] = useState(400);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - temperature effects
  const [temperature, setTemperature] = useState(25); // Celsius
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
  const { isMobile } = useViewport();
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

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // CALCULATED VALUES
  // ──────────────────────────────────────────────────────────────────────────

  // Calculate string voltage with temperature compensation
  const tempCoefficient = -0.003; // -0.3% per degree C (typical for silicon)
  const stcTemp = 25; // Standard Test Conditions temperature
  const tempDelta = temperature - stcTemp;
  const voltageAdjustment = 1 + (tempCoefficient * tempDelta);
  const adjustedVoc = panelVoc * voltageAdjustment;
  const stringVoltage = panelCount * adjustedVoc;

  // Check string status
  const isOverVoltage = stringVoltage > inverterMaxV;
  const isInMpptRange = stringVoltage >= inverterMpptMin && stringVoltage <= inverterMpptMax;
  const isBelowMppt = stringVoltage < inverterMpptMin;

  const getStatusColor = () => {
    if (isOverVoltage) return '#ef4444';
    if (isBelowMppt) return '#f59e0b';
    if (isInMpptRange) return '#22c55e';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (isOverVoltage) return 'DANGER: Over Max Voltage!';
    if (isBelowMppt) return 'Warning: Below MPPT Range';
    if (isInMpptRange) return 'Optimal: In MPPT Range';
    return 'Warning: Above MPPT Range';
  };

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 300);
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

  // ──────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR COMPONENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            width: '44px',
            height: '44px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          ←
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: i < currentIdx
                  ? colors.success
                  : i === currentIdx
                    ? colors.primary
                    : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s',
                opacity: i > currentIdx ? 0.5 : 1,
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        {/* Phase label and count */}
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: colors.primary,
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: `${colors.primary}15`,
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // NAV DOTS COMPONENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 0',
      }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            style={{
              width: phase === p ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: currentIdx >= i ? colors.accent : colors.border,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            aria-label={phaseLabels[p]}
          />
        ))}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION BAR
  // ──────────────────────────────────────────────────────────────────────────

  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600,
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            playSound('click');
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext
              ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
              : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            minHeight: '44px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
    playSound('click');
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
    playSound('click');
  }, []);

  const handlePanelCountChange = useCallback((value: number) => {
    setPanelCount(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(value);
    setHasExploredTwist(true);
  }, []);

  const handleCompleteApp = useCallback((index: number) => {
    setCompletedApps(prev => new Set([...prev, index]));
    playSound('success');
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerId: string) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerId;
      return newAnswers;
    });
    playSound('click');
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      const question = testQuestions[index];
      const correctOption = question.options.find(opt => opt.correct);
      if (answer === correctOption?.id) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 7) {
      playSound('complete');
      if (onCorrectAnswer) onCorrectAnswer();
    } else {
      playSound('failure');
      if (onIncorrectAnswer) onIncorrectAnswer();
    }
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER PHASES
  // ────────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
        boxShadow: '0 0 20px rgba(234, 179, 8, 0.2)',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 600 }}>SOLAR ENGINEERING</span>
      </div>

      <h1 style={{ fontSize: typo.title, fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px', textShadow: '0 0 20px rgba(234, 179, 8, 0.3)' }}>
        Why Can't You Just Connect Any Number of Solar Panels Together?
      </h1>

      <p style={{ fontSize: typo.body, color: '#e2e8f0', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px', fontWeight: 400 }}>
        Too few panels and you lose power. Too many and you destroy your inverter. The sweet spot depends on physics!
      </p>

      <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="String Sizing visualization">
        <defs>
          <linearGradient id="strPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="strBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="strWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        <rect width="400" height="200" fill="url(#strBgGrad)" rx="12" />

        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} transform={`translate(${50 + i * 60}, 55)`}>
            <rect x="2" y="2" width="50" height="70" fill="#000" fillOpacity="0.3" rx="4" />
            <rect width="50" height="70" fill="#64748b" rx="4" />
            <rect x="3" y="3" width="44" height="64" fill="url(#strPanelGrad)" rx="2" />
            <line x1="10" y1="15" x2="40" y2="15" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="10" y1="30" x2="40" y2="30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="10" y1="45" x2="40" y2="45" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
          </g>
        ))}

        {[0, 1, 2, 3].map(i => (
          <line
            key={`conn-${i}`}
            x1={100 + i * 60} y1="90"
            x2={110 + i * 60} y2="90"
            stroke="url(#strWireGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}

        <text x="200" y="160" textAnchor="middle" fill="#e2e8f0" fontSize="14">
          5 panels x 40V = 200V
        </text>
        <text x="200" y="180" textAnchor="middle" fill="#22c55e" fontSize="12">
          But the inverter max is 450V... Can we add more?
        </text>
      </svg>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          Solar panels in series add their voltages together. But inverters have strict limits -
          both a <strong style={{ color: '#ef4444' }}>maximum voltage</strong> that can damage it,
          and an <strong style={{ color: '#22c55e' }}>MPPT range</strong> where it operates efficiently.
        </p>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      {/* Static visualization */}
      <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="strPanelGradPredict" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
        <rect width="400" height="150" fill="#0f172a" rx="12" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <g key={i} transform={`translate(${25 + i * 45}, 35)`}>
            <rect width="40" height="55" fill="#64748b" rx="3" />
            <rect x="2" y="2" width="36" height="51" fill="url(#strPanelGradPredict)" rx="2" />
            <text x="20" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11">40V</text>
          </g>
        ))}
        <text x="200" y="120" textAnchor="middle" fill="#fcd34d" fontSize="14" fontWeight="bold">
          8 panels x 40V = 320V | How many more can we add?
        </text>
      </svg>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          You have panels rated at 40V each and an inverter with 450V max input.
          What's the maximum number of panels you can safely connect in one string?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: '8', label: '8 panels (320V) - stay well below max', icon: '🔒' },
          { id: '11', label: '11 panels (440V) - just under the limit', icon: '⚠️' },
          { id: '15', label: '15 panels (600V) - more is better!', icon: '🚀' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #eab308'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(234, 179, 8, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{
          background: prediction === '8' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === '8' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === '8' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === '8' ? (
              <><strong>Smart thinking!</strong> While 11 panels seems safe at room temperature, we need margin for cold weather when voltage increases. 8-10 is often the safe choice.</>
            ) : prediction === '11' ? (
              <><strong>Close, but risky!</strong> At 25C this works, but on a cold morning panels produce HIGHER voltage. 440V could spike to 500V+ and damage the inverter!</>
            ) : (
              <><strong>Danger!</strong> 600V would immediately destroy the inverter. Never exceed the maximum input voltage - it's a hard limit for safety.</>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        String Sizing Calculator
      </h2>
      <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px' }}>
        Adjust panel count to find the optimal string size
      </p>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
      }}>
        <p style={{ color: '#93c5fd', fontSize: '13px', lineHeight: 1.5 }}>
          <strong>Observe:</strong> Try different panel counts and watch the voltage change. Notice where the voltage enters the green MPPT range and when it goes into the danger zone.
        </p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        marginBottom: '16px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      {/* SVG visualization of panels and voltage chart */}
      <svg viewBox="0 0 400 300" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="strPanelGradPlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="playChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </linearGradient>
          <filter id="playMarkerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="playBgGrad">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#playBgGrad)" rx="8" />
        {/* Panel display group */}
        <g>
          <text x="200" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">Solar Panel String Configuration</text>
          {Array.from({ length: Math.min(panelCount, 12) }).map((_, i) => (
            <rect key={i} x={10 + i * 32} y={28} width="28" height="40" fill="url(#strPanelGradPlay)" rx="2" />
          ))}
          {panelCount > 12 && (
            <text x="390" y="50" textAnchor="end" fill="#e2e8f0" fontSize="12">+{panelCount - 12}</text>
          )}
          <text x="200" y="88" textAnchor="middle" fill={getStatusColor()} fontSize="14" fontWeight="bold">
            {panelCount} panels x {panelVoc}V = {stringVoltage.toFixed(0)}V
          </text>
        </g>
        {/* Voltage chart group */}
        <g>
          {/* Chart axes */}
          <line x1="55" y1="100" x2="55" y2="275" stroke="#475569" strokeWidth="1" />
          <line x1="55" y1="275" x2="380" y2="275" stroke="#475569" strokeWidth="1" />
          {/* Grid lines */}
          <line x1="55" y1="130" x2="380" y2="130" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1="55" y1="165" x2="380" y2="165" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1="55" y1="200" x2="380" y2="200" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1="55" y1="235" x2="380" y2="235" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
          {/* Danger zone line */}
          <line x1="55" y1={275 - (inverterMaxV / 600) * 175} x2="380" y2={275 - (inverterMaxV / 600) * 175} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" />
          {/* MPPT range band */}
          <rect x="55" y={275 - (inverterMpptMax / 600) * 175} width="325" height={((inverterMpptMax - inverterMpptMin) / 600) * 175} fill="rgba(34,197,94,0.12)" />
          {/* Filled area under curve */}
          <path d={`M 55 275 L 55 ${275 - (4 * panelVoc / 600) * 175} L 84 ${275 - (5 * panelVoc / 600) * 175} L 113 ${275 - (6 * panelVoc / 600) * 175} L 142 ${275 - (7 * panelVoc / 600) * 175} L 171 ${275 - (8 * panelVoc / 600) * 175} L 200 ${275 - (9 * panelVoc / 600) * 175} L 229 ${275 - (10 * panelVoc / 600) * 175} L 258 ${275 - (11 * panelVoc / 600) * 175} L 287 ${275 - (12 * panelVoc / 600) * 175} L 316 ${275 - (13 * panelVoc / 600) * 175} L 345 ${275 - (14 * panelVoc / 600) * 175} L 374 ${275 - (15 * panelVoc / 600) * 175} L 374 275 Z`} fill="url(#playChartGrad)" />
          {/* Voltage curve with 12 points spanning full range */}
          <path d={`M 55 ${275 - (4 * panelVoc / 600) * 175} L 84 ${275 - (5 * panelVoc / 600) * 175} L 113 ${275 - (6 * panelVoc / 600) * 175} L 142 ${275 - (7 * panelVoc / 600) * 175} L 171 ${275 - (8 * panelVoc / 600) * 175} L 200 ${275 - (9 * panelVoc / 600) * 175} L 229 ${275 - (10 * panelVoc / 600) * 175} L 258 ${275 - (11 * panelVoc / 600) * 175} L 287 ${275 - (12 * panelVoc / 600) * 175} L 316 ${275 - (13 * panelVoc / 600) * 175} L 345 ${275 - (14 * panelVoc / 600) * 175} L 374 ${275 - (15 * panelVoc / 600) * 175}`} stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Interactive marker group */}
          <g>
            <circle cx={55 + ((panelCount - 4) / 11) * 319} cy={275 - (stringVoltage / 600) * 175} r={8} fill={getStatusColor()} filter="url(#playMarkerGlow)" stroke="#ffffff" strokeWidth="2" />
            <ellipse cx={55 + ((panelCount - 4) / 11) * 319} cy={275 - (stringVoltage / 600) * 175} rx="14" ry="14" fill="none" stroke={getStatusColor()} strokeWidth="1" opacity="0.3" />
          </g>
          {/* Y-axis labels */}
          <text x="50" y={275 - (inverterMaxV / 600) * 175 - 5} textAnchor="end" fill="#ef4444" fontSize="11">{inverterMaxV}V</text>
          <text x="50" y={275 - (inverterMpptMax / 600) * 175 + 4} textAnchor="end" fill="#22c55e" fontSize="11">{inverterMpptMax}V</text>
          <text x="50" y={275 - (inverterMpptMin / 600) * 175 + 4} textAnchor="end" fill="#22c55e" fontSize="11">{inverterMpptMin}V</text>
          {/* X-axis labels */}
          <text x="55" y="290" fill="#94a3b8" fontSize="11">4 panels</text>
          <text x="374" y="290" textAnchor="end" fill="#94a3b8" fontSize="11">15 panels</text>
          {/* Axis title - positioned right of y-axis labels to avoid overlap */}
          <text x="250" y="120" textAnchor="middle" fill="#94a3b8" fontSize="11">Voltage vs Panel Count</text>
        </g>
      </svg>
      </div>
      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px' }}>STRING VOLTAGE</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getStatusColor() }}>
          {stringVoltage.toFixed(0)}V
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${getStatusColor()}20`,
          borderRadius: '20px',
          fontSize: '12px',
          color: getStatusColor(),
          fontWeight: 600,
          marginTop: '8px',
        }}>
          {getStatusText()}
        </div>
      </div>

      {/* Voltage bar visualization */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          height: '24px',
          background: '#0f172a',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* MPPT range */}
          <div style={{
            position: 'absolute',
            left: `${(inverterMpptMin / 500) * 100}%`,
            width: `${((inverterMpptMax - inverterMpptMin) / 500) * 100}%`,
            height: '100%',
            background: 'rgba(34, 197, 94, 0.3)',
          }} />
          {/* Danger zone */}
          <div style={{
            position: 'absolute',
            left: `${(inverterMaxV / 500) * 100}%`,
            right: 0,
            height: '100%',
            background: 'rgba(239, 68, 68, 0.3)',
          }} />
          {/* Current voltage marker */}
          <div style={{
            position: 'absolute',
            left: `${Math.min((stringVoltage / 500) * 100, 100)}%`,
            top: 0,
            bottom: 0,
            width: '4px',
            background: getStatusColor(),
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px ${getStatusColor()}`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '10px' }}>0V</span>
          <span style={{ color: '#22c55e', fontSize: '10px' }}>{inverterMpptMin}V</span>
          <span style={{ color: '#22c55e', fontSize: '10px' }}>{inverterMpptMax}V</span>
          <span style={{ color: '#ef4444', fontSize: '10px' }}>{inverterMaxV}V MAX</span>
        </div>
      </div>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => handlePanelCountChange(parseInt(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#eab308' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>4 panels</span>
          <span>15 panels</span>
        </div>
      </div>
      </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#e2e8f0' }}>Panel Voc</div>
          <div style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>{panelVoc}V</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#e2e8f0' }}>Panels x Voltage</div>
          <div style={{ fontSize: '18px', color: '#eab308', fontWeight: 'bold' }}>{panelCount} x {panelVoc}V</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Goal:</strong> Keep the string voltage within the green MPPT range.
          Too low = lost efficiency. Too high = potential damage!
          When you increase the panel count, the total string voltage increases proportionally because voltages add in series.
          This is important for real-world solar design and engineering applications.</p>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        String Sizing Fundamentals
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>The String Equation</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>V_string = N_panels x V_panel</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '8px' }}>
          Series connection adds voltages
        </div>
      </div>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
          As you observed in the experiment, adding more panels increases string voltage linearly. Your prediction and observation confirm that string sizing requires careful calculation.
        </p>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Maximum Voltage Limit',
          desc: "Never exceed the inverter's max input voltage. This is a hard safety limit - exceeding it causes immediate damage.",
        },
        {
          icon: '🎯',
          title: 'MPPT Range',
          desc: 'Maximum Power Point Tracking works within a voltage window. Outside this range, the inverter cannot optimize power output.',
        },
        {
          icon: '📊',
          title: 'Voc vs Operating Voltage',
          desc: 'Voc (open-circuit voltage) is higher than operating voltage. Always use Voc for max voltage calculations.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
        The Temperature Factor
      </h2>

      {/* Static SVG visualization for twist predict */}
      <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="twistBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="400" height="220" fill="url(#twistBgGrad)" rx="12" />
        <text x="200" y="30" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">Temperature vs Panel Voltage</text>
        {/* Temperature axis labels */}
        <text x="50" y="200" textAnchor="middle" fill="#60a5fa" fontSize="12">-20C</text>
        <text x="200" y="200" textAnchor="middle" fill="#4ade80" fontSize="12">25C (STC)</text>
        <text x="350" y="200" textAnchor="middle" fill="#f87171" fontSize="12">60C</text>
        {/* Voltage curve showing inverse relationship */}
        <path d="M 50 60 L 80 70 L 110 82 L 140 95 L 170 108 L 200 120 L 230 132 L 260 142 L 290 150 L 320 157 L 350 163" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Axis lines */}
        <line x1="40" y1="45" x2="40" y2="180" stroke="#475569" strokeWidth="1" />
        <line x1="40" y1="180" x2="370" y2="180" stroke="#475569" strokeWidth="1" />
        {/* Grid lines */}
        <line x1="40" y1="90" x2="370" y2="90" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
        <line x1="40" y1="135" x2="370" y2="135" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
        {/* Y-axis label */}
        <text x="20" y="120" textAnchor="middle" fill="#e2e8f0" fontSize="11" transform="rotate(-90, 20, 120)">Voltage</text>
        {/* Question mark */}
        <text x="200" y="140" textAnchor="middle" fill="#fcd34d" fontSize="24" fontWeight="bold">?</text>
      </svg>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          A string designed for 25C (77F) might see temperatures from -20C (-4F) to +60C (140F).
          What happens to panel voltage when temperature drops significantly?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'decreases', label: 'Voltage decreases (panels less efficient in cold)', icon: '📉' },
          { id: 'same', label: 'Voltage stays the same (temperature has no effect)', icon: '➡️' },
          { id: 'increases', label: 'Voltage increases (cold = higher voltage!)', icon: '📈' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id
                ? '2px solid #f59e0b'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: twistPrediction === option.id
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showTwistFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{
          background: twistPrediction === 'increases' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'increases' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'increases' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'increases' ? (
              <><strong>Correct!</strong> Counter-intuitively, cold panels produce HIGHER voltage. About -0.3% per degree C. A string safe at 25C can exceed limits on a cold winter morning!</>
            ) : (
              <><strong>Surprise!</strong> Cold actually INCREASES voltage. Solar cells have a negative temperature coefficient of about -0.3%/C. This is why string sizing must account for minimum temperatures!</>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Temperature-Adjusted String Sizing
      </h2>
      <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px' }}>
        See how temperature changes affect your string voltage
      </p>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.5 }}>
          <strong>Observe:</strong> Slide the temperature from cold to hot and watch how the voltage changes. Notice how a string designed for 25C might exceed limits in cold weather!
        </p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        marginBottom: '16px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      {/* SVG visualization of temperature-adjusted voltage */}
      {(() => {
        // Calculate voltage range for dynamic y-axis scaling
        const vCold = panelCount * panelVoc * (1 + tempCoefficient * (-20 - stcTemp));
        const vHot = panelCount * panelVoc * (1 + tempCoefficient * (60 - stcTemp));
        const vPad = (vCold - vHot) * 0.3;
        const yAxisMin = Math.max(0, Math.floor((vHot - vPad) / 50) * 50);
        const yAxisMax = Math.ceil((vCold + vPad) / 50) * 50;
        const yAxisRange = yAxisMax - yAxisMin || 100;
        const mapV = (v: number) => 210 - ((v - yAxisMin) / yAxisRange) * 170;
        const temps = [-20, -10, 0, 10, 20, 25, 30, 40, 50, 60];
        const tempX = (t: number) => 50 + ((t + 20) / 80) * 330;
        return (
          <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="twistMarkerGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect width="400" height="250" fill="#0f172a" rx="8" />
            <text x="200" y="22" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">Temperature vs String Voltage</text>
            {/* Axes */}
            <line x1="50" y1="35" x2="50" y2="210" stroke="#475569" strokeWidth="1" />
            <line x1="50" y1="210" x2="380" y2="210" stroke="#475569" strokeWidth="1" />
            {/* Grid lines */}
            <line x1="50" y1="75" x2="380" y2="75" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <line x1="50" y1="122" x2="380" y2="122" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <line x1="50" y1="170" x2="380" y2="170" stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            {/* Inverter max line if in range */}
            {inverterMaxV >= yAxisMin && inverterMaxV <= yAxisMax && (
              <line x1="50" y1={mapV(inverterMaxV)} x2="380" y2={mapV(inverterMaxV)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" />
            )}
            {/* Voltage vs temperature curve with 10+ points */}
            <path d={temps.map((t, i) => {
              const v = panelCount * panelVoc * (1 + tempCoefficient * (t - stcTemp));
              return `${i === 0 ? 'M' : 'L'} ${tempX(t)} ${mapV(v)}`;
            }).join(' ')} stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Interactive marker at current temperature */}
            <circle cx={tempX(temperature)} cy={mapV(stringVoltage)} r={8} fill={getStatusColor()} filter="url(#twistMarkerGlow)" stroke="#ffffff" strokeWidth="2" />
            {/* X-axis labels */}
            <text x="50" y="228" textAnchor="middle" fill="#60a5fa" fontSize="11">-20C</text>
            <text x="215" y="228" textAnchor="middle" fill="#4ade80" fontSize="11">25C</text>
            <text x="380" y="228" textAnchor="end" fill="#f87171" fontSize="11">60C</text>
            {/* Y-axis labels */}
            <text x="46" y="44" textAnchor="end" fill="#94a3b8" fontSize="11">{yAxisMax}V</text>
            <text x="46" y="213" textAnchor="end" fill="#94a3b8" fontSize="11">{yAxisMin}V</text>
            {/* Current value label */}
            <text x="200" y="245" textAnchor="middle" fill={getStatusColor()} fontSize="12" fontWeight="bold">
              {stringVoltage.toFixed(0)}V at {temperature}C
            </text>
          </svg>
        );
      })()}
      </div>
      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
          STRING VOLTAGE @ {temperature}C
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getStatusColor() }}>
          {stringVoltage.toFixed(0)}V
        </div>
        <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px' }}>
          Base: {(panelCount * panelVoc).toFixed(0)}V | Adjusted: {((voltageAdjustment - 1) * 100).toFixed(1)}%
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${getStatusColor()}20`,
          borderRadius: '20px',
          fontSize: '12px',
          color: getStatusColor(),
          fontWeight: 600,
          marginTop: '8px',
        }}>
          {getStatusText()}
        </div>
      </div>

      {/* Temperature indicator */}
      <div style={{
        background: temperature < 25 ? 'rgba(59, 130, 246, 0.1)' : temperature > 25 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${temperature < 25 ? 'rgba(59, 130, 246, 0.3)' : temperature > 25 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <span style={{
          color: temperature < 25 ? '#60a5fa' : temperature > 25 ? '#f87171' : '#4ade80',
          fontSize: typo.body,
          fontWeight: 600
        }}>
          {temperature < 25 ? 'Higher Voltage (panels run cooler)' : temperature > 25 ? 'Lower Voltage (panels run hotter)' : 'Rated Voltage (at STC)'}
        </span>
      </div>

      {/* Temperature slider */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', marginBottom: '8px' }}>
          Temperature: {temperature}C ({(temperature * 9/5 + 32).toFixed(0)}F)
        </label>
        <input
          type="range"
          min="-20"
          max="60"
          value={temperature}
          onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#f59e0b' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span style={{ color: '#3b82f6' }}>-20C (Cold)</span>
          <span style={{ color: '#22c55e' }}>25C (STC)</span>
          <span style={{ color: '#ef4444' }}>60C (Hot)</span>
        </div>
      </div>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => setPanelCount(parseInt(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#eab308' }}
        />
      </div>
      </div>
      </div>

      <div style={{
        background: isOverVoltage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${isOverVoltage ? '#ef4444' : '#22c55e'}`,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <p style={{ color: isOverVoltage ? '#fca5a5' : '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          {isOverVoltage ? (
            <><strong>Warning!</strong> At this cold temperature, the string voltage exceeds the inverter maximum. Reduce panel count or this system will fail in winter!</>
          ) : (
            <><strong>Design tip:</strong> Always check your string at the coldest expected temperature. A design safe for -20C will work year-round.</>
          )}
        </p>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        Temperature Compensation in Practice
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Temperature Coefficient Formula</div>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>V_adjusted = V_stc x [1 + Tc x (T - 25)]</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginTop: '8px' }}>
          Tc = -0.003 (-0.3%/C) typical for silicon
        </div>
      </div>

      {[
        {
          icon: '❄️',
          title: 'Design for Coldest Day',
          desc: 'Always calculate maximum string voltage at the coldest expected temperature. This prevents winter damage.',
        },
        {
          icon: '🌡️',
          title: 'Check Hottest Day Too',
          desc: 'Verify string stays in MPPT range on hot days when voltage drops. Too few panels = lost production.',
        },
        {
          icon: '📐',
          title: 'Use Professional Tools',
          desc: 'String sizing software like PVsyst accounts for local climate data, specific panel specs, and installation factors.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[activeAppTab];

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '24px' }}>
          Explore all 4 applications to continue
        </p>

        {/* App selector tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveAppTab(index);
                handleCompleteApp(index);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeAppTab === index
                  ? a.color
                  : completedApps.has(index)
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(51, 65, 85, 0.5)',
                color: activeAppTab === index ? 'white' : completedApps.has(index) ? '#22c55e' : '#e2e8f0',
                fontSize: '24px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
              }}
            >
              {a.icon}
              {completedApps.has(index) && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '16px',
                  height: '16px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Active App Content */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          borderLeft: `4px solid ${app.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '40px' }}>{app.icon}</span>
            <div>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                {app.title}
              </h3>
              <p style={{ color: app.color, fontSize: '12px' }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
            {app.description}
          </p>

          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <p style={{ color: '#fcd34d', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>
              Connection to String Sizing:
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.5 }}>
              {app.connection}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ color: app.color, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                <div style={{ color: '#64748b', fontSize: '10px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#fcd34d', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>How It Works:</p>
            <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.5 }}>{app.howItWorks}</p>
          </div>

          {/* Companies */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Key Companies: {app.companies.join(', ')}</p>
            <p style={{ color: '#94a3b8', fontSize: '11px' }}>Examples: {app.examples.join(', ')}</p>
          </div>

          {/* Future impact */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '16px',
          }}>
            <p style={{ color: '#60a5fa', fontSize: '11px', lineHeight: 1.5 }}>
              <strong>Future:</strong> {app.futureImpact}
            </p>
          </div>

          {/* Got It / Next Application button */}
          <button
            onClick={() => {
              handleCompleteApp(activeAppTab);
              if (activeAppTab < realWorldApps.length - 1) {
                setActiveAppTab(activeAppTab + 1);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: completedApps.has(activeAppTab)
                ? 'rgba(34, 197, 94, 0.2)'
                : `linear-gradient(135deg, ${app.color} 0%, ${app.color}dd 100%)`,
              color: completedApps.has(activeAppTab) ? '#22c55e' : 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {completedApps.has(activeAppTab)
              ? (activeAppTab < realWorldApps.length - 1 ? 'Next Application' : 'Got It')
              : 'Got It'}
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Progress</span>
            <span style={{ color: '#eab308', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(completedApps.size / 4) * 100}%`,
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const allAnswered = testAnswers.every(a => a !== null);

    if (testSubmitted) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: testScore >= 7
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <span style={{ fontSize: '36px' }}>{testScore >= 7 ? '☀️' : '📚'}</span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
            Test Complete! {testScore}/10 Correct
          </h2>
          <p style={{ color: '#e2e8f0', marginBottom: '32px' }}>
            You scored {testScore} out of 10. {testScore >= 7 ? 'Excellent! You understand string sizing!' : 'Review the concepts and try again.'}
          </p>

          {/* Show explanations for incorrect answers */}
          <div style={{ textAlign: 'left', marginBottom: '24px', maxHeight: '500px', overflowY: 'auto' }}>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const correctOption = q.options.find(opt => opt.correct);
              const isCorrect = userAnswer === correctOption?.id;

              return (
                <div key={qIndex} style={{
                  background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                }}>
                  <p style={{ color: '#f8fafc', fontSize: '13px', marginBottom: '8px' }}>
                    <strong>Question {qIndex + 1}:</strong> {q.question}
                  </p>
                  <p style={{ color: isCorrect ? '#86efac' : '#fca5a5', fontSize: '12px' }}>
                    {isCorrect ? '✓ Correct' : `✗ Your answer: ${q.options.find(o => o.id === userAnswer)?.text || 'None'}`}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: '#e2e8f0', fontSize: '11px', marginTop: '4px' }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentQuestion(i)}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: testAnswers[i] !== null ? '#22c55e' : i === currentQuestion ? '#eab308' : '#475569',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '16px' }}>
          Question {currentQuestion + 1} of 10
        </div>

        {/* Scenario */}
        <div style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.5 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          {question.question}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {question.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleTestAnswer(currentQuestion, opt.id)}
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: testAnswers[currentQuestion] === opt.id
                  ? '2px solid #eab308'
                  : '2px solid rgba(100, 116, 139, 0.3)',
                background: testAnswers[currentQuestion] === opt.id
                  ? 'rgba(234, 179, 8, 0.2)'
                  : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: testAnswers[currentQuestion] === opt.id ? '#eab308' : '#475569',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ lineHeight: 1.4 }}>{opt.text}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Previous
            </button>
          )}
          {currentQuestion < 9 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={!testAnswers[currentQuestion]}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: testAnswers[currentQuestion]
                  ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
                  : '#475569',
                color: 'white',
                cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              disabled={!allAnswered}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: allAnswered
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : '#475569',
                color: 'white',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(234, 179, 8, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>☀️</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        String Sizing Master!
      </h1>
      <p style={{ color: '#e2e8f0', fontSize: '16px', marginBottom: '32px' }}>
        You now understand solar string sizing and temperature effects
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#eab308', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'Series-connected panels add voltages together',
          'Never exceed the inverter maximum input voltage',
          'MPPT range defines optimal operating voltage',
          'Cold temperatures increase voltage significantly',
          'Always design for the coldest expected conditions',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#eab308',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
            }}>✓</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            setPhase('hook');
            setPrediction(null);
            setTwistPrediction(null);
            setShowPredictionFeedback(false);
            setShowTwistFeedback(false);
            setHasExperimented(false);
            setHasExploredTwist(false);
            setCompletedApps(new Set());
            setTestAnswers(new Array(10).fill(null));
            setTestSubmitted(false);
            setTestScore(0);
            setCurrentQuestion(0);
          }}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#eab308',
            background: 'transparent',
            border: '2px solid #eab308',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
        <a
          href="/"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Return Home
        </a>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderHook()}</div>
            {renderBottomBar(false, true, 'Start Learning')}
          </>
        );
      case 'predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderPredict()}</div>
            {renderBottomBar(true, showPredictionFeedback, 'Continue')}
          </>
        );
      case 'play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderPlay()}</div>
            {renderBottomBar(true, hasExperimented, 'Continue')}
          </>
        );
      case 'review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderReview()}</div>
            {renderBottomBar(true, true, 'Next: The Twist')}
          </>
        );
      case 'twist_predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderTwistPredict()}</div>
            {renderBottomBar(true, showTwistFeedback, 'Continue')}
          </>
        );
      case 'twist_play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderTwistPlay()}</div>
            {renderBottomBar(true, hasExploredTwist, 'Continue')}
          </>
        );
      case 'twist_review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderTwistReview()}</div>
            {renderBottomBar(true, true, 'Applications')}
          </>
        );

      case 'transfer': return (
          <TransferPhaseView
          conceptName="String Sizing"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderTest()}</div>
            {testSubmitted && renderBottomBar(true, true, 'Complete')}
          </>
        );
      case 'mastery':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>{renderMastery()}</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: 'white',
        paddingTop: '60px',
      }}
    >
      {renderProgressBar()}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overflowY: 'auto',
        paddingBottom: '16px',
        paddingTop: '60px',
        maxWidth: '600px',
        width: '100%',
        margin: '0 auto',
      }}>
        {renderPhaseContent()}
      </div>
      {renderNavDots()}
    </div>
  );
}
