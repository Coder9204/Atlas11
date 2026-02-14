'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// String-based phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface BoilingPressureRendererProps {
  onBack?: () => void;
  onPhaseComplete?: (phase: Phase) => void;
  gamePhase?: string;
  phase?: string;
}

const TEST_QUESTIONS = [
  {
    id: 1,
    question: 'Scenario: A mountaineer on Mount Everest tries to make tea, but the water boils before it gets hot enough. Why does water boil at a lower temperature on Mount Everest?',
    options: [
      { id: 'a', text: 'The air is colder', correct: false },
      { id: 'b', text: 'There is less atmospheric pressure', correct: true },
      { id: 'c', text: 'There is less oxygen', correct: false },
      { id: 'd', text: 'The water is different at high altitude', correct: false }
    ],
    explanation: 'At high altitude, atmospheric pressure is lower. This means water molecules need less energy to escape into vapor, so boiling occurs at a lower temperature (71C at Everest vs 100C at sea level).'
  },
  {
    id: 2,
    question: 'Scenario: A chef uses a pressure cooker to prepare beans in 20 minutes instead of 2 hours. What does a pressure cooker do to cooking temperature?',
    options: [
      { id: 'a', text: 'Lowers it by removing air', correct: false },
      { id: 'b', text: 'Keeps it exactly at 100C', correct: false },
      { id: 'c', text: 'Raises it by increasing pressure', correct: true },
      { id: 'd', text: 'Has no effect on temperature', correct: false }
    ],
    explanation: 'Pressure cookers trap steam to increase pressure to about 2 atm. This raises the boiling point to 120C, allowing food to cook at higher temperatures and therefore faster.'
  },
  {
    id: 3,
    question: 'Scenario: In a vacuum chamber laboratory experiment, scientists observe water boiling at room temperature. At what pressure can water boil at room temperature (25C)?',
    options: [
      { id: 'a', text: '1 atmosphere', correct: false },
      { id: 'b', text: '2 atmospheres', correct: false },
      { id: 'c', text: 'About 0.03 atmospheres (vacuum)', correct: true },
      { id: 'd', text: 'Water cannot boil at 25C', correct: false }
    ],
    explanation: 'At very low pressure (0.03 atm), the boiling point drops to room temperature. This is because there is almost no atmospheric pressure pushing down on the water surface, making it easy for molecules to escape.'
  },
  {
    id: 4,
    question: 'Scenario: A restaurant advertises that their pressure-cooked stew is ready in 45 minutes instead of 3 hours. Why do pressure cookers cook food faster?',
    options: [
      { id: 'a', text: 'Higher pressure pushes heat into food', correct: false },
      { id: 'b', text: 'Higher boiling point means hotter water', correct: true },
      { id: 'c', text: 'Steam moves faster at high pressure', correct: false },
      { id: 'd', text: 'Pressure cookers use less water', correct: false }
    ],
    explanation: 'The key is temperature, not pressure directly. At 2 atm, water boils at 120C instead of 100C. The extra 20C significantly speeds up chemical reactions in food.'
  },
  {
    id: 5,
    question: 'Scenario: A physics student is studying why water evaporates from an open container. What is vapor pressure?',
    options: [
      { id: 'a', text: 'The pressure inside a sealed container', correct: false },
      { id: 'b', text: 'The pressure exerted by a vapor in equilibrium with its liquid', correct: true },
      { id: 'c', text: 'The weight of water vapor in the air', correct: false },
      { id: 'd', text: 'The force needed to compress a gas', correct: false }
    ],
    explanation: 'Vapor pressure is the pressure exerted by evaporated molecules above a liquid surface. When vapor pressure equals atmospheric pressure, boiling occurs because bubbles can form throughout the liquid.'
  },
  {
    id: 6,
    question: 'Scenario: An engineer is calculating how pressure changes affect industrial processes. According to the Clausius-Clapeyron relation, what happens to boiling point when pressure doubles?',
    options: [
      { id: 'a', text: 'Boiling point doubles', correct: false },
      { id: 'b', text: 'Boiling point increases, but not by double', correct: true },
      { id: 'c', text: 'Boiling point stays the same', correct: false },
      { id: 'd', text: 'Boiling point decreases', correct: false }
    ],
    explanation: 'The relationship between pressure and boiling point is logarithmic, not linear. Doubling pressure from 1 to 2 atm raises water boiling point from 100C to about 120C - an increase of 20%, not 100%.'
  },
  {
    id: 7,
    question: 'Scenario: A gourmet chef prepares delicate fruits using vacuum cooking technology. Why is vacuum cooking (sous vide at low pressure) useful for delicate ingredients?',
    options: [
      { id: 'a', text: 'It removes bacteria more effectively', correct: false },
      { id: 'b', text: 'It allows boiling at lower temperatures, preserving texture', correct: true },
      { id: 'c', text: 'It makes food cook faster', correct: false },
      { id: 'd', text: 'It adds more flavor to the food', correct: false }
    ],
    explanation: 'Lower pressure means lower boiling temperature. This allows gentle cooking without the high heat that can damage delicate textures and nutrients in foods like berries or fish.'
  },
  {
    id: 8,
    question: 'Scenario: A Denver bakery adjusts their recipes for the mile-high altitude. In Denver (altitude ~1600m), water boils at approximately what temperature?',
    options: [
      { id: 'a', text: '100C - altitude does not matter', correct: false },
      { id: 'b', text: '95C - slightly lower due to reduced pressure', correct: true },
      { id: 'c', text: '85C - significantly lower', correct: false },
      { id: 'd', text: '105C - higher due to thinner air', correct: false }
    ],
    explanation: 'At Denver altitude (1600m), atmospheric pressure is about 0.83 atm. This reduces the boiling point to approximately 95C - enough to require recipe adjustments for baking and cooking times.'
  },
  {
    id: 9,
    question: 'Scenario: A home cook wonders whether salting pasta water affects cooking. What happens to the boiling point of water if you add salt?',
    options: [
      { id: 'a', text: 'It decreases significantly', correct: false },
      { id: 'b', text: 'It increases slightly (boiling point elevation)', correct: true },
      { id: 'c', text: 'It stays exactly the same', correct: false },
      { id: 'd', text: 'It becomes unpredictable', correct: false }
    ],
    explanation: 'Adding salt raises the boiling point slightly through a colligative property called boiling point elevation. However, the effect is small - about 0.5C per tablespoon of salt per liter of water.'
  },
  {
    id: 10,
    question: 'Scenario: Tourists at Yellowstone watch Old Faithful erupt with tremendous force. Why do geysers erupt with such force?',
    options: [
      { id: 'a', text: 'Underground volcanic gases push the water out', correct: false },
      { id: 'b', text: 'Superheated water under pressure rapidly boils when reaching lower pressure at surface', correct: true },
      { id: 'c', text: 'Earthquakes force the water upward', correct: false },
      { id: 'd', text: 'The water is heated by the sun', correct: false }
    ],
    explanation: 'Deep underground, high pressure keeps water liquid even above 100C (up to 200-300C). When this superheated water reaches the surface where pressure is lower, it instantly flash-boils into steam, creating the explosive eruption.'
  }
];

