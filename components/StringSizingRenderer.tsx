'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  twist_play: 'Temperature Effects',
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
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

interface StringSizingRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA - Scenario-based multiple choice questions
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  // Question 1: Core concept - string tension and pitch (Easy)
  {
    scenario: "A guitarist is tuning their instrument and notices that as they tighten the tuning peg, the pitch of the string rises. They wonder about the physics behind this everyday observation.",
    question: "What physical property of the string changes when you tighten it that causes the pitch to increase?",
    options: [
      { id: 'a', label: "The string becomes shorter, reducing the wavelength" },
      { id: 'b', label: "The tension in the string increases, making it vibrate faster", correct: true },
      { id: 'c', label: "The string becomes thinner due to stretching" },
      { id: 'd', label: "The string's material composition changes under stress" }
    ],
    explanation: "When you tighten a string, you increase its tension. Higher tension means the string has more restoring force when displaced, causing it to vibrate at a higher frequency. The relationship follows the equation f = (1/2L)√(T/μ), where frequency is proportional to the square root of tension. This is why all stringed instruments use tuning pegs or similar mechanisms to adjust pitch."
  },
  // Question 2: String gauge and tone (Easy-Medium)
  {
    scenario: "A guitar player is comparing two sets of strings: a light gauge set (.009-.042) and a heavy gauge set (.012-.054). They play the same chord on both setups and notice the heavier strings sound fuller and warmer.",
    question: "Why do heavier gauge strings typically produce a warmer, fuller tone than lighter strings at the same pitch?",
    options: [
      { id: 'a', label: "Heavier strings are made from higher quality materials" },
      { id: 'b', label: "Heavier strings move more air and produce stronger lower harmonics due to greater mass", correct: true },
      { id: 'c', label: "The coating on heavier strings absorbs high frequencies" },
      { id: 'd', label: "Heavier strings are under less tension, making them vibrate slower" }
    ],
    explanation: "Heavier strings have more mass per unit length (linear density). To achieve the same pitch as lighter strings, they require more tension. This combination of greater mass and tension allows them to displace more air during vibration and sustain stronger fundamental and lower harmonic frequencies. The increased energy in the string produces a richer, fuller sound with more bass response."
  },
  // Question 3: Scale length effects (Medium)
  {
    scenario: "A musician is comparing a Fender Stratocaster (25.5\" scale length) with a Gibson Les Paul (24.75\" scale length). Both guitars have the same gauge strings, but they feel noticeably different to play.",
    question: "If both guitars use identical string gauges tuned to the same pitch, how does the shorter scale length of the Gibson affect string tension?",
    options: [
      { id: 'a', label: "The Gibson has higher tension because the strings are compressed into a shorter length" },
      { id: 'b', label: "The Gibson has lower tension because shorter strings need less force to reach the same pitch", correct: true },
      { id: 'c', label: "Both have identical tension since they're tuned to the same pitch" },
      { id: 'd', label: "Scale length only affects tone, not tension" }
    ],
    explanation: "For the same string gauge and pitch, a shorter scale length requires less tension. The frequency equation f = (1/2L)√(T/μ) shows that shorter length (L) allows the same frequency with less tension (T). This is why shorter-scale guitars feel 'slinkier' and are easier to bend strings on. Players who want the feel of a longer scale guitar on a shorter instrument often compensate by using heavier gauge strings."
  },
  // Question 4: Material properties (Medium)
  {
    scenario: "A classical guitarist switches from traditional nylon strings to carbon fiber (fluorocarbon) treble strings. They immediately notice the new strings feel stiffer and the tone is brighter and more projecting.",
    question: "What material property primarily explains why carbon fiber strings produce brighter tone than nylon strings of similar gauge?",
    options: [
      { id: 'a', label: "Carbon fiber is more flexible, allowing faster vibrations" },
      { id: 'b', label: "Carbon fiber has higher density, requiring more tension for the same pitch, which enhances overtones", correct: true },
      { id: 'c', label: "Carbon fiber reflects sound waves better than nylon" },
      { id: 'd', label: "Carbon fiber strings are always thinner than nylon strings" }
    ],
    explanation: "Carbon fiber (fluorocarbon) has approximately 1.8 times the density of nylon. For the same gauge and pitch, this higher density requires significantly more tension. Higher tension strings have less internal damping and support higher frequency harmonics more efficiently, resulting in a brighter, more brilliant tone with greater projection. This is why fluorocarbon strings are popular for players seeking more clarity and volume."
  },
  // Question 5: Intonation adjustment (Medium-Hard)
  {
    scenario: "A guitar technician is setting up a new instrument. After tuning the open strings perfectly, they notice that fretted notes, especially higher up the neck, are slightly sharp. They need to adjust the saddle position at the bridge.",
    question: "In which direction should the saddle be moved to correct fretted notes that play sharp?",
    options: [
      { id: 'a', label: "Move the saddle toward the nut (shorter scale) to lower the pitch" },
      { id: 'b', label: "Move the saddle away from the nut (longer scale) to lower the pitch", correct: true },
      { id: 'c', label: "Raise the saddle height to reduce string tension" },
      { id: 'd', label: "Lower the saddle height to increase string tension" }
    ],
    explanation: "When fretted notes are sharp, the vibrating string length is too short relative to the theoretical fret placement. Moving the saddle away from the nut increases the overall scale length, which lengthens each fretted note's vibrating portion. This compensation accounts for the slight stretching that occurs when pressing a string to a fret and the inherent stiffness of real strings. Proper intonation ensures the 12th fret harmonic and 12th fret pressed note match exactly."
  },
  // Question 6: Drop tuning string selection (Hard)
  {
    scenario: "A metal guitarist wants to tune their guitar to Drop C (C-G-C-F-A-D, where the lowest string is a full two steps below standard E). Using their regular .010-.046 string set, the low C string feels extremely loose and lacks definition.",
    question: "What string gauge range would best address the tension and tone issues for Drop C tuning?",
    options: [
      { id: 'a', label: ".009-.042 (lighter gauge) to reduce overall tension" },
      { id: 'b', label: ".010-.046 (standard gauge) with a wound G string" },
      { id: 'c', label: ".012-.054 or heavier with emphasis on a thick low string (.054-.060)", correct: true },
      { id: 'd', label: "The same gauge as standard tuning since pitch doesn't affect playability" }
    ],
    explanation: "Dropping a string's pitch by two whole steps dramatically reduces its tension (roughly 40% less). To maintain playable tension and clear note definition, significantly heavier gauges are needed. For Drop C, most players use at least a .054 low string, with some preferring .056-.060. The heavier string maintains adequate tension, reduces 'floppiness,' provides better low-end definition, and prevents fret buzz from excessive string excursion during vibration."
  },
  // Question 7: String vibration physics (Hard)
  {
    scenario: "A physics student observes a bass guitar string vibrating and notices that besides the main vibration along the entire length, there are visible patterns where parts of the string remain nearly stationary while other parts vibrate maximally.",
    question: "What determines the positions of these stationary points (nodes) on a vibrating string?",
    options: [
      { id: 'a', label: "Random variations in string thickness create unpredictable node positions" },
      { id: 'b', label: "Nodes occur at fractional divisions of the string length corresponding to harmonic overtones", correct: true },
      { id: 'c', label: "Nodes form wherever the string touches the frets during vibration" },
      { id: 'd', label: "Air pressure differences along the string create node positions" }
    ],
    explanation: "A vibrating string produces standing waves with nodes (stationary points) and antinodes (maximum displacement). The fundamental frequency has nodes only at the fixed ends. Harmonics create additional nodes at precise fractional positions: the 2nd harmonic has a node at 1/2 the length, the 3rd harmonic at 1/3 and 2/3, and so on. This is why touching a string lightly at these points produces clear harmonics - you damp the fundamental while allowing overtones with nodes at that position to continue."
  },
  // Question 8: Frequency and mass relationship (Hard)
  {
    scenario: "A luthier is designing a custom 8-string guitar and needs to calculate the appropriate string gauge for a low F# (23.1 Hz). They know that their .074 gauge string works well for a low B (30.9 Hz) on a 7-string guitar with the same scale length.",
    question: "Approximately what string gauge would be needed for the low F# if the relationship between frequency and linear density follows f ∝ 1/√μ?",
    options: [
      { id: 'a', label: "About .080 - slightly heavier than the B string" },
      { id: 'b', label: "About .090 - moderately heavier" },
      { id: 'c', label: "About .105 - significantly heavier due to the squared relationship", correct: true },
      { id: 'd', label: "About .130 - more than double the B string gauge" }
    ],
    explanation: "Since frequency is inversely proportional to the square root of linear density, and linear density is proportional to the square of diameter, we need μ₂/μ₁ = (f₁/f₂)². The frequency ratio is 30.9/23.1 ≈ 1.34. Squaring this gives 1.79, meaning we need about 1.79× the linear density. Since diameter relates to linear density by d₂/d₁ = √(μ₂/μ₁), we get d₂ = .074 × √1.79 ≈ .099-.105 gauge. This demonstrates why extended range instruments require exponentially thicker strings for each added lower note."
  },
  // Question 9: Multi-scale instruments (Hard)
  {
    scenario: "A progressive metal guitarist is considering a multi-scale (fanned fret) guitar with a 25.5\" scale on the treble side and 27\" scale on the bass side. Traditional straight-fret guitars use a single scale length for all strings.",
    question: "What is the primary acoustic advantage of using a longer scale length specifically for the bass strings?",
    options: [
      { id: 'a', label: "Longer scale makes bass strings easier to press down against the frets" },
      { id: 'b', label: "Longer scale allows higher tension on bass strings for improved clarity and tighter low-end response", correct: true },
      { id: 'c', label: "Longer scale reduces the number of frets needed for the same note range" },
      { id: 'd', label: "Longer scale increases the sustain of treble strings by sympathetic resonance" }
    ],
    explanation: "Bass strings benefit from longer scale lengths because achieving proper tension on low-pitched strings requires either heavier gauges or longer lengths. The longer bass-side scale allows optimal tension without excessively heavy strings, resulting in tighter, more articulate low-end with better note definition. Meanwhile, the shorter treble scale keeps high strings comfortable for bending. This is why pianos and harps use progressively longer strings for lower notes - it's a fundamental acoustic principle that multi-scale instruments apply to guitars."
  },
  // Question 10: String break angle and sustain (Hard)
  {
    scenario: "A guitar builder is designing a headstock and notices that guitars with angled-back headstocks (like Gibson) don't need string trees, while flat headstocks (like Fender) often require string trees or staggered tuners to keep strings properly seated in the nut slots.",
    question: "How does increasing the string break angle over the nut affect the instrument's tone and sustain?",
    options: [
      { id: 'a', label: "Greater break angle reduces friction, allowing strings to vibrate more freely" },
      { id: 'b', label: "Greater break angle increases downward pressure on the nut, improving energy transfer and sustain", correct: true },
      { id: 'c', label: "Greater break angle shortens the vibrating length, raising the pitch" },
      { id: 'd', label: "Break angle has no effect on tone - it's purely a mechanical consideration for string retention" }
    ],
    explanation: "The break angle is the angle at which the string bends over the nut toward the tuning post. A steeper angle increases the downward force pressing the string into the nut slot, creating more solid contact. This improved coupling between string and nut transfers vibration energy more efficiently to the neck and body, enhancing sustain and resonance. However, too steep an angle increases friction and can cause tuning stability issues. The ideal balance provides good energy transfer while maintaining smooth string movement during tuning and bending."
  }
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Residential Rooftop Systems',
    description: 'Home systems typically use 8-12 panels per string, carefully sized for the inverter MPPT range and local temperature extremes.',
    icon: '🏠',
  },
  {
    title: 'Utility-Scale Solar Farms',
    description: 'Large installations use central inverters with multiple string combiner boxes. String length is optimized for cable costs and voltage drop.',
    icon: '☀️',
  },
  {
    title: 'Cold Climate Installations',
    description: 'In northern regions, winter cold can push string voltage 15-20% higher. Fewer panels per string prevent inverter damage.',
    icon: '❄️',
  },
  {
    title: 'Desert Installations',
    description: 'Hot climates reduce voltage but increase current. More panels can be strung together, but thermal management is critical.',
    icon: '🏜️',
  },
];

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

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [panelCount, setPanelCount] = useState(8);
  const [panelVoc, setPanelVoc] = useState(40); // Volts per panel
  const [inverterMaxV, setInverterMaxV] = useState(450);
  const [inverterMpptMin, setInverterMpptMin] = useState(150);
  const [inverterMpptMax, setInverterMpptMax] = useState(400);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - temperature effects
  const [temperature, setTemperature] = useState(25); // Celsius
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
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

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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
            width: '36px',
            height: '36px',
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
          ← Back
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
          {nextLabel} →
        </button>
      </div>
    );
  };

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


  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
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
  }, []);

  const handleTestAnswer = useCallback((qIndex: number, aIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[qIndex] = aIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
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
      }}>
        <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 600 }}>SOLAR ENGINEERING</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Why Can't You Just Connect Any Number of Solar Panels Together?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        Too few panels and you lose power. Too many and you destroy your inverter. The sweet spot depends on physics!
      </p>

      <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
        <defs>
          {/* Premium solar panel gradient - deep blue with cell texture effect */}
          <linearGradient id="strPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Solar cell shimmer gradient */}
          <linearGradient id="strCellShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>

          {/* Panel frame metal gradient */}
          <linearGradient id="strFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Wire/connection gradient - golden energy flow */}
          <linearGradient id="strWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="30%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Background gradient */}
          <linearGradient id="strBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Glow filter for panels */}
          <filter id="strPanelGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for connections */}
          <filter id="strWireGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Voltage indicator glow */}
          <radialGradient id="strVoltGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#16a34a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="200" fill="url(#strBgGrad)" rx="12" />

        {/* Subtle grid pattern */}
        <pattern id="strGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="400" height="200" fill="url(#strGrid)" rx="12" />

        {/* Solar panels in series with premium rendering */}
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} transform={`translate(${50 + i * 60}, 55)`}>
            {/* Panel shadow */}
            <rect x="2" y="2" width="50" height="70" fill="#000" fillOpacity="0.3" rx="4" />
            {/* Panel frame */}
            <rect width="50" height="70" fill="url(#strFrameGrad)" rx="4" />
            {/* Panel cells area */}
            <rect x="3" y="3" width="44" height="64" fill="url(#strPanelGrad)" rx="2" filter="url(#strPanelGlow)" />
            {/* Cell grid lines */}
            <line x1="10" y1="12" x2="40" y2="12" stroke="url(#strCellShimmer)" strokeWidth="1" />
            <line x1="10" y1="24" x2="40" y2="24" stroke="url(#strCellShimmer)" strokeWidth="1" />
            <line x1="10" y1="36" x2="40" y2="36" stroke="url(#strCellShimmer)" strokeWidth="1" />
            <line x1="10" y1="48" x2="40" y2="48" stroke="url(#strCellShimmer)" strokeWidth="1" />
            {/* Vertical cell divisions */}
            <line x1="25" y1="6" x2="25" y2="54" stroke="url(#strCellShimmer)" strokeWidth="0.5" />
            {/* Connection terminals */}
            <rect x="20" y="-4" width="10" height="6" fill="#475569" rx="1" />
            <rect x="20" y="68" width="10" height="6" fill="#475569" rx="1" />
          </g>
        ))}

        {/* Connection wires between panels with glow */}
        {[0, 1, 2, 3].map(i => (
          <g key={`conn-${i}`}>
            <line
              x1={100 + i * 60} y1="90"
              x2={110 + i * 60} y2="90"
              stroke="url(#strWireGrad)"
              strokeWidth="3"
              filter="url(#strWireGlow)"
              strokeLinecap="round"
            />
            {/* Plus sign with energy effect */}
            <circle cx={105 + i * 60} cy="90" r="8" fill="#1e293b" stroke="url(#strWireGrad)" strokeWidth="1" />
            <text
              x={105 + i * 60} y="94"
              textAnchor="middle"
              fill="url(#strWireGrad)"
              fontSize="14"
              fontWeight="bold"
            >+</text>
          </g>
        ))}

        {/* Voltage result indicator */}
        <g transform="translate(340, 75)">
          <ellipse cx="20" cy="15" rx="25" ry="20" fill="url(#strVoltGlow)" />
          <rect x="0" y="0" width="40" height="30" fill="#0f172a" stroke="#22c55e" strokeWidth="2" rx="6" />
        </g>

        {/* Equals sign */}
        <g transform="translate(310, 82)">
          <line x1="0" y1="0" x2="15" y2="0" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="8" x2="15" y2="8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>

      {/* Voltage result label - moved outside SVG */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <span style={{ color: '#94a3b8', fontSize: typo.body }}>5 panels x 40V =</span>
        <span style={{
          color: '#22c55e',
          fontSize: typo.heading,
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
        }}>200V</span>
      </div>

      {/* Question label - moved outside SVG */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: typo.body, margin: 0 }}>
          But the inverter max is 450V... Can we add more?
        </p>
      </div>

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

      <button
        onClick={goNext}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Learn String Sizing
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

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
              WebkitTapHighlightColor: 'transparent',
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

      {showPredictionFeedback && (
        <button
          onClick={goNext}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Try the String Sizer
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        String Sizing Calculator
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Adjust panel count to find the optimal string size
      </p>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>STRING VOLTAGE</div>
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

      {/* Visual representation - Premium SVG with inverter */}
      <svg viewBox="0 0 400 180" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
        <defs>
          {/* Background gradient */}
          <linearGradient id="strPlayBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* MPPT range gradient - green zone */}
          <linearGradient id="strMpptGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0.4" />
          </linearGradient>

          {/* Danger zone gradient - red zone */}
          <linearGradient id="strDangerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.6" />
          </linearGradient>

          {/* Voltage bar track gradient */}
          <linearGradient id="strTrackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Inverter body gradient */}
          <linearGradient id="strInverterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Inverter display gradient */}
          <linearGradient id="strDisplayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Marker glow filter */}
          <filter id="strMarkerGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Status LED glow */}
          <radialGradient id="strLedGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={getStatusColor()} stopOpacity="1" />
            <stop offset="50%" stopColor={getStatusColor()} stopOpacity="0.6" />
            <stop offset="100%" stopColor={getStatusColor()} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="180" fill="url(#strPlayBg)" rx="12" />

        {/* Grid pattern */}
        <pattern id="strPlayGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" />
        </pattern>
        <rect width="400" height="180" fill="url(#strPlayGrid)" rx="12" />

        {/* Mini solar string visualization at top */}
        <g transform="translate(20, 15)">
          {Array.from({ length: Math.min(panelCount, 12) }).map((_, i) => (
            <g key={`mini-panel-${i}`} transform={`translate(${i * 28}, 0)`}>
              <rect width="24" height="30" fill="url(#strPanelGrad)" rx="2" stroke="#3b82f6" strokeWidth="0.5" />
              <line x1="4" y1="8" x2="20" y2="8" stroke="#60a5fa" strokeWidth="0.5" opacity="0.5" />
              <line x1="4" y1="16" x2="20" y2="16" stroke="#60a5fa" strokeWidth="0.5" opacity="0.5" />
              <line x1="4" y1="24" x2="20" y2="24" stroke="#60a5fa" strokeWidth="0.5" opacity="0.5" />
              {/* Connection wire to next panel */}
              {i < Math.min(panelCount, 12) - 1 && (
                <line x1="24" y1="15" x2="28" y2="15" stroke="#eab308" strokeWidth="1.5" />
              )}
            </g>
          ))}
          {/* Wire to inverter */}
          <line x1={Math.min(panelCount, 12) * 28 - 4} y1="15" x2={Math.min(panelCount, 12) * 28 + 10} y2="15" stroke="#eab308" strokeWidth="2" />
        </g>

        {/* Inverter visualization */}
        <g transform="translate(345, 8)">
          {/* Inverter body */}
          <rect width="45" height="44" fill="url(#strInverterGrad)" rx="4" stroke="#64748b" strokeWidth="1" />
          {/* Display screen */}
          <rect x="5" y="5" width="35" height="20" fill="url(#strDisplayGrad)" rx="2" />
          {/* Status LED */}
          <circle cx="22" cy="35" r="4" fill="url(#strLedGlow)" />
          <circle cx="22" cy="35" r="2" fill={getStatusColor()} />
          {/* Vent lines */}
          <line x1="8" y1="28" x2="15" y2="28" stroke="#334155" strokeWidth="1" />
          <line x1="8" y1="31" x2="15" y2="31" stroke="#334155" strokeWidth="1" />
          <line x1="30" y1="28" x2="37" y2="28" stroke="#334155" strokeWidth="1" />
          <line x1="30" y1="31" x2="37" y2="31" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Voltage bar scale */}
        <rect x="20" y="65" width="360" height="35" fill="url(#strTrackGrad)" rx="6" stroke="#475569" strokeWidth="1" />

        {/* MPPT range */}
        <rect
          x={20 + (inverterMpptMin / 500) * 360}
          y="67"
          width={((inverterMpptMax - inverterMpptMin) / 500) * 360}
          height="31"
          fill="url(#strMpptGrad)"
        />

        {/* Danger zone */}
        <rect
          x={20 + (inverterMaxV / 500) * 360}
          y="67"
          width={360 - (inverterMaxV / 500) * 360}
          height="31"
          fill="url(#strDangerGrad)"
        />

        {/* Current voltage marker with glow */}
        <g filter="url(#strMarkerGlow)">
          <line
            x1={20 + Math.min((stringVoltage / 500) * 360, 360)}
            y1="60"
            x2={20 + Math.min((stringVoltage / 500) * 360, 360)}
            y2="105"
            stroke={getStatusColor()}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Marker arrow */}
          <polygon
            points={`${20 + Math.min((stringVoltage / 500) * 360, 360)},55 ${16 + Math.min((stringVoltage / 500) * 360, 360)},62 ${24 + Math.min((stringVoltage / 500) * 360, 360)},62`}
            fill={getStatusColor()}
          />
        </g>

        {/* Tick marks */}
        {[0, 100, 200, 300, 400, 500].map(v => (
          <line
            key={v}
            x1={20 + (v / 500) * 360}
            y1="100"
            x2={20 + (v / 500) * 360}
            y2="105"
            stroke="#64748b"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Legend - moved outside SVG */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.4)', borderRadius: '2px' }} />
          <span style={{ color: '#94a3b8', fontSize: typo.small }}>MPPT Range ({inverterMpptMin}V-{inverterMpptMax}V)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: 'rgba(239, 68, 68, 0.4)', borderRadius: '2px' }} />
          <span style={{ color: '#94a3b8', fontSize: typo.small }}>Danger Zone ({'>'}450V)</span>
        </div>
      </div>

      {/* Voltage scale labels - moved outside SVG */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        maxWidth: '500px',
        margin: '0 auto 24px',
        padding: '0 20px',
      }}>
        <span style={{ color: '#64748b', fontSize: typo.label }}>0V</span>
        <span style={{ color: '#22c55e', fontSize: typo.label }}>{inverterMpptMin}V</span>
        <span style={{ color: '#22c55e', fontSize: typo.label }}>{inverterMpptMax}V</span>
        <span style={{ color: '#ef4444', fontSize: typo.label }}>{inverterMaxV}V MAX</span>
      </div>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => handlePanelCountChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#eab308' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>4 panels</span>
          <span>15 panels</span>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Panel Voc</div>
          <div style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>{panelVoc}V</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Panels x Voltage</div>
          <div style={{ fontSize: '18px', color: '#eab308', fontWeight: 'bold' }}>{panelCount} x {panelVoc}V</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Goal:</strong> Keep the string voltage within the green MPPT range.
          Too low = lost efficiency. Too high = potential damage!
        </p>
      </div>

      <button
        onClick={goNext}
        disabled={!hasExperimented}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: hasExperimented
            ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExperimented ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExperimented ? 'Continue to Review' : `Try ${Math.max(0, 3 - experimentCount)} more settings`}
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
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

      {[
        {
          icon: '⚡',
          title: 'Maximum Voltage Limit',
          desc: 'Never exceed the inverter\'s max input voltage. This is a hard safety limit - exceeding it causes immediate damage.',
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
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goNext}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Now for a Twist...
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
        The Temperature Factor
      </h2>

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
              WebkitTapHighlightColor: 'transparent',
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

      {showTwistFeedback && (
        <button
          onClick={goNext}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See Temperature Effects
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Temperature-Adjusted String Sizing
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        See how temperature changes affect your string voltage
      </p>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
          STRING VOLTAGE @ {temperature}C
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getStatusColor() }}>
          {stringVoltage.toFixed(0)}V
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
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

      {/* Temperature visualization - Premium SVG */}
      <svg viewBox="0 0 400 100" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '8px' }}>
        <defs>
          {/* Background gradient */}
          <linearGradient id="strTempBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Cold zone gradient - blue */}
          <linearGradient id="strColdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
          </linearGradient>

          {/* Neutral zone gradient */}
          <linearGradient id="strNeutralGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
          </linearGradient>

          {/* Hot zone gradient - red */}
          <linearGradient id="strHotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.6" />
          </linearGradient>

          {/* Temperature track gradient */}
          <linearGradient id="strTempTrack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Marker glow */}
          <radialGradient id="strTempMarkerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#eab308" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>

          {/* Marker glow filter */}
          <filter id="strTempGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Thermometer gradient */}
          <linearGradient id="strThermGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="100" fill="url(#strTempBg)" rx="12" />

        {/* Thermometer icon */}
        <g transform="translate(15, 20)">
          <rect x="4" y="0" width="8" height="50" fill="url(#strTempTrack)" rx="4" />
          <rect x="5" y={50 - ((temperature + 20) / 80) * 45} width="6" height={((temperature + 20) / 80) * 45} fill="url(#strThermGrad)" rx="3" />
          <circle cx="8" cy="55" r="10" fill={temperature < 25 ? '#3b82f6' : temperature > 35 ? '#ef4444' : '#22c55e'} />
        </g>

        {/* Temperature scale bar */}
        <rect x="50" y="35" width="320" height="24" fill="url(#strTempTrack)" rx="12" stroke="#475569" strokeWidth="1" />

        {/* Cold zone */}
        <rect x="52" y="37" width="100" height="20" fill="url(#strColdGrad)" rx="10" />

        {/* Neutral zone (STC area) */}
        <rect x="152" y="37" width="80" height="20" fill="url(#strNeutralGrad)" />

        {/* Hot zone */}
        <rect x="268" y="37" width="100" height="20" fill="url(#strHotGrad)" rx="0" />

        {/* STC indicator line */}
        <line x1={50 + ((45) / 80) * 320} y1="32" x2={50 + ((45) / 80) * 320} y2="62" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,2" />

        {/* Temperature marker with glow */}
        <g filter="url(#strTempGlow)">
          <circle cx={50 + ((temperature + 20) / 80) * 320} cy="47" r="12" fill="url(#strTempMarkerGlow)" />
          <circle cx={50 + ((temperature + 20) / 80) * 320} cy="47" r="8" fill="#eab308" stroke="#fef3c7" strokeWidth="2" />
        </g>

        {/* Snowflake icon for cold */}
        <text x="35" y="80" fill="#3b82f6" fontSize="12">*</text>

        {/* Sun icon for hot */}
        <text x="375" y="80" fill="#ef4444" fontSize="12">*</text>
      </svg>

      {/* Temperature labels - moved outside SVG */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        maxWidth: '500px',
        margin: '0 auto 8px',
        padding: '0 50px 0 50px',
      }}>
        <span style={{ color: '#3b82f6', fontSize: typo.small, fontWeight: 600 }}>-20C (Cold)</span>
        <span style={{ color: '#22c55e', fontSize: typo.small, fontWeight: 600 }}>25C (STC)</span>
        <span style={{ color: '#ef4444', fontSize: typo.small, fontWeight: 600 }}>60C (Hot)</span>
      </div>

      {/* Voltage effect indicator - moved outside SVG */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px',
        padding: '8px 16px',
        background: temperature < 25 ? 'rgba(59, 130, 246, 0.1)' : temperature > 25 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${temperature < 25 ? 'rgba(59, 130, 246, 0.3)' : temperature > 25 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        borderRadius: '8px',
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
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Temperature: {temperature}C ({(temperature * 9/5 + 32).toFixed(0)}F)
        </label>
        <input
          type="range"
          min="-20"
          max="60"
          value={temperature}
          onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }}
        />
      </div>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => setPanelCount(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#eab308' }}
        />
      </div>

      <div style={{
        background: isOverVoltage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${isOverVoltage ? '#ef4444' : '#22c55e'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: isOverVoltage ? '#fca5a5' : '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          {isOverVoltage ? (
            <><strong>Warning!</strong> At this cold temperature, the string voltage exceeds the inverter maximum. Reduce panel count or this system will fail in winter!</>
          ) : (
            <><strong>Design tip:</strong> Always check your string at the coldest expected temperature. A design safe for -20C will work year-round.</>
          )}
        </p>
      </div>

      <button
        onClick={goNext}
        disabled={!hasExploredTwist}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: hasExploredTwist
            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExploredTwist ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExploredTwist ? 'Continue' : 'Adjust the temperature slider'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
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
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>V_adjusted = V_stc x [1 + Tc x (T - 25)]</div>
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
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goNext}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Real-World Applications
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Complete all 4 to unlock the assessment
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeAppTab === index
                ? '#eab308'
                : completedApps.has(index)
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(51, 65, 85, 0.5)',
              color: activeAppTab === index ? 'white' : completedApps.has(index) ? '#22c55e' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {completedApps.has(index) && '✓'} App {index + 1}
          </button>
        ))}
      </div>

      {/* Active App Content */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}>
          {TRANSFER_APPS[activeAppTab].icon}
        </div>
        <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
          {TRANSFER_APPS[activeAppTab].title}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, textAlign: 'center', marginBottom: '20px' }}>
          {TRANSFER_APPS[activeAppTab].description}
        </p>

        {!completedApps.has(activeAppTab) ? (
          <button
            onClick={() => handleCompleteApp(activeAppTab)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Mark as Complete
          </button>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '8px',
            color: '#22c55e',
            fontWeight: 'bold',
          }}>
            Completed
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
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

      <button
        onClick={goNext}
        disabled={completedApps.size < 4}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: completedApps.size >= 4
            ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: completedApps.size >= 4 ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {completedApps.size >= 4 ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`}
      </button>
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;

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
            {testScore}/10 Correct
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            {testScore >= 7 ? 'Excellent! You understand string sizing!' : 'Review the concepts and try again.'}
          </p>

          {/* Answer Review */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                }}>
                  <p style={{ color: '#f8fafc', fontSize: '13px', marginBottom: '8px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#64748b',
                      fontSize: '12px',
                      padding: '2px 0',
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onClick={goNext}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {testScore >= 7 ? 'Complete Lesson' : 'Continue Anyway'}
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          10 questions - 70% to pass
        </p>

        {/* Progress */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
            <span style={{ color: '#eab308', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Questions */}
        <div style={{ marginBottom: '24px' }}>
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: testAnswers[qIndex] !== null ? '#eab308' : '#475569',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {qIndex + 1}
                </span>
                <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: 1.5 }}>{q.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '36px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: testAnswers[qIndex] === oIndex ? '#eab308' : 'rgba(51, 65, 85, 0.5)',
                      color: testAnswers[qIndex] === oIndex ? 'white' : '#cbd5e1',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmitTest}
          disabled={answeredCount < 10}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: answeredCount >= 10
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : '#475569',
            border: 'none',
            borderRadius: '12px',
            cursor: answeredCount >= 10 ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {answeredCount >= 10 ? 'Submit Assessment' : `Answer ${10 - answeredCount} more questions`}
        </button>
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
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
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

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#eab308',
          background: 'transparent',
          border: '2px solid #eab308',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Review Again
      </button>
    </div>
  );

  // Main render - wrap each phase with progress bar and bottom bar
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderHook()}</div>
            {renderBottomBar(false, true, 'Start Learning')}
          </>
        );
      case 'predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderPredict()}</div>
            {renderBottomBar(true, showPredictionFeedback, 'Continue')}
          </>
        );
      case 'play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderPlay()}</div>
            {renderBottomBar(true, hasExperimented, 'Continue')}
          </>
        );
      case 'review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderReview()}</div>
            {renderBottomBar(true, true, 'Next: The Twist')}
          </>
        );
      case 'twist_predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistPredict()}</div>
            {renderBottomBar(true, showTwistFeedback, 'Continue')}
          </>
        );
      case 'twist_play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistPlay()}</div>
            {renderBottomBar(true, hasExploredTwist, 'Continue')}
          </>
        );
      case 'twist_review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistReview()}</div>
            {renderBottomBar(true, true, 'Applications')}
          </>
        );
      case 'transfer':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTransfer()}</div>
            {renderBottomBar(true, completedApps.size >= 4, 'Take Test')}
          </>
        );
      case 'test':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTest()}</div>
            {!testSubmitted && renderBottomBar(true, false, 'Submit Test')}
          </>
        );
      case 'mastery':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderMastery()}</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: 'white',
      }}
    >
      {/* Progress Bar Header */}
      {renderProgressBar()}

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxWidth: '600px',
        width: '100%',
        margin: '0 auto',
      }}>
        {renderPhaseContent()}
      </div>
    </div>
  );
}