const TRANSFER_APPS = [
  {
    title: 'Pressure Cookers',
    description: 'At 2 atm, water boils at approximately 120°C - a full 20°C hotter than at sea level. This extra heat dramatically speeds cooking: beans cook in 20 minutes instead of 2 hours, and tough meats become tender in under an hour. Brands like Instant Pot and Cuisinart have sold over 50 million pressure cookers worldwide. The technology dates back to 1679 when Denis Papin invented the "steam digester."',
    icon: 'pot',
    stats: '120°C boiling point, 50M+ units sold, 70% faster cooking'
  },
  {
    title: 'High Altitude Cooking',
    description: 'In Denver (1,600m elevation), water boils at 95°C. At Everest base camp (5,400m), it boils at only 71°C. This means cooking takes 25-50% longer at high altitude because chemical reactions slow down at lower temperatures. NASA astronauts on the ISS (at ~0.7 atm) face similar challenges. Food companies like General Mills and Betty Crocker provide special high-altitude cooking instructions for their products.',
    icon: 'mountain',
    stats: '95°C at Denver, 71°C at Everest, 25-50% longer cooking time'
  },
  {
    title: 'Vacuum Distillation',
    description: 'By reducing pressure to 0.01 atm, liquids can be boiled at temperatures as low as 7°C. This technique is crucial in the pharmaceutical industry for purifying heat-sensitive compounds worth billions of dollars. Companies like Pfizer, Merck, and Johnson & Johnson use vacuum distillation to produce vitamins, antibiotics, and vaccines. The process also enables low-temperature drying of delicate food products.',
    icon: 'beaker',
    stats: '7°C boiling at 0.01 atm, $500B pharmaceutical industry applications'
  },
  {
    title: 'Geysers',
    description: 'Underground water heated by magma can reach 200-300°C while remaining liquid under high pressure (3-10 atm). When this superheated water reaches the surface, the sudden pressure drop causes explosive boiling - producing geyser eruptions. Yellowstone\'s Old Faithful erupts every 90 minutes, shooting 32,000 liters of water up to 56 meters high. Iceland and New Zealand use geothermal energy from similar systems to generate over 25% of their electricity.',
    icon: 'geyser',
    stats: '200-300°C underground, 56m eruption height, 25% of Iceland\'s power'
  }
];

// Antoine equation approximation for water boiling point
function getBoilingPoint(pressureAtm: number): number {
  if (pressureAtm <= 0.01) return 7;
  return 100 + 28.7 * Math.log(pressureAtm);
}

function getWaterState(temp: number, boilingPoint: number): 'solid' | 'liquid' | 'boiling' | 'gas' {
  if (temp <= 0) return 'solid';
  if (temp < boilingPoint - 1) return 'liquid';
  if (temp <= boilingPoint + 5) return 'boiling';
  return 'gas';
}

export default function BoilingPressureRenderer({ onBack, onPhaseComplete, gamePhase, phase: externalPhase }: BoilingPressureRendererProps) {
  // Core state
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Determine which phase to use - external prop takes precedence
  const phase = (externalPhase || gamePhase || internalPhase) as Phase;
  const isSelfManaged = !externalPhase && !gamePhase;

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [selectedApp, setSelectedApp] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);

  // Simulation state
  const [pressure, setPressure] = useState(1.0);
  const [temperature, setTemperature] = useState(25);
  const [heating, setHeating] = useState(false);
  const [bubbles, setBubbles] = useState<{id: number; x: number; y: number; size: number}[]>([]);

  // Twist state - altitude comparison
  const [twistLocation, setTwistLocation] = useState<'sea' | 'denver' | 'everest'>('sea');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistHeating, setTwistHeating] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const bubbleIdRef = useRef(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Color palette with proper contrast - textSecondary must be #e2e8f0 for brightness >= 180
  const colors = {
    primary: '#06b6d4',       // cyan-500
    primaryDark: '#0891b2',   // cyan-600
    accent: '#f97316',        // orange-500 (for heat)
    secondary: '#3b82f6',     // blue-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#ffffff',   // white - proper contrast for accessibility
    textSecondary: '#e2e8f0', // slate-200 - proper contrast
    textMuted: '#cbd5e1',     // slate-300
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    heat: '#ef4444',          // red-500
    cold: '#3b82f6',          // blue-500
    steam: '#e5e7eb',         // gray-200
    water: '#60a5fa',         // blue-400
  };

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

  // Sound utility
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Emit game events (for logging/analytics)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      // Event logging placeholder - can be connected to analytics
      console.debug('Game event:', { type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
    },
    [phase]
  );

  // Navigation helpers
  const getCurrentPhaseIndex = () => PHASE_ORDER.indexOf(phase);

  const goToNextPhase = useCallback(() => {
    const currentIndex = getCurrentPhaseIndex();
    if (currentIndex < PHASE_ORDER.length - 1) {
      if (isSelfManaged) {
        setInternalPhase(PHASE_ORDER[currentIndex + 1]);
      }
      playSound('transition');
      onPhaseComplete?.(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, isSelfManaged, playSound, onPhaseComplete]);

  const goToPrevPhase = useCallback(() => {
    const currentIndex = getCurrentPhaseIndex();
    if (currentIndex > 0 && isSelfManaged) {
      setInternalPhase(PHASE_ORDER[currentIndex - 1]);
      playSound('transition');
    }
  }, [phase, isSelfManaged, playSound]);

  const goToPhase = useCallback((targetPhase: Phase) => {
    if (isSelfManaged && PHASE_ORDER.includes(targetPhase)) {
      setInternalPhase(targetPhase);
      playSound('transition');
    }
  }, [isSelfManaged, playSound]);

  const getLocationPressure = (loc: 'sea' | 'denver' | 'everest'): number => {
    switch (loc) {
      case 'sea': return 1.0;
      case 'denver': return 0.83;
      case 'everest': return 0.33;
    }
  };

  // Heating effect
  useEffect(() => {
    if (!heating) return;

    const boilingPoint = getBoilingPoint(pressure);
    const interval = setInterval(() => {
      setTemperature(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [heating, pressure]);

  // Bubble generation
  useEffect(() => {
    const boilingPoint = getBoilingPoint(pressure);
    const state = getWaterState(temperature, boilingPoint);

    if (state !== 'boiling') {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev
          .map(b => ({ ...b, y: b.y - 3 }))
          .filter(b => b.y > 120);

        if (Math.random() > 0.3) {
          const nearBoiling = temperature >= boilingPoint;
          const intensity = nearBoiling ? 3 : 1;
          for (let i = 0; i < intensity; i++) {
            updated.push({
              id: bubbleIdRef.current++,
              x: 100 + Math.random() * 200,
              y: 220 + Math.random() * 20,
              size: 3 + Math.random() * 6
            });
          }
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [temperature, pressure]);

  // Twist heating effect
  useEffect(() => {
    if (!twistHeating) return;

    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    const interval = setInterval(() => {
      setTwistTemp(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [twistHeating, twistLocation]);

  // Reset when returning to play/twist_play
  useEffect(() => {
    if (phase === 'play') {
      setTemperature(25);
      setHeating(false);
      setPressure(1.0);
    }
    if (phase === 'twist_play') {
      setTwistTemp(25);
      setTwistHeating(false);
      setTwistLocation('sea');
    }
  }, [phase]);

  // Top navigation bar component
  const renderTopNavBar = () => {
    const currentIndex = getCurrentPhaseIndex();
    const canGoBack = currentIndex > 0;
    const totalPhases = PHASE_ORDER.length;
    const progress = ((currentIndex + 1) / totalPhases) * 100;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        padding: '8px 16px',
      }}>
        {/* Progress bar */}
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(148, 163, 184, 0.2)',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          {/* Back button */}
          <button
            onClick={goToPrevPhase}
            disabled={!canGoBack}
            aria-label="Back"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: canGoBack ? 'rgba(71, 85, 105, 0.6)' : 'rgba(71, 85, 105, 0.3)',
              border: 'none',
              borderRadius: '8px',
              color: canGoBack ? colors.textSecondary : colors.textMuted,
              fontSize: '14px',
              fontWeight: '600',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Back
          </button>

          {/* Navigation dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {PHASE_ORDER.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={`Go to ${p} phase`}
                title={phaseLabels[p]}
                style={{
                  width: idx === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: idx === currentIndex
                    ? 'linear-gradient(90deg, #06b6d4, #0891b2)'
                    : idx < currentIndex
                    ? 'rgba(6, 182, 212, 0.5)'
                    : 'rgba(148, 163, 184, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={goToNextPhase}
            aria-label="Next"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              border: 'none',
              borderRadius: '8px',
              color: colors.textPrimary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

  // Main container styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bgCard,
    paddingTop: '70px', // Space for fixed nav bar
    paddingBottom: '20px',
    overflow: 'hidden',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  };

  // Render premium beaker visualization with SVG defs
  const renderBeaker = (temp: number, pres: number, currentBubbles: typeof bubbles) => {
    const boilingPoint = getBoilingPoint(pres);
    const state = getWaterState(temp, boilingPoint);
    const isBoiling = state === 'boiling';
    const isGas = state === 'gas';

    return (
      <div>
        <svg viewBox="0 0 400 280" style={{ width: '100%', height: '224px' }}>
          <defs>
            {/* Premium water gradient - deep blue with depth */}
            <linearGradient id="boilWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.9" />
            </linearGradient>

            {/* Boiling water gradient - warmer tones */}
            <linearGradient id="boilWaterBoiling" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.85" />
              <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#1d4ed8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.9" />
            </linearGradient>

            {/* Steam/gas gradient */}
            <linearGradient id="boilSteamGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#bae6fd" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>

            {/* Bubble gradient with shine */}
            <radialGradient id="boilBubbleGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#bae6fd" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.3" />
            </radialGradient>

            {/* Glass beaker gradient - realistic glass effect */}
            <linearGradient id="boilGlassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#cbd5e1" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.3" />
              <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
            </linearGradient>

            {/* Burner metal gradient */}
            <linearGradient id="boilBurnerMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Heat/flame gradient */}
            <radialGradient id="boilFlameGradient" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="25%" stopColor="#fde047" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#facc15" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Heat outer glow */}
            <radialGradient id="boilHeatGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
            </radialGradient>

            {/* Pressure gauge gradient */}
            <linearGradient id="boilGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Gauge bezel gradient */}
            <linearGradient id="boilGaugeBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Steam wisp gradient */}
            <linearGradient id="boilSteamWisp" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#f3f4f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#f9fafb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter for bubbles */}
            <filter id="boilBubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat glow filter */}
            <filter id="boilHeatGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Steam glow filter */}
            <filter id="boilSteamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Lab background gradient */}
            <linearGradient id="boilLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Premium lab background */}
          <rect width="400" height="280" fill="url(#boilLabBg)" />

          {/* === PRESSURE GAUGE (LEFT) === */}
          <g transform="translate(20, 15)">
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M 20 42 A 25 25 0 0 1 70 42" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <path
              d={`M 20 42 A 25 25 0 0 1 ${20 + 50 * Math.min(pres / 3, 1)} ${42 - 20 * Math.sin(Math.PI * Math.min(pres / 3, 1))}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="45" cy="42" r="4" fill="#475569" />
            <circle cx="45" cy="42" r="2" fill="#22d3ee" />
            <text x="45" y="12" textAnchor="middle" fill={colors.textSecondary} fontSize="8">Pressure</text>
            <text x="45" y="52" textAnchor="middle" fill={colors.primary} fontSize="10" fontWeight="bold">{pres.toFixed(2)} atm</text>
          </g>

          {/* === TEMPERATURE GAUGE (RIGHT) === */}
          <g transform="translate(290, 15)">
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            <rect x="15" y="20" width="60" height="8" rx="4" fill="#1f2937" />
            <rect x="15" y="20" width={Math.min((temp / 150) * 60, 60)} height="8" rx="4" fill={isBoiling ? '#fb923c' : '#f97316'} />
            <text x="45" y="12" textAnchor="middle" fill={colors.textSecondary} fontSize="8">Temperature</text>
            <text x="45" y="45" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">{temp.toFixed(0)}C</text>
          </g>

          {/* === BOILING POINT DISPLAY (CENTER) === */}
          <g transform="translate(155, 15)">
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            <circle cx="45" cy="28" r="12" fill="none" stroke={isBoiling ? '#f87171' : '#475569'} strokeWidth="2" />
            {isBoiling && (
              <circle cx="45" cy="28" r="8" fill="#f87171" opacity="0.6">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
              </circle>
            )}
            <text x="45" y="12" textAnchor="middle" fill={colors.textSecondary} fontSize="8">Boils at</text>
            <text x="45" y="50" textAnchor="middle" fill={colors.danger} fontSize="10" fontWeight="bold">{boilingPoint.toFixed(0)}C</text>
          </g>

          {/* === PREMIUM GLASS BEAKER === */}
          <g>
            {/* Beaker shadow */}
            <path
              d="M 105 95 L 105 242 Q 105 262 125 262 L 275 262 Q 295 262 295 242 L 295 95"
              fill="none"
              stroke="#0f172a"
              strokeWidth="8"
              strokeOpacity="0.3"
            />

            {/* Water fill - using gradient based on state */}
            <path
              d="M 104 120 L 104 238 Q 104 258 124 258 L 276 258 Q 296 258 296 238 L 296 120 Z"
              fill={isGas ? 'url(#boilSteamGradient)' : isBoiling ? 'url(#boilWaterBoiling)' : 'url(#boilWaterGradient)'}
            />

            {/* Water surface highlight */}
            <path
              d="M 108 120 L 292 120"
              stroke="#bae6fd"
              strokeWidth="2"
              strokeOpacity={isGas ? 0.2 : 0.4}
            />

            {/* Premium bubbles with glow */}
            {currentBubbles.map(b => (
              <g key={b.id} filter="url(#boilBubbleGlow)">
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.size}
                  fill="url(#boilBubbleGradient)"
                />
                <circle
                  cx={b.x - b.size * 0.3}
                  cy={b.y - b.size * 0.3}
                  r={b.size * 0.25}
                  fill="white"
                  fillOpacity="0.8"
                />
              </g>
            ))}

            {/* Glass beaker outline with gradient */}
            <path
              d="M 100 90 L 100 240 Q 100 262 122 262 L 278 262 Q 300 262 300 240 L 300 90"
              fill="none"
              stroke="url(#boilGlassGradient)"
              strokeWidth="4"
            />

            {/* Glass rim highlight */}
            <path
              d="M 100 90 L 100 95"
              stroke="#e2e8f0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            <path
              d="M 300 90 L 300 95"
              stroke="#e2e8f0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />

            {/* Glass reflection line */}
            <path
              d="M 106 100 L 106 230"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.15"
            />
          </g>

          {/* === STEAM WISPS === */}
          {isBoiling && (
            <g filter="url(#boilSteamGlow)">
              <path d="M 150 85 Q 145 65 155 45 Q 160 30 150 15" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="4" strokeLinecap="round">
                <animate attributeName="d" values="M 150 85 Q 145 65 155 45 Q 160 30 150 15;M 150 85 Q 155 65 145 45 Q 140 30 150 15;M 150 85 Q 145 65 155 45 Q 160 30 150 15" dur="2s" repeatCount="indefinite" />
              </path>
              <path d="M 200 85 Q 210 60 195 40 Q 185 25 200 5" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="5" strokeLinecap="round">
                <animate attributeName="d" values="M 200 85 Q 210 60 195 40 Q 185 25 200 5;M 200 85 Q 190 60 205 40 Q 215 25 200 5;M 200 85 Q 210 60 195 40 Q 185 25 200 5" dur="2.5s" repeatCount="indefinite" />
              </path>
              <path d="M 250 85 Q 255 65 245 45 Q 240 30 250 15" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="4" strokeLinecap="round">
                <animate attributeName="d" values="M 250 85 Q 255 65 245 45 Q 240 30 250 15;M 250 85 Q 245 65 255 45 Q 260 30 250 15;M 250 85 Q 255 65 245 45 Q 240 30 250 15" dur="1.8s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* === PREMIUM BURNER === */}
          <g>
            <rect x="115" y="264" width="170" height="16" rx="4" fill="url(#boilBurnerMetal)" />
            <rect x="115" y="264" width="170" height="3" rx="1" fill="#4b5563" />
            {[135, 165, 195, 225, 255].map(x => (
              <rect key={x} x={x} y="267" width="4" height="10" rx="1" fill="#1f2937" />
            ))}

            {/* Heat/Flame effect when heating */}
            {heating && (
              <g filter="url(#boilHeatGlowFilter)">
                <ellipse cx="200" cy="262" rx="70" ry="8" fill="url(#boilHeatGlow)">
                  <animate attributeName="opacity" values="0.5;0.8;0.5" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="200" cy="262" rx="50" ry="6" fill="url(#boilFlameGradient)">
                  <animate attributeName="rx" values="50;55;50" dur="0.2s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="200" cy="261" rx="30" ry="3" fill="#fef9c3" fillOpacity="0.9">
                  <animate attributeName="fillOpacity" values="0.9;1;0.9" dur="0.15s" repeatCount="indefinite" />
                </ellipse>
              </g>
            )}
          </g>

          {/* === STATE INDICATOR BADGE === */}
          <g>
            <rect x="140" y="175" width="120" height="35" rx="10" fill="url(#boilGaugeGradient)" stroke={
              isBoiling ? '#fb923c' : isGas ? '#f87171' : '#60a5fa'
            } strokeWidth="2" />
            <text x="200" y="198" textAnchor="middle" fill={isBoiling ? colors.accent : isGas ? colors.danger : colors.water} fontSize="14" fontWeight="bold" style={{ textTransform: 'uppercase' }}>
              {state}
            </text>
          </g>
        </svg>
      </div>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: typo.title, marginBottom: '8px' }}>
            Why Is Mountain Cooking So Tricky?
          </h1>
          <p style={{ color: colors.primary, fontSize: typo.bodyLarge }}>
            Discover how pressure controls the boiling point of water
          </p>
        </div>

        {/* SVG visualization */}
        <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
          <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="mountainGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            <rect width="400" height="200" fill="#0f172a" />
            {/* Mountain */}
            <polygon points="50,200 200,50 350,200" fill="url(#mountainGrad)" />
            {/* Snow cap */}
            <polygon points="150,100 200,50 250,100 230,100 200,70 170,100" fill="#e2e8f0" />
            {/* Pot at base */}
            <rect x="60" y="160" width="40" height="30" fill="#475569" rx="4" />
            <ellipse cx="80" cy="160" rx="20" ry="5" fill="#64748b" />
            <text x="80" y="155" textAnchor="middle" fill={colors.textSecondary} fontSize="12">100C</text>
            {/* Pot at summit */}
            <rect x="180" y="60" width="40" height="30" fill="#475569" rx="4" />
            <ellipse cx="200" cy="60" rx="20" ry="5" fill="#64748b" />
            <text x="200" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="12">71C</text>
            {/* Question marks */}
            <text x="280" y="100" fill={colors.primary} fontSize="32">?</text>
          </svg>
        </div>

        <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, marginBottom: '12px', lineHeight: 1.6, fontWeight: 400 }}>
            <strong>Imagine</strong> you&apos;re a climber on Mount Everest, desperately wanting a proper cup of tea.
            The water &quot;boils&quot; but the tea doesn&apos;t steep properly. <strong>Surprising?</strong>
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6, fontWeight: 400 }}>
            At Everest base camp, water boils at only 71C (160F)...
          </p>
          <p style={{ color: colors.primary, fontSize: typo.body, fontWeight: 'bold', marginTop: '12px', lineHeight: 1.6 }}>
            <strong>Discover</strong> how pressure controls boiling and <strong>wonder</strong> at this fascinating physics!
          </p>
        </div>

        <button
          onClick={goToNextPhase}
          style={{
            width: '100%',
            padding: '16px',
            minHeight: '44px',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            border: 'none',
            borderRadius: '12px',
            color: colors.textPrimary,
            fontSize: typo.bodyLarge,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
          }}
        >
          Discover the Secret
        </button>
      </div>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        {/* Progress indicator for predict phase */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 1 of 4: Make your prediction</span>
        </div>

        <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, textAlign: 'center', marginBottom: '16px' }}>
          Make Your Prediction
        </h2>

        {/* SVG visualization for predict phase */}
        <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
            <rect width="400" height="200" fill="#0f172a" />
            {/* Pressure arrows */}
            <text x="200" y="30" textAnchor="middle" fill={colors.textSecondary} fontSize="14">High Pressure</text>
            <line x1="100" y1="50" x2="100" y2="80" stroke={colors.primary} strokeWidth="3" markerEnd="url(#arrowDown)" />
            <line x1="150" y1="50" x2="150" y2="80" stroke={colors.primary} strokeWidth="3" />
            <line x1="250" y1="50" x2="250" y2="80" stroke={colors.primary} strokeWidth="3" />
            <line x1="300" y1="50" x2="300" y2="80" stroke={colors.primary} strokeWidth="3" />
            {/* Water surface */}
            <rect x="80" y="90" width="240" height="80" fill="#3b82f6" fillOpacity="0.5" rx="4" />
            <text x="200" y="135" textAnchor="middle" fill={colors.textPrimary} fontSize="12">Water</text>
            {/* Question */}
            <text x="200" y="190" textAnchor="middle" fill={colors.warning} fontSize="14">What happens when pressure decreases?</text>
          </svg>
        </div>

        <div style={{ background: colors.bgCardLight, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            If you reduce the air pressure around water, what happens to its boiling point?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'increase', text: 'The boiling point increases' },
            { id: 'decrease', text: 'The boiling point decreases' },
            { id: 'same', text: 'The boiling point stays the same' },
            { id: 'none', text: 'Water can no longer boil' }
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => {
                playSound('click');
                setPrediction(option.id);
                emitEvent('prediction_made', { prediction: option.id });
              }}
              style={{
                padding: '14px',
                minHeight: '44px',
                background: prediction === option.id
                  ? option.id === 'decrease'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(6, 182, 212, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
                border: prediction === option.id
                  ? option.id === 'decrease'
                    ? '2px solid rgba(16, 185, 129, 0.5)'
                    : '2px solid rgba(6, 182, 212, 0.5)'
                  : '2px solid transparent',
                borderRadius: '10px',
                color: colors.textSecondary,
                fontSize: typo.body,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {option.text}
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{ marginTop: '16px', padding: '16px', background: colors.bgCardLight, borderRadius: '12px' }}>
            <p style={{
              color: prediction === 'decrease' ? colors.success : colors.danger,
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {prediction === 'decrease'
                ? '✓ Correct! Lower pressure means water boils at lower temperatures!'
                : '✗ Not quite - the correct answer is that boiling point decreases.'}
            </p>
            {prediction !== 'decrease' && (
              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>
                <strong>Explanation:</strong> When air pressure decreases, there&apos;s less force pushing down on the water&apos;s surface.
                This makes it easier for water molecules to escape into vapor, so boiling happens at a lower temperature.
                At sea level (1 atm), water boils at 100°C. On Mount Everest (0.33 atm), it boils at only 71°C!
              </p>
            )}
            <button
              onClick={goToNextPhase}
              style={{
                width: '100%',
                padding: '14px',
                minHeight: '44px',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                border: 'none',
                borderRadius: '10px',
                color: colors.textPrimary,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Test Your Prediction
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render play phase
  const renderPlay = () => {
    const boilingPoint = getBoilingPoint(pressure);

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, textAlign: 'center', marginBottom: '8px' }}>
            Pressure and Boiling Point
          </h2>

          {/* Observation guidance */}
          <p style={{ color: colors.textSecondary, fontSize: typo.body, textAlign: 'center', marginBottom: '16px' }}>
            <strong>Observe</strong> how changing pressure affects the boiling point. <strong>Try</strong> adjusting the slider below and <strong>notice</strong> when bubbles appear! <strong>Experiment</strong> with different pressures and <strong>see what happens</strong> to the boiling temperature.
          </p>

          <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {renderBeaker(temperature, pressure, bubbles)}

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', color: colors.primary, fontWeight: 'bold', marginBottom: '8px' }}>
                Pressure: {pressure.toFixed(2)} atm
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={pressure}
                onChange={(e) => {
                  setPressure(Number(e.target.value));
                  setTemperature(25);
                }}
                style={{ width: '100%', accentColor: colors.primary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.small, color: colors.textMuted, marginTop: '4px' }}>
                <span>Vacuum (0.1)</span>
                <span>Sea Level (1.0)</span>
                <span>Pressure Cooker (3.0)</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: colors.textSecondary }}>
                At <span style={{ color: colors.primary, fontWeight: 'bold' }}>{pressure.toFixed(2)} atm</span>, water boils at{' '}
                <span style={{ color: colors.accent, fontWeight: 'bold' }}>{boilingPoint.toFixed(0)}C</span>
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setHeating(!heating);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: heating ? colors.danger : colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {heating ? 'Stop Heating' : 'Heat Water'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setTemperature(25);
                  setHeating(false);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: 'rgba(71, 85, 105, 0.6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textSecondary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Key physics terms and real-world relevance */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '16px' }}>
            <h4 style={{ color: colors.secondary, fontSize: typo.body, fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>Key Physics Terms</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.small, paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: 1.6 }}>
              <li><strong>Boiling Point</strong> is defined as the temperature at which a liquid&apos;s vapor pressure equals the surrounding atmospheric pressure. The formula is: P_vapor = P_atmospheric.</li>
              <li><strong>Atmospheric Pressure (atm)</strong> is a measure of the force exerted by air molecules on surfaces (1 atm = 101,325 Pa at sea level).</li>
              <li><strong>Vapor Pressure</strong> refers to the pressure exerted by molecules escaping from a liquid&apos;s surface into the gas phase.</li>
              <li><strong>Clausius-Clapeyron Equation</strong> describes how the relationship between pressure and boiling point is calculated logarithmically.</li>
            </ul>
            <p style={{ color: colors.primary, fontSize: typo.small, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
              <strong>Why This Matters:</strong> Understanding pressure-boiling relationships is essential for cooking at altitude, industrial chemical processing, and even designing spacecraft life support systems!
            </p>
          </div>

          <button
            onClick={() => { setHeating(false); goToNextPhase(); }}
            style={{
              width: '100%',
              padding: '14px',
              minHeight: '44px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontWeight: 'bold',
              cursor: 'pointer',
              maxWidth: '700px',
              display: 'block',
              margin: '0 auto',
            }}
          >
            Understand the Physics
          </button>
        </div>
      </div>
    );
  };

  // Render review phase
  const renderReview = () => (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, textAlign: 'center', marginBottom: '16px' }}>
          Why Pressure Changes Boiling Point
        </h2>

        {/* Connect to prediction made earlier */}
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '16px' }}>
          <p style={{ color: colors.success, fontSize: typo.body, margin: 0, lineHeight: 1.6 }}>
            <strong>As you observed</strong> in the experiment, {prediction === 'decrease' ? 'your prediction was correct!' : 'the result showed that'} lower pressure causes water to boil at lower temperatures. This is exactly what happens on Mount Everest - the reduced atmospheric pressure means water boils before it gets hot enough to properly cook food.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '12px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <h3 style={{ color: colors.secondary, fontSize: typo.bodyLarge, marginBottom: '8px', lineHeight: 1.4 }}>The Molecular Battle</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
              Boiling occurs when water molecules have enough energy to escape into the air.
              <span style={{ color: colors.warning, fontWeight: 'bold' }}> Higher pressure pushes back</span> on the
              surface, requiring more energy (higher temperature) to escape.
            </p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <h3 style={{ color: colors.primary, fontSize: typo.bodyLarge, marginBottom: '8px' }}>Pressure vs Temperature</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
              <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>Mountain</div>
                <p style={{ fontSize: typo.label, color: colors.textMuted }}>Everest</p>
                <p style={{ color: colors.primary, fontWeight: 'bold', fontSize: typo.small }}>0.33 atm</p>
                <p style={{ color: colors.accent, fontSize: typo.small }}>71C</p>
              </div>
              <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>Beach</div>
                <p style={{ fontSize: typo.label, color: colors.textMuted }}>Sea Level</p>
                <p style={{ color: colors.primary, fontWeight: 'bold', fontSize: typo.small }}>1.0 atm</p>
                <p style={{ color: colors.accent, fontSize: typo.small }}>100C</p>
              </div>
              <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>Pot</div>
                <p style={{ fontSize: typo.label, color: colors.textMuted }}>Pressure Cooker</p>
                <p style={{ color: colors.primary, fontWeight: 'bold', fontSize: typo.small }}>2.0 atm</p>
                <p style={{ color: colors.accent, fontSize: typo.small }}>120C</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <h3 style={{ color: colors.warning, fontSize: typo.bodyLarge, marginBottom: '8px' }}>Key Insight</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              The boiling point isn&apos;t a fixed property of water - it depends on the surrounding pressure!
              The Clausius-Clapeyron equation describes this relationship mathematically.
            </p>
          </div>
        </div>

        <button
          onClick={goToNextPhase}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '14px',
            minHeight: '44px',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            border: 'none',
            borderRadius: '12px',
            color: colors.textPrimary,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Ready for a Twist?
        </button>
      </div>
    </div>
  );

  // Render twist predict phase
  const renderTwistPredict = () => (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 2 of 4: Twist prediction</span>
        </div>

        <h2 style={{ color: colors.warning, fontSize: typo.heading, textAlign: 'center', marginBottom: '16px' }}>
          The Cooking Challenge
        </h2>

        {/* SVG visualization */}
        <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
            <rect width="400" height="200" fill="#0f172a" />
            {/* Pasta */}
            <rect x="150" y="100" width="100" height="60" fill="#475569" rx="8" />
            <ellipse cx="200" cy="100" rx="50" ry="10" fill="#64748b" />
            <text x="200" y="140" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Pasta</text>
            {/* Temperature comparison */}
            <text x="80" y="50" textAnchor="middle" fill={colors.success} fontSize="14">Sea Level</text>
            <text x="80" y="70" textAnchor="middle" fill={colors.textSecondary} fontSize="12">100C</text>
            <text x="320" y="50" textAnchor="middle" fill={colors.warning} fontSize="14">High Altitude</text>
            <text x="320" y="70" textAnchor="middle" fill={colors.textSecondary} fontSize="12">85C</text>
            <text x="200" y="190" textAnchor="middle" fill={colors.primary} fontSize="14">How does cooking time change?</text>
          </svg>
        </div>

        <div style={{ background: colors.bgCardLight, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            You need to cook pasta in boiling water. At high altitude where water boils at 85C
            instead of 100C, how will cooking time change?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'faster', text: 'Faster - boiling is boiling' },
            { id: 'same', text: 'About the same time' },
            { id: 'longer', text: 'Longer - the water is cooler' },
            { id: 'impossible', text: 'Impossible - pasta needs 100C water' }
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => {
                playSound('click');
                setTwistPrediction(option.id);
                emitEvent('twist_prediction_made', { prediction: option.id });
              }}
              style={{
                padding: '14px',
                minHeight: '44px',
                background: twistPrediction === option.id
                  ? option.id === 'longer'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(168, 85, 247, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
                border: twistPrediction === option.id
                  ? option.id === 'longer'
                    ? '2px solid rgba(16, 185, 129, 0.5)'
                    : '2px solid rgba(168, 85, 247, 0.5)'
                  : '2px solid transparent',
                borderRadius: '10px',
                color: colors.textSecondary,
                fontSize: typo.body,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {option.text}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{ marginTop: '16px', padding: '16px', background: colors.bgCardLight, borderRadius: '12px' }}>
            <p style={{
              color: twistPrediction === 'longer' ? colors.success : colors.danger,
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {twistPrediction === 'longer'
                ? '✓ Correct! Lower boiling point means cooler water, so cooking takes longer!'
                : '✗ Not quite - the correct answer is that cooking takes longer.'}
            </p>
            {twistPrediction !== 'longer' && (
              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>
                <strong>Explanation:</strong> Even though the water is &quot;boiling,&quot; at 85°C it&apos;s 15°C cooler than at sea level.
                Chemical reactions in food (like proteins denaturing and starches breaking down) happen more slowly at lower temperatures.
                So pasta that needs 10 minutes at sea level might need 15+ minutes at high altitude!
              </p>
            )}
            <button
              onClick={goToNextPhase}
              style={{
                width: '100%',
                padding: '14px',
                minHeight: '44px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none',
                borderRadius: '10px',
                color: colors.textPrimary,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              See the Difference
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => {
    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <h2 style={{ color: colors.warning, fontSize: typo.heading, textAlign: 'center', marginBottom: '8px' }}>
            Altitude Cooking Comparison
          </h2>

          {/* Observation guidance */}
          <p style={{ color: colors.textSecondary, fontSize: typo.body, textAlign: 'center', marginBottom: '16px' }}>
            Observe how altitude affects boiling temperature. Adjust the altitude slider or select different locations below!
          </p>

          <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '16px' }}>
            {/* Altitude slider control */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: colors.primary, fontWeight: 'bold', marginBottom: '8px' }}>
                Altitude: {twistLocation === 'sea' ? '0m (Sea Level)' : twistLocation === 'denver' ? '1,600m (Denver)' : '5,400m (Everest)'}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={twistLocation === 'sea' ? 0 : twistLocation === 'denver' ? 1 : 2}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const loc = val === 0 ? 'sea' : val === 1 ? 'denver' : 'everest';
                  setTwistLocation(loc);
                  setTwistTemp(25);
                  setTwistHeating(false);
                }}
                style={{ width: '100%', accentColor: colors.primary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.small, color: colors.textMuted, marginTop: '4px' }}>
                <span>Sea Level (0m)</span>
                <span>Denver (1,600m)</span>
                <span>Everest (5,400m)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {(['sea', 'denver', 'everest'] as const).map(loc => (
                <button
                  key={loc}
                  onClick={() => {
                    playSound('click');
                    setTwistLocation(loc);
                    setTwistTemp(25);
                    setTwistHeating(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    minHeight: '44px',
                    background: twistLocation === loc ? colors.secondary : 'rgba(71, 85, 105, 0.6)',
                    border: 'none',
                    borderRadius: '8px',
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    fontSize: typo.small,
                    cursor: 'pointer',
                  }}
                >
                  {loc === 'sea' ? 'Sea Level' : loc === 'denver' ? 'Denver' : 'Everest'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: colors.textMuted, fontSize: typo.small }}>Altitude</p>
                <p style={{ color: colors.textPrimary, fontWeight: 'bold' }}>
                  {twistLocation === 'sea' ? '0m' : twistLocation === 'denver' ? '1,600m' : '5,400m'}
                </p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: colors.textMuted, fontSize: typo.small }}>Pressure</p>
                <p style={{ color: colors.primary, fontWeight: 'bold' }}>{twistPressure.toFixed(2)} atm</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: colors.textMuted, fontSize: typo.small }}>Boils at</p>
                <p style={{ color: colors.accent, fontWeight: 'bold' }}>{boilingPoint.toFixed(0)}C</p>
              </div>
            </div>

            <div style={{ height: '120px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {twistTemp >= boilingPoint ? '💨' : '🫖'}
                </div>
                <p style={{ fontWeight: 'bold', color: twistTemp >= boilingPoint ? colors.accent : colors.secondary }}>
                  {twistTemp.toFixed(0)}C
                </p>
                <p style={{ color: colors.textMuted, fontSize: typo.small }}>
                  {twistTemp >= boilingPoint ? 'BOILING!' : 'Heating...'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setTwistHeating(!twistHeating);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: twistHeating ? colors.danger : colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {twistHeating ? 'Stop' : 'Heat'}
              </button>
            </div>

            {twistTemp >= boilingPoint && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: twistLocation === 'everest'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : twistLocation === 'denver'
                    ? 'rgba(249, 115, 22, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                border: `1px solid ${
                  twistLocation === 'everest'
                    ? colors.warning
                    : twistLocation === 'denver'
                      ? colors.accent
                      : colors.success
                }`,
              }}>
                <p style={{
                  textAlign: 'center',
                  color: twistLocation === 'everest'
                    ? '#fcd34d'
                    : twistLocation === 'denver'
                      ? '#fdba74'
                      : '#6ee7b7',
                }}>
                  {twistLocation === 'everest'
                    ? 'Water boiling at only 71C - pasta will take 50% longer!'
                    : twistLocation === 'denver'
                      ? 'Water at 95C - add ~20% more cooking time'
                      : 'Perfect 100C for standard cooking times'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setTwistHeating(false); goToNextPhase(); }}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '14px',
              minHeight: '44px',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Understand the Impact
          </button>
        </div>
      </div>
    );
  };

  // Render twist review phase
  const renderTwistReview = () => (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        <h2 style={{ color: colors.warning, fontSize: typo.heading, textAlign: 'center', marginBottom: '16px' }}>
          Cooking Temperature Matters!
        </h2>

        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            <h3 style={{ color: colors.accent, fontSize: typo.bodyLarge, marginBottom: '8px' }}>The Temperature-Time Tradeoff</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Cooking speed depends on <span style={{ color: colors.warning, fontWeight: 'bold' }}>temperature, not just boiling</span>.
              At lower boiling points, chemical reactions in food happen slower -
              so cooking takes longer even though the water is &quot;boiling.&quot;
            </p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(236, 72, 153, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h4 style={{ color: colors.danger, fontSize: typo.body, marginBottom: '8px' }}>High Altitude Problems</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.small, paddingLeft: '20px', margin: 0 }}>
              <li>Pasta undercooked despite boiling</li>
              <li>Eggs take longer to hardboil</li>
              <li>Baked goods rise too fast, then collapse</li>
              <li>Beans may never fully soften</li>
            </ul>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h4 style={{ color: colors.success, fontSize: typo.body, marginBottom: '8px' }}>Pressure Cooker Solution</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.small, paddingLeft: '20px', margin: 0 }}>
              <li>Raises boiling point to 120C</li>
              <li>Beans in 20 min (vs 2 hours)</li>
              <li>Tough meats become tender fast</li>
              <li>Works at any altitude!</li>
            </ul>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <p style={{ color: '#fcd34d', fontSize: typo.small }}>
              <strong>Fun Fact:</strong> On Mars (0.006 atm), water would boil at body temperature!
              Astronauts will need pressure cookers - or they&apos;ll eat very undercooked food.
            </p>
          </div>
        </div>

        <button
          onClick={goToNextPhase}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '14px',
            minHeight: '44px',
            background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
            border: 'none',
            borderRadius: '12px',
            color: colors.textPrimary,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          See Real Applications
        </button>
      </div>
    </div>
  );

  // Render transfer phase
  const renderTransfer = () => {
    const currentApp = TRANSFER_APPS[selectedApp];
    const allCompleted = completedApps.size >= TRANSFER_APPS.length;

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, textAlign: 'center', marginBottom: '8px' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator for transfer phase */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Application {selectedApp + 1} of {TRANSFER_APPS.length}
            </span>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              {TRANSFER_APPS.map((_, idx) => (
                <div
                  key={idx}
                  role="progressbar"
                  style={{
                    width: '20px',
                    height: '6px',
                    borderRadius: '3px',
                    background: completedApps.has(idx)
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : idx === selectedApp
                        ? 'rgba(6, 182, 212, 0.5)'
                        : 'rgba(148, 163, 184, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* App selector tabs */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            {TRANSFER_APPS.map((app, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  setCompletedApps(prev => new Set([...prev, i]));
                }}
                style={{
                  padding: '8px 12px',
                  minHeight: '44px',
                  background: selectedApp === i ? 'rgba(6, 182, 212, 0.3)' : completedApps.has(i) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                  border: selectedApp === i ? '2px solid rgba(6, 182, 212, 0.5)' : completedApps.has(i) ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {completedApps.has(i) && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '24px' }}>
                  {app.icon === 'pot' && '🍲'}
                  {app.icon === 'mountain' && '⛰️'}
                  {app.icon === 'beaker' && '⚗️'}
                  {app.icon === 'geyser' && '💨'}
                </div>
              </button>
            ))}
          </div>

          {/* Current app details */}
          <div style={{ background: colors.bgCardLight, borderRadius: '16px', padding: '20px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>
                {currentApp.icon === 'pot' && '🍲'}
                {currentApp.icon === 'mountain' && '⛰️'}
                {currentApp.icon === 'beaker' && '⚗️'}
                {currentApp.icon === 'geyser' && '💨'}
              </span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: typo.bodyLarge, margin: 0, lineHeight: 1.4 }}>{currentApp.title}</h3>
              </div>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '16px', lineHeight: 1.6 }}>
              {currentApp.description}
            </p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '12px' }}>
              <p style={{ color: colors.warning, fontSize: typo.small, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                <strong>Key Stats:</strong> {currentApp.stats}
              </p>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', marginBottom: '12px' }}>
              <p style={{ color: colors.primary, fontSize: typo.small, margin: 0, lineHeight: 1.5 }}>
                <strong>Key Physics:</strong> This demonstrates how pressure directly affects boiling temperature - the same principle you explored in the lab! The Clausius-Clapeyron equation predicts these changes precisely.
              </p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <p style={{ color: colors.success, fontSize: typo.small, margin: 0, lineHeight: 1.5 }}>
                <strong>Real-World Impact:</strong> Understanding the relationship between pressure and boiling point has revolutionized food preparation, pharmaceutical manufacturing, and energy production worldwide. Engineers at companies like Instant Pot, Cuisinart, and industrial giants apply these principles daily.
              </p>
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedApp < TRANSFER_APPS.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setSelectedApp(nextIdx);
                  setCompletedApps(prev => new Set([...prev, nextIdx]));
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Got It - Next Application →
              </button>
            ) : (
              <button
                onClick={() => { playSound('complete'); goToNextPhase(); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Continue to Test →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render test phase
  const renderTest = () => {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;
    // Clamp index to valid range to prevent undefined access
    const safeIndex = Math.min(currentQuestionIndex, TEST_QUESTIONS.length - 1);
    const currentQuestion = TEST_QUESTIONS[safeIndex];

    if (testSubmitted) {
      const correctCount = TEST_QUESTIONS.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      const passed = correctCount >= 7;

      return (
        <div style={containerStyle}>
          {renderTopNavBar()}
          <div style={contentStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>{passed ? '🎉' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>You Scored</h2>
              <p style={{ color: colors.textPrimary, fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
                {correctCount} / {TEST_QUESTIONS.length}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '20px' }}>
                {passed ? 'Excellent understanding of pressure and phase changes!' : 'Review the concepts and try again.'}
              </p>

              {/* Answer Review - Scrollable container */}
              <div style={{ maxWidth: '600px', margin: '0 auto 24px', textAlign: 'left' }}>
                <p style={{ color: colors.textMuted, fontSize: typo.small, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  Question-by-Question Review
                </p>
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '4px',
                }}>
                  {TEST_QUESTIONS.map((q, i) => {
                    const correctOpt = q.options.find(o => o.correct);
                    const isCorrect = testAnswers[q.id] === correctOpt?.id;
                    const userOpt = q.options.find(o => o.id === testAnswers[q.id]);
                    return (
                      <div key={i} style={{
                        background: colors.bgCardLight,
                        borderRadius: '10px',
                        border: `2px solid ${isCorrect ? colors.success : colors.danger}30`,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 'bold',
                            background: isCorrect ? colors.success : colors.danger,
                            color: 'white',
                          }}>
                            {isCorrect ? '\u2713' : '\u2717'}
                          </div>
                          <div>
                            <p style={{ fontSize: typo.small, fontWeight: 'bold', color: colors.textPrimary, margin: 0 }}>
                              Question {i + 1}
                            </p>
                            <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                              {q.question.substring(0, 80)}...
                            </p>
                          </div>
                        </div>
                        {!isCorrect && (
                          <div style={{ padding: '10px 14px' }}>
                            <p style={{ fontSize: '11px', color: colors.danger, margin: '0 0 4px', fontWeight: 600, lineHeight: 1.4 }}>
                              Your answer: {userOpt?.text || 'Not answered'}
                            </p>
                            <p style={{ fontSize: '11px', color: colors.success, margin: '0 0 6px', fontWeight: 600, lineHeight: 1.4 }}>
                              Correct: {correctOpt?.text}
                            </p>
                            <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  if (passed) {
                    playSound('complete');
                    goToNextPhase();
                  } else {
                    playSound('click');
                    setTestAnswers({});
                    setCurrentQuestionIndex(0);
                    setTestSubmitted(false);
                  }
                }}
                style={{
                  padding: '14px 32px',
                  minHeight: '44px',
                  background: passed
                    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                    : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {passed ? 'Complete Lesson' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Guard against undefined currentQuestion
    if (!currentQuestion) {
      setCurrentQuestionIndex(0);
      return null;
    }

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Check</h2>
          </div>

          {/* Question progress indicator */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Question {safeIndex + 1} of {TEST_QUESTIONS.length}
            </span>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              {TEST_QUESTIONS.map((q, idx) => (
                <div
                  key={idx}
                  role="progressbar"
                  style={{
                    width: '20px',
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[q.id]
                      ? 'linear-gradient(90deg, #06b6d4, #0891b2)'
                      : idx === safeIndex
                      ? 'rgba(6, 182, 212, 0.5)'
                      : 'rgba(148, 163, 184, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Quiz context and instructions */}
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '16px' }}>
            <p style={{ color: colors.secondary, fontSize: typo.small, margin: 0, lineHeight: 1.5 }}>
              <strong>Test Your Understanding:</strong> Apply what you learned about pressure and boiling point to these real-world scenarios. Each question presents a practical situation where pressure-temperature relationships matter. Think about how atmospheric pressure changes affect the boiling point of water in different environments.
            </p>
          </div>

          {/* Current question */}
          <div style={{ background: colors.bgCardLight, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '16px' }}>
              Q{safeIndex + 1} of {TEST_QUESTIONS.length}: {currentQuestion.question}
            </p>
            {currentQuestion.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: opt.id }));
                  // Auto-advance after short delay
                  if (safeIndex < TEST_QUESTIONS.length - 1) {
                    setTimeout(() => setCurrentQuestionIndex(prev => Math.min(TEST_QUESTIONS.length - 1, prev + 1)), 300);
                  }
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  minHeight: '44px',
                  marginBottom: '10px',
                  background: testAnswers[currentQuestion.id] === opt.id ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                  border: testAnswers[currentQuestion.id] === opt.id ? '2px solid rgba(6, 182, 212, 0.5)' : '2px solid transparent',
                  borderRadius: '10px',
                  color: colors.textSecondary,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          {/* Navigation between questions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {safeIndex > 0 && (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                style={{
                  padding: '10px 20px',
                  minHeight: '44px',
                  background: 'rgba(71, 85, 105, 0.6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {safeIndex < TEST_QUESTIONS.length - 1 && testAnswers[currentQuestion.id] && (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(TEST_QUESTIONS.length - 1, prev + 1))}
                style={{
                  padding: '10px 20px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                Next Question
              </button>
            )}
          </div>

          {/* Submit button */}
          {allAnswered && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setTestSubmitted(true)}
                style={{
                  padding: '14px 32px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: typo.body,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Submit Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render mastery phase
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound('complete');
      emitEvent('mastery_achieved', {});
    }

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', position: 'relative' }}>
            {showConfetti && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: 'bounce 1s infinite',
                      animationDelay: `${Math.random() * 2}s`,
                      fontSize: `${12 + Math.random() * 12}px`,
                    }}
                  >
                    {['🍲', '⛰️', '💨', '⭐', '✨'][Math.floor(Math.random() * 5)]}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
              <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '12px' }}>Phase Diagram Master!</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
                You&apos;ve mastered pressure and phase changes!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏖️</div>
                  <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Pressure-boiling point</p>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⛰️</div>
                  <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Altitude effects</p>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
                  <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Phase diagrams</p>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍲</div>
                  <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Pressure cooker physics</p>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '24px' }}>
                <p style={{ color: '#93c5fd' }}>
                  Key Insight: Boiling point isn&apos;t fixed - it&apos;s a battle between molecular escape energy and atmospheric pressure!
                </p>
              </div>

              {onBack && (
                <button
                  onClick={onBack}
                  style={{
                    padding: '14px 24px',
                    minHeight: '44px',
                    background: 'rgba(71, 85, 105, 0.6)',
                    border: 'none',
                    borderRadius: '12px',
                    color: colors.textSecondary,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Back to Games
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render - phase router
  const validPhase = PHASE_ORDER.includes(phase) ? phase : 'hook';

  switch (validPhase) {
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
}
