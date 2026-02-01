'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '☀️',
    title: 'Solar Cells',
    short: 'Photons liberate electrons for clean energy',
    tagline: 'Einstein\'s discovery powers the future',
    description: 'Solar cells convert sunlight directly into electricity using the photoelectric effect. Photons with sufficient energy liberate electrons in semiconductor materials, creating current that powers homes and businesses.',
    connection: 'Each photon with energy above the bandgap (analogous to work function) can create one electron-hole pair. This is why efficiency is limited by the solar spectrum.',
    howItWorks: 'Photons are absorbed in the depletion region of a p-n junction. Freed electrons flow through an external circuit. Multiple cells are connected to build useful voltage and current.',
    stats: [
      { value: '26%', label: 'top Si efficiency', icon: '⚡' },
      { value: '1TW', label: 'installed capacity', icon: '🌍' },
      { value: '$180B', label: 'annual market', icon: '📈' }
    ],
    examples: ['Rooftop solar panels', 'Solar farms', 'Spacecraft power', 'Solar calculators'],
    companies: ['First Solar', 'LONGi', 'Canadian Solar', 'SunPower'],
    futureImpact: 'Perovskite and tandem cells will push efficiencies toward 50%, making solar the dominant energy source globally.',
    color: '#F59E0B'
  },
  {
    icon: '📷',
    title: 'Digital Cameras',
    short: 'CMOS sensors capture photons as pixels',
    tagline: 'Every photo is the photoelectric effect',
    description: 'Digital camera sensors use the photoelectric effect to convert light into electrical signals. Each pixel is a tiny photodiode that generates electrons proportional to the light it receives.',
    connection: 'The quantum efficiency of image sensors depends on photon energy matching the semiconductor bandgap. Different wavelengths require different sensor designs.',
    howItWorks: 'Photons create electron-hole pairs in silicon photodiodes. These charges accumulate during exposure, then are read out as voltage signals that become digital pixel values.',
    stats: [
      { value: '100M+', label: 'megapixels', icon: '📸' },
      { value: '90%', label: 'quantum efficiency', icon: '⚡' },
      { value: '$25B', label: 'sensor market', icon: '📈' }
    ],
    examples: ['Smartphone cameras', 'DSLR sensors', 'Scientific CCDs', 'Security cameras'],
    companies: ['Sony', 'Samsung', 'OmniVision', 'Canon'],
    futureImpact: 'Stacked sensor architectures and computational imaging will enable even better low-light performance and dynamic range.',
    color: '#3B82F6'
  },
  {
    icon: '🌙',
    title: 'Night Vision',
    short: 'Photomultipliers amplify scarce photons',
    tagline: 'Seeing in the dark with quantum physics',
    description: 'Night vision devices use photocathodes where the photoelectric effect releases electrons from incoming photons. These electrons are multiplied thousands of times to create a visible image.',
    connection: 'The work function of the photocathode material determines the minimum photon energy (color) that can be detected. Modern materials respond to near-infrared.',
    howItWorks: 'Photons hit a photocathode, releasing electrons. An intensifier tube accelerates and multiplies these electrons. Finally, a phosphor screen converts them back to visible light.',
    stats: [
      { value: '50K', label: 'electron multiplication', icon: '⚡' },
      { value: '0.001', label: 'lux sensitivity', icon: '🌙' },
      { value: '$10B', label: 'market size', icon: '📈' }
    ],
    examples: ['Military goggles', 'Security surveillance', 'Wildlife observation', 'Astronomy'],
    companies: ['L3Harris', 'Elbit Systems', 'Thales', 'FLIR'],
    futureImpact: 'Digital night vision with CMOS sensors will provide color imaging in near-total darkness.',
    color: '#22C55E'
  },
  {
    icon: '🚪',
    title: 'Automatic Doors',
    short: 'Photosensors detect your approach',
    tagline: 'Physics in everyday convenience',
    description: 'Automatic doors use photoelectric sensors to detect when someone approaches. A light beam is broken or reflected, triggering the door to open. The photoelectric effect converts the light signal to an electrical one.',
    connection: 'Phototransistors and photodiodes in these sensors operate on the same quantum mechanical principle Einstein explained: photons eject electrons.',
    howItWorks: 'An emitter sends an infrared beam. A photodetector opposite or nearby measures the light. When the beam is interrupted or reflected by a person, the current change triggers the door.',
    stats: [
      { value: '3m', label: 'detection range', icon: '📏' },
      { value: '100ms', label: 'response time', icon: '⏱️' },
      { value: '$10B', label: 'sensor market', icon: '📈' }
    ],
    examples: ['Supermarket entrances', 'Elevator doors', 'Garage door safety', 'Assembly line sensors'],
    companies: ['Omron', 'Sick', 'Banner Engineering', 'Keyence'],
    futureImpact: 'Smart building systems will use networked photoelectric sensors for occupancy detection and energy optimization.',
    color: '#8B5CF6'
  }
];

// ============================================================================
// PHOTOELECTRIC EFFECT RENDERER - SPEC-COMPLIANT IMPLEMENTATION
// Follows GAME_TEST_SPECIFICATION.md exactly
// ============================================================================

// GameEvent interface - matches spec exactly
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'question_changed' | 'app_completed' | 'app_changed';
  gameType: string;
  gameTitle: string;
  details: {
    phase?: string;
    phaseLabel?: string;
    currentScreen?: number;
    totalScreens?: number;
    screenDescription?: string;
    prediction?: string;
    predictionLabel?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface PhotoelectricEffectRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility - matches spec
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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
};

// Phase type - string-based per spec
type PEPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PhotoelectricEffectRenderer: React.FC<PhotoelectricEffectRendererProps> = ({ onGameEvent, gamePhase }) => {
  // ============ STATE ============
  const [phase, setPhase] = useState<PEPhase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [wavelength, setWavelength] = useState(400);
  const [intensity, setIntensity] = useState(70);
  const [workFunction, setWorkFunction] = useState(2.3);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [hasTestedIntensity, setHasTestedIntensity] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));

  // Transfer state
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // ============ CONSTANTS ============
  const phaseOrder: PEPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<PEPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Intensity Test',
    twist_review: 'Quantum Truth',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const screenDescriptions: Record<PEPhase, string> = {
    hook: 'INTRO SCREEN: Title "The Photoelectric Effect", Einstein quote, Nobel Prize 1921 badge, Begin Experiment button.',
    predict: 'PREDICTION SCREEN: User must predict what determines electron speed: (A) Brighter light, (B) Light color/frequency, (C) Both, (D) Neither.',
    play: 'EXPERIMENT SCREEN: Interactive photoelectric lab with wavelength slider, metal selector, real-time visualization of photons and electrons.',
    review: 'REVIEW SCREEN: Explains Einstein\'s key insight - photon energy E=hf, work function barrier, kinetic energy formula.',
    twist_predict: 'TWIST PREDICTION: What happens when we increase BRIGHTNESS while keeping wavelength constant?',
    twist_play: 'INTENSITY TEST: Toggle intensity slider to see that electron SPEED stays constant, only COUNT changes.',
    twist_review: 'QUANTUM TRUTH: Classical physics was wrong! Light comes in discrete packets (photons).',
    transfer: 'REAL WORLD APPLICATIONS: 4 cards showing solar cells, cameras, night vision, light sensors.',
    test: 'KNOWLEDGE TEST: 10 scenario-based multiple choice questions.',
    mastery: 'COMPLETION SCREEN: Trophy, score display, key learnings summary.'
  };

  const coachMessages: Record<PEPhase, string> = {
    hook: "Welcome to the Photoelectric Effect! This Nobel Prize-winning discovery proved light is made of particles.",
    predict: "Time to predict! What do YOU think determines how fast electrons fly out?",
    play: "Now experiment! Try different wavelengths and metals. Watch what happens to the electrons.",
    review: "You discovered Einstein's key insight! Each photon carries energy E = hf.",
    twist_predict: "Classical physics thought brighter light = faster electrons. What do YOU predict?",
    twist_play: "Test it! Crank up the intensity and watch the electron SPEED - does it change?",
    twist_review: "Mind-blowing! Brightness only affects electron COUNT, not speed. Light comes in packets!",
    transfer: "See how the photoelectric effect powers solar cells, cameras, night vision, and more!",
    test: "Final test time! Apply what you learned to real scenarios.",
    mastery: "Congratulations! You've mastered the photoelectric effect!"
  };

  // Physics constants
  const h = 4.136e-15; // Planck's constant in eV·s
  const c = 3e8; // Speed of light in m/s
  const photonEnergy = (h * c) / (wavelength * 1e-9);
  const maxKE = Math.max(0, photonEnergy - workFunction);
  const emissionOccurs = photonEnergy >= workFunction;

  // ============ DESIGN SYSTEM ============
  const colors = {
    primary: '#f59e0b',      // amber-500
    primaryDark: '#d97706',  // amber-600
    accent: '#8b5cf6',       // violet-500
    accentDark: '#7c3aed',   // violet-600
    warning: '#f59e0b',      // amber-500
    success: '#10b981',      // emerald-500
    danger: '#ef4444',       // red-500
    bgDark: '#0a0f1a',       // custom dark
    bgCard: '#0f172a',       // slate-900
    bgCardLight: '#1e293b',  // slate-800
    border: '#334155',       // slate-700
    textPrimary: '#f8fafc',  // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',    // slate-500
  };

  const typo = {
    label: isMobile ? '9px' : '10px',
    small: isMobile ? '11px' : '12px',
    body: isMobile ? '12px' : '13px',
    bodyLarge: isMobile ? '13px' : '14px',
    heading: isMobile ? '18px' : '22px',
    title: isMobile ? '24px' : '32px',
    pagePadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '12px' : '14px',
    cardPadding: isMobile ? '10px' : '14px',
    elementGap: isMobile ? '8px' : '10px',
  };

  // ============ MOBILE DETECTION ============
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.05;
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // ============ EVENT EMISSION ============
  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Partial<GameEvent['details']> = {}) => {
    if (!onGameEvent) return;
    const idx = phaseOrder.indexOf(phase);
    const event: GameEvent = {
      eventType,
      gameType: 'photoelectric_effect',
      gameTitle: 'The Photoelectric Effect',
      details: {
        phase,
        phaseLabel: phaseLabels[phase],
        currentScreen: idx + 1,
        totalScreens: phaseOrder.length,
        screenDescription: screenDescriptions[phase],
        coachMessage: coachMessages[phase],
        ...details,
      },
      timestamp: Date.now(),
    };
    onGameEvent(event);
  }, [onGameEvent, phase]);

  // Emit game_started on mount
  useEffect(() => {
    emitGameEvent('game_started', {
      message: 'User started The Photoelectric Effect game',
    });
  }, []);

  // Reset test state when entering test phase
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTestAnswers(Array(10).fill(null));
    }
  }, [phase]);

  // ============ NAVIGATION ============
  const goToPhase = useCallback((p: PEPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      screenDescription: screenDescriptions[p],
      coachMessage: coachMessages[p],
      message: `NOW ON SCREEN ${idx + 1}/${phaseOrder.length}: ${phaseLabels[p]}. ${screenDescriptions[p]}`,
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ============ HELPER FUNCTIONS ============
  const wavelengthToColor = (wl: number): string => {
    if (wl < 380) return '#a78bfa';
    if (wl < 450) return '#3b82f6';
    if (wl < 495) return '#06b6d4';
    if (wl < 570) return '#22c55e';
    if (wl < 590) return '#eab308';
    if (wl < 620) return '#f97316';
    return '#ef4444';
  };

  // ============ RENDER HELPERS (per spec - FUNCTIONS, not components) ============
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.bgCard,
      backdropFilter: 'blur(12px)',
    }}>
      {canGoBack ? (
        <button
          onClick={() => goBack()}
          style={{
            color: colors.textSecondary,
            fontSize: typo.body,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ← Back
        </button>
      ) : <div />}

      <span style={{ fontSize: typo.small, color: colors.textMuted, fontWeight: 600 }}>
        {phaseLabels[phase]}
      </span>

      <button
        onClick={() => { if (canGoNext) { onNext ? onNext() : goNext(); } }}
        disabled={!canGoNext}
        style={{
          padding: '10px 20px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 700,
          fontSize: typo.body,
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          background: canGoNext ? `linear-gradient(135deg, ${accentColor || colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
          color: canGoNext ? 'white' : colors.textMuted,
          boxShadow: canGoNext ? `0 4px 20px ${accentColor || colors.primary}40` : 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {nextLabel} →
      </button>
    </div>
  );

  const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: typo.sectionGap }}>
      <p style={{ fontSize: typo.label, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.primary, marginBottom: '4px' }}>
        {phaseName}
      </p>
      <h2 style={{ fontSize: typo.heading, fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2, margin: 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.4, marginTop: '6px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const renderPremiumWrapper = (children: React.ReactNode, footer?: React.ReactNode) => {
    const idx = phaseOrder.indexOf(phase);

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: colors.bgDark, color: colors.textPrimary }}>
        {/* Animated background orbs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', background: `radial-gradient(circle, ${colors.accent}08 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(60px)' }} />
        </div>

        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: `${colors.bgCard}cc`, backdropFilter: 'blur(12px)', zIndex: 20 }}>
          {/* Back button */}
          <button
            onMouseDown={(e) => { e.preventDefault(); if (idx > 0) goBack(); }}
            onTouchEnd={(e) => { e.preventDefault(); if (idx > 0) goBack(); }}
            style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: idx > 0 ? colors.bgCardLight : 'transparent', color: idx > 0 ? colors.textSecondary : 'transparent', cursor: idx > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
          >
            ←
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); if (i <= idx) goToPhase(p); }}
                onTouchEnd={(e) => { e.preventDefault(); if (i <= idx) goToPhase(p); }}
                style={{
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: i <= idx ? 'pointer' : 'default',
                  background: phase === p ? colors.primary : i < idx ? colors.success : colors.border,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Phase indicator */}
          <span style={{ fontSize: typo.small, color: colors.primary, fontWeight: 700 }}>
            {idx + 1}/10
          </span>
        </div>

        {/* Main scrollable content */}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
      </div>
    );
  };

  // ============ DATA ============
  const metals = [
    { name: 'Sodium', workFunction: 2.3 },
    { name: 'Calcium', workFunction: 3.0 },
    { name: 'Zinc', workFunction: 4.3 },
    { name: 'Copper', workFunction: 4.7 },
    { name: 'Platinum', workFunction: 5.6 }
  ];

  const testQuestions = [
    { scenario: 'You\'re in a physics lab testing different light sources.', question: 'Red light shines on sodium but no electrons escape. You switch to blue light of the same intensity. What happens?', options: [{ id: 'a', label: 'Still no electrons - color doesn\'t matter' }, { id: 'b', label: 'Electrons are emitted because blue has higher frequency', correct: true }, { id: 'c', label: 'Same number of electrons, but slower' }, { id: 'd', label: 'Cannot determine without more info' }], explanation: 'Blue light has higher frequency, meaning each photon carries more energy (E = hf). If blue photon energy exceeds the work function, electrons will be emitted even though red couldn\'t do it.' },
    { scenario: 'A solar panel engineer is optimizing light collection.', question: 'You double the intensity of UV light hitting a metal surface. How does this affect the ejected electrons?', options: [{ id: 'a', label: 'Electrons move twice as fast' }, { id: 'b', label: 'Twice as many electrons at the same speed', correct: true }, { id: 'c', label: 'No change at all' }, { id: 'd', label: 'Electrons have more kinetic energy' }], explanation: 'Doubling intensity means twice as many photons per second. Each photon can eject one electron, so you get twice as many electrons. But each photon has the same energy (E = hf), so electron speed is unchanged.' },
    { scenario: 'You\'re reading about Einstein\'s Nobel Prize.', question: 'Einstein won the 1921 Nobel Prize for explaining the photoelectric effect. What was his key insight?', options: [{ id: 'a', label: 'Light travels in waves like water' }, { id: 'b', label: 'Light consists of discrete packets called photons', correct: true }, { id: 'c', label: 'Electrons have wave properties' }, { id: 'd', label: 'Energy is continuously distributed' }], explanation: 'Einstein proposed that light energy comes in discrete quanta (photons), each with energy E = hf. This explained why only frequency (not intensity) determines whether electrons can escape.' },
    { scenario: 'You\'re comparing two metals in the lab.', question: 'Metal A has work function 2.0 eV. Metal B has work function 4.5 eV. You shine 3.0 eV photons on both. What happens?', options: [{ id: 'a', label: 'Both metals emit electrons' }, { id: 'b', label: 'Neither metal emits electrons' }, { id: 'c', label: 'Only Metal A emits electrons', correct: true }, { id: 'd', label: 'Only Metal B emits electrons' }], explanation: 'Electrons escape only when photon energy exceeds work function. For Metal A: 3.0 > 2.0 eV (emission). For Metal B: 3.0 < 4.5 eV (no emission). Metal A emits electrons with 1.0 eV kinetic energy.' },
    { scenario: 'You\'re studying the history of physics.', question: 'Classical physics predicted that brighter light should eject faster electrons. Why was this prediction wrong?', options: [{ id: 'a', label: 'Light doesn\'t interact with electrons' }, { id: 'b', label: 'Energy comes in discrete packets, not continuous waves', correct: true }, { id: 'c', label: 'Metals absorb all light energy as heat' }, { id: 'd', label: 'Electrons are too heavy to accelerate' }], explanation: 'Classical wave theory assumed energy accumulates continuously. But light comes in photons with fixed energy E = hf. More photons (brighter) gives more electrons, but each photon\'s energy depends only on frequency.' },
    { scenario: 'You\'re analyzing experimental data.', question: 'The maximum kinetic energy of ejected electrons is measured as 1.5 eV. The metal\'s work function is 2.3 eV. What was the photon energy?', options: [{ id: 'a', label: '0.8 eV' }, { id: 'b', label: '2.3 eV' }, { id: 'c', label: '3.8 eV', correct: true }, { id: 'd', label: '1.5 eV' }], explanation: 'Using Einstein\'s equation: E_photon = Work Function + KE_max. So E_photon = 2.3 + 1.5 = 3.8 eV.' },
    { scenario: 'You\'re designing a solar cell.', question: 'Why do solar cells need photons with energy greater than the semiconductor\'s band gap?', options: [{ id: 'a', label: 'To heat up the material' }, { id: 'b', label: 'To free electrons from bound states', correct: true }, { id: 'c', label: 'To make the cell vibrate' }, { id: 'd', label: 'To change the cell\'s color' }], explanation: 'Just like the photoelectric effect, electrons in solar cells need enough energy to escape their bound states. The band gap is analogous to the work function.' },
    { scenario: 'You\'re researching night vision technology.', question: 'Night vision devices amplify starlight using the photoelectric effect. How do they work?', options: [{ id: 'a', label: 'They heat up the light' }, { id: 'b', label: 'One photon triggers a cascade of electrons', correct: true }, { id: 'c', label: 'They slow down light' }, { id: 'd', label: 'They change infrared to visible' }], explanation: 'Photomultiplier tubes use the photoelectric effect: one photon releases one electron, which triggers more electrons in a cascade, amplifying the signal millions of times.' },
    { scenario: 'You\'re calculating threshold frequencies.', question: 'The threshold frequency for a certain metal is 5 × 10¹⁴ Hz. What happens if you shine light at 6 × 10¹⁴ Hz?', options: [{ id: 'a', label: 'No emission - frequency too high' }, { id: 'b', label: 'Electrons are emitted with kinetic energy', correct: true }, { id: 'c', label: 'Light passes through the metal' }, { id: 'd', label: 'Electrons are absorbed' }], explanation: 'Since 6 × 10¹⁴ Hz > threshold of 5 × 10¹⁴ Hz, each photon has enough energy to exceed the work function. Electrons will be emitted with excess energy as kinetic energy.' },
    { scenario: 'You\'re explaining how a digital camera works.', question: 'In a digital camera sensor, what determines how bright each pixel appears?', options: [{ id: 'a', label: 'The color of light hitting it' }, { id: 'b', label: 'The number of photons hitting that pixel', correct: true }, { id: 'c', label: 'The temperature of the sensor' }, { id: 'd', label: 'The size of the camera' }], explanation: 'Each photon hitting a pixel can free one electron. More photons = more freed electrons = stronger electrical signal = brighter pixel.' }
  ];

  const applications = [
    { icon: '☀️', title: 'Solar Cells', short: 'Photovoltaic power', tagline: 'Converting Sunlight to Electricity', description: 'Photovoltaic cells convert sunlight directly into electricity using the photoelectric effect. When photons with energy greater than the semiconductor\'s band gap hit the cell, they free electrons that flow as electrical current.', connection: 'Just like our experiment - photons must have enough energy (above band gap) to free electrons. Low-energy photons pass through without effect.', howItWorks: 'Silicon absorbs photons with E > 1.1 eV, freeing electrons that flow through external circuit as electricity.', stats: [{ value: '1+ TW', label: 'Global capacity', icon: '⚡' }, { value: '20-25%', label: 'Efficiency', icon: '📊' }, { value: '$0.03/kWh', label: 'Cost achieved', icon: '💰' }], examples: ['Rooftop solar panels', 'Solar farms', 'Spacecraft power', 'Calculators'], companies: ['Tesla', 'First Solar', 'SunPower', 'JinkoSolar'], futureImpact: 'Solar could provide 50% of global electricity by 2050.', color: colors.primary },
    { icon: '📷', title: 'Digital Cameras', short: 'CCD/CMOS sensors', tagline: 'Capturing Light as Data', description: 'CCD and CMOS sensors are arrays of photoelectric cells. Each pixel converts incoming photons into electrons, measuring light intensity across millions of points to create digital images.', connection: 'Each pixel is a tiny photoelectric cell. Photon energy must exceed the silicon band gap to free electrons and register light.', howItWorks: 'Photons hit silicon pixels, freeing electrons proportional to light intensity. The electron count becomes pixel brightness.', stats: [{ value: '200+ MP', label: 'Max resolution', icon: '🔬' }, { value: '1M+', label: 'Pixels in 4K', icon: '📺' }, { value: '99%', label: 'Quantum efficiency', icon: '✨' }], examples: ['Smartphone cameras', 'DSLRs', 'Security cameras', 'Medical imaging'], companies: ['Sony', 'Samsung', 'Canon', 'Nikon'], futureImpact: 'Next-gen sensors will see in near-darkness with minimal noise.', color: colors.accent },
    { icon: '🌙', title: 'Night Vision', short: 'Photomultipliers', tagline: 'Seeing in the Dark', description: 'Photomultiplier tubes amplify tiny amounts of starlight by cascading the photoelectric effect. One photon releases one electron, which triggers more electrons in a chain reaction.', connection: 'Uses the photoelectric effect in cascade - each freed electron triggers more electrons, amplifying light signals up to 50,000×.', howItWorks: 'Photocathode converts photons to electrons. Microchannel plate multiplies each electron 10,000× through cascade emission.', stats: [{ value: '50,000×', label: 'Amplification', icon: '🔆' }, { value: 'Gen 3+', label: 'Technology', icon: '🎯' }, { value: '0.001 lux', label: 'Min light', icon: '🌟' }], examples: ['Military goggles', 'Wildlife cameras', 'Astronomy', 'Security systems'], companies: ['L3Harris', 'Elbit', 'Thales', 'FLIR'], futureImpact: 'Fusion sensors combining thermal and image intensification.', color: colors.success },
    { icon: '🚪', title: 'Light Sensors', short: 'Photoelectric detection', tagline: 'Automated Light Response', description: 'Automatic doors, elevator safety systems, and industrial automation use photoelectric sensors. When you break a light beam, fewer photons reach the detector, triggering a response.', connection: 'Detector uses photoelectric effect to count photons. Breaking the beam reduces electron flow, signaling an obstruction.', howItWorks: 'Emitter sends light beam. Receiver\'s photoelectric cell generates current proportional to photon count. Break = signal drop.', stats: [{ value: '5M+', label: 'Doors installed', icon: '🚪' }, { value: '<1ms', label: 'Response time', icon: '⚡' }, { value: '99.9%', label: 'Reliability', icon: '✅' }], examples: ['Automatic doors', 'Elevator safety', 'Assembly lines', 'Garage doors'], companies: ['Omron', 'Keyence', 'Sick', 'Banner'], futureImpact: 'Smart sensors with AI object recognition capabilities.', color: colors.warning }
  ];

  const masteryItems = [
    { icon: '💡', title: 'Light = Photons', desc: 'Light comes in discrete energy packets, not continuous waves', color: colors.primary },
    { icon: '⚡', title: 'E = hf', desc: 'Each photon\'s energy depends only on its frequency', color: colors.accent },
    { icon: '🚧', title: 'Work Function', desc: 'Minimum energy needed to free an electron from a metal', color: colors.danger },
    { icon: '🏃', title: 'KE = hf - Φ', desc: 'Excess photon energy becomes electron kinetic energy', color: colors.success },
    { icon: '🏆', title: 'Nobel Prize 1921', desc: 'Einstein won for explaining this quantum phenomenon', color: colors.warning },
  ];

  // ============ VISUALIZATION ============
  const renderPhotoelectricLab = () => {
    const lightColor = wavelengthToColor(wavelength);
    const numPhotons = Math.floor(intensity / 12);
    const numElectrons = emissionOccurs ? numPhotons : 0;

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', maxHeight: isMobile ? '200px' : '280px' }}>
          <defs>
            {/* === PREMIUM GRADIENTS === */}

            {/* Lab background gradient */}
            <linearGradient id="photoLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium metal plate gradient with brushed steel effect */}
            <linearGradient id="photoMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="20%" stopColor="#d1d5db" />
              <stop offset="40%" stopColor="#9ca3af" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="80%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Metal plate side gradient for 3D effect */}
            <linearGradient id="photoMetalSide" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Light source housing gradient */}
            <linearGradient id="photoLightHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Light beam gradient with dynamic color */}
            <linearGradient id="photoLightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lightColor} stopOpacity="0.9" />
              <stop offset="30%" stopColor={lightColor} stopOpacity="0.6" />
              <stop offset="70%" stopColor={lightColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
            </linearGradient>

            {/* Photon core glow - radial */}
            <radialGradient id="photoPhotonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="20%" stopColor={lightColor} stopOpacity="1" />
              <stop offset="50%" stopColor={lightColor} stopOpacity="0.6" />
              <stop offset="80%" stopColor={lightColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
            </radialGradient>

            {/* Electron glow gradient - blue */}
            <radialGradient id="photoElectronGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="1" />
              <stop offset="20%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Electron trail gradient */}
            <linearGradient id="photoElectronTrail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>

            {/* Vacuum chamber gradient */}
            <linearGradient id="photoVacuumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Vacuum chamber glass effect */}
            <radialGradient id="photoVacuumGlass" cx="30%" cy="20%" r="80%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Energy bar gradient */}
            <linearGradient id="photoEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Success indicator gradient */}
            <linearGradient id="photoSuccessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Danger/warning gradient */}
            <linearGradient id="photoDangerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Panel background gradient */}
            <linearGradient id="photoPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* === PREMIUM FILTERS === */}

            {/* Light source glow filter */}
            <filter id="photoLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Photon glow filter */}
            <filter id="photoPhotonFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electron glow filter */}
            <filter id="photoElectronFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="photoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for panels */}
            <filter id="photoInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* === PATTERNS === */}

            {/* Grid pattern for lab background */}
            <pattern id="photoGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Metal texture pattern */}
            <pattern id="photoMetalTexture" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent" />
              <line x1="0" y1="0" x2="4" y2="4" stroke="#ffffff" strokeWidth="0.2" strokeOpacity="0.1" />
            </pattern>
          </defs>

          {/* Premium lab background */}
          <rect width="600" height="320" fill="url(#photoLabBg)" />
          <rect width="600" height="320" fill="url(#photoGridPattern)" />

          {/* Vacuum chamber with premium styling */}
          <g filter="url(#photoShadow)">
            <rect x="60" y="50" width="480" height="220" rx="16" fill="url(#photoVacuumGrad)" stroke="#475569" strokeWidth="2" />
            <rect x="60" y="50" width="480" height="220" rx="16" fill="url(#photoVacuumGlass)" />
            {/* Chamber rim highlight */}
            <rect x="60" y="50" width="480" height="4" rx="2" fill="#334155" opacity="0.5" />
          </g>

          {/* Light source with premium housing */}
          <g transform="translate(100, 160)" filter="url(#photoShadow)">
            {/* Housing body */}
            <rect x="-24" y="-55" width="48" height="110" rx="8" fill="url(#photoLightHousing)" stroke="#4b5563" strokeWidth="1.5" />
            {/* Housing rim */}
            <rect x="-20" y="-51" width="40" height="4" rx="2" fill="#6b7280" opacity="0.5" />
            {/* Lens aperture */}
            <circle cx="0" cy="0" r="22" fill="#1f2937" stroke="#374151" strokeWidth="1" />
            {/* Light emission glow */}
            <circle cx="0" cy="0" r="18" fill={lightColor} filter="url(#photoLightGlow)" opacity="0.95">
              <animate attributeName="r" values="16;20;16" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Light core */}
            <circle cx="0" cy="0" r="10" fill="white" opacity="0.9" />
            <circle cx="0" cy="0" r="6" fill={lightColor} />
            {/* Lens ring */}
            <circle cx="0" cy="0" r="20" fill="none" stroke="#6b7280" strokeWidth="2" opacity="0.5" />
          </g>

          {/* Light beam with gradient */}
          <rect x="130" y="140" width="250" height="40" fill="url(#photoLightGrad)" opacity={intensity / 100} />

          {/* Photon beam with premium particles */}
          <g opacity={intensity / 100}>
            {Array.from({ length: numPhotons }).map((_, i) => {
              const progress = ((timeRef.current * 50 + i * 30) % 240) / 240;
              const x = 140 + progress * 240;
              const y = 130 + i * 10 + Math.sin(progress * Math.PI * 3) * 5;
              return (
                <g key={i} filter="url(#photoPhotonFilter)">
                  {/* Photon trail */}
                  <ellipse cx={x - 8} cy={y} rx="12" ry="3" fill="url(#photoLightGrad)" opacity="0.4" />
                  {/* Outer glow */}
                  <circle cx={x} cy={y} r="8" fill="url(#photoPhotonGlow)" />
                  {/* Photon core */}
                  <circle cx={x} cy={y} r="4" fill={lightColor} />
                  <circle cx={x} cy={y} r="2" fill="white" opacity="0.8" />
                </g>
              );
            })}
          </g>

          {/* Metal plate with premium 3D effect */}
          <g transform="translate(390, 90)">
            {/* Plate shadow */}
            <rect x="4" y="4" width="30" height="140" rx="4" fill="#000000" opacity="0.3" />
            {/* Plate side (3D depth) */}
            <rect x="28" y="2" width="6" height="140" rx="2" fill="url(#photoMetalSide)" />
            {/* Main plate body */}
            <rect x="0" y="0" width="30" height="140" rx="4" fill="url(#photoMetalGrad)" stroke="#9ca3af" strokeWidth="1" />
            {/* Metal texture overlay */}
            <rect x="0" y="0" width="30" height="140" rx="4" fill="url(#photoMetalTexture)" />
            {/* Highlight edge */}
            <rect x="0" y="0" width="30" height="3" rx="2" fill="#ffffff" opacity="0.2" />
            {/* Electron sites on metal */}
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={i}>
                <circle cx="15" cy={10 + i * 13} r="5" fill="#374151" opacity="0.6" />
                <circle cx="15" cy={10 + i * 13} r="3" fill="#0ea5e9" opacity="0.3">
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </g>

          {/* Ejected electrons with premium effects */}
          {emissionOccurs && (
            <g>
              {Array.from({ length: numElectrons }).map((_, i) => {
                const baseProgress = ((timeRef.current * 40 + i * 25) % 180) / 180;
                const delay = 0.55;
                if (baseProgress < delay) return null;
                const progress = (baseProgress - delay) / (1 - delay);
                const speed = Math.sqrt(maxKE) * 0.7 + 0.3;
                const x = 430 + progress * speed * 100;
                const y = 130 + i * 10 + Math.sin(progress * Math.PI * 2) * 8;
                if (x > 530) return null;
                return (
                  <g key={`e-${i}`} filter="url(#photoElectronFilter)">
                    {/* Electron trail */}
                    <ellipse cx={x - 10} cy={y} rx="15" ry="2" fill="url(#photoElectronTrail)" />
                    {/* Outer glow */}
                    <circle cx={x} cy={y} r="10" fill="url(#photoElectronGrad)" />
                    {/* Electron body */}
                    <circle cx={x} cy={y} r="4" fill="#38bdf8" />
                    {/* Electron highlight */}
                    <circle cx={x - 1} cy={y - 1} r="2" fill="#ffffff" opacity="0.6" />
                  </g>
                );
              })}
            </g>
          )}

          {/* No emission indicator with premium styling */}
          {!emissionOccurs && (
            <g transform="translate(480, 160)">
              <rect x="-50" y="-30" width="100" height="60" rx="10" fill="url(#photoPanelGrad)" stroke="url(#photoDangerGrad)" strokeWidth="2" filter="url(#photoShadow)" />
              {/* Warning icon background */}
              <circle cx="0" cy="-8" r="10" fill="#450a0a" />
              <text x="0" y="-4" textAnchor="middle" style={{ fontSize: '12px', fill: '#ef4444' }}>!</text>
            </g>
          )}

          {/* Energy panel with premium design */}
          <g transform="translate(80, 280)">
            <rect x="-15" y="-15" width="240" height="50" rx="10" fill="url(#photoPanelGrad)" stroke="#374151" strokeWidth="1" filter="url(#photoInnerGlow)" />
            {/* Energy bar background */}
            <rect x="0" y="0" width="100" height="14" rx="4" fill="#1f2937" />
            {/* Energy bar fill */}
            <rect x="0" y="0" width={Math.min(photonEnergy * 20, 100)} height="14" rx="4" fill="url(#photoEnergyGrad)" />
            {/* Energy bar shine */}
            <rect x="0" y="0" width={Math.min(photonEnergy * 20, 100)} height="4" rx="2" fill="#ffffff" opacity="0.2" />
            {/* Work function threshold line */}
            <line x1={workFunction * 20} y1="-8" x2={workFunction * 20} y2="22" stroke="url(#photoDangerGrad)" strokeWidth="2" strokeDasharray="4,2" />
          </g>

          {/* KE indicator with premium styling */}
          {emissionOccurs && (
            <g transform="translate(480, 280)">
              <rect x="-55" y="-18" width="110" height="55" rx="10" fill="url(#photoPanelGrad)" stroke="url(#photoSuccessGrad)" strokeWidth="2" filter="url(#photoShadow)" />
              {/* Success glow effect */}
              <rect x="-50" y="-13" width="100" height="45" rx="8" fill="#10b981" opacity="0.1" />
            </g>
          )}
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ position: 'absolute', top: isMobile ? '6px' : '8px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <span style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>Photoelectric Effect Simulator</span>
        </div>

        <div style={{ position: 'absolute', top: isMobile ? '18px' : '22px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <span style={{ fontSize: typo.label, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vacuum Chamber</span>
        </div>

        {/* Light source labels */}
        <div style={{ position: 'absolute', bottom: isMobile ? '32%' : '28%', left: isMobile ? '12%' : '14%', textAlign: 'center', transform: 'translateX(-50%)' }}>
          <div style={{ fontSize: typo.small, fontWeight: 600, color: colors.textSecondary }}>Light Source</div>
          <div style={{ fontSize: typo.small, fontWeight: 700, color: wavelengthToColor(wavelength) }}>{wavelength} nm</div>
        </div>

        {/* Metal plate labels */}
        <div style={{ position: 'absolute', bottom: isMobile ? '32%' : '28%', right: isMobile ? '18%' : '20%', textAlign: 'center' }}>
          <div style={{ fontSize: typo.small, fontWeight: 600, color: colors.textSecondary }}>{metals.find(m => m.workFunction === workFunction)?.name}</div>
          <div style={{ fontSize: typo.small, fontWeight: 700, color: colors.primary }}>{'\u03A6'} = {workFunction} eV</div>
        </div>

        {/* Energy display labels */}
        <div style={{ position: 'absolute', bottom: isMobile ? '8%' : '10%', left: isMobile ? '28%' : '30%', textAlign: 'center' }}>
          <span style={{ fontSize: typo.small, fontWeight: 600, color: colors.primary }}>E = {photonEnergy.toFixed(2)} eV</span>
        </div>

        <div style={{ position: 'absolute', bottom: isMobile ? '4%' : '6%', left: isMobile ? '18%' : '20%', textAlign: 'center' }}>
          <span style={{ fontSize: typo.label, fontWeight: 600, color: colors.danger }}>{'\u03A6'} = {workFunction} eV</span>
        </div>

        {/* KE display label */}
        {emissionOccurs && (
          <div style={{ position: 'absolute', bottom: isMobile ? '8%' : '10%', right: isMobile ? '12%' : '14%', textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, fontWeight: 700, color: colors.success }}>KE_max</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 800, color: colors.success }}>{maxKE.toFixed(2)} eV</div>
          </div>
        )}

        {/* No emission label */}
        {!emissionOccurs && (
          <div style={{ position: 'absolute', top: '45%', right: isMobile ? '8%' : '10%', textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, fontWeight: 700, color: colors.danger }}>NO EMISSION</div>
            <div style={{ fontSize: typo.label, color: '#fca5a5' }}>E &lt; Work Function</div>
          </div>
        )}
      </div>
    );
  };

  // ============ PHASE RENDERS ============

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '20px', marginBottom: '20px' }}>
          <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '50%' }} />
          <span style={{ fontSize: typo.small, fontWeight: 600, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantum Physics</span>
        </div>

        {/* Icon */}
        <div style={{ width: isMobile ? '80px' : '100px', height: isMobile ? '80px' : '100px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: `0 8px 32px ${colors.primary}40` }}>
          <span style={{ fontSize: isMobile ? '40px' : '50px' }}>💡</span>
        </div>

        {/* Nobel badge */}
        <div style={{ padding: '10px 20px', borderRadius: '20px', background: `${colors.warning}15`, border: `1px solid ${colors.warning}40`, marginBottom: '16px' }}>
          <span style={{ fontSize: typo.small, fontWeight: 700, color: colors.warning }}>🏆 Nobel Prize in Physics 1921</span>
        </div>

        <h1 style={{ fontSize: typo.title, fontWeight: 800, marginBottom: '12px', background: `linear-gradient(135deg, ${colors.textPrimary} 0%, ${colors.primary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Photoelectric Effect
        </h1>

        <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, marginBottom: '8px', maxWidth: '400px' }}>
          Einstein called it <span style={{ color: colors.primary, fontWeight: 700 }}>"the most revolutionary discovery in physics"</span>
        </p>

        <p style={{ fontSize: typo.body, color: colors.textMuted, marginBottom: '32px', maxWidth: '350px' }}>
          Discover why light knocking electrons off metal proved that light is made of particles...
        </p>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '400px', width: '100%', marginBottom: '32px' }}>
          {[{ icon: '🔬', label: 'Light Lab' }, { icon: '⚡', label: 'E = hf' }, { icon: '🏆', label: 'Nobel Discovery' }].map((item, i) => (
            <div key={i} style={{ padding: '16px 12px', borderRadius: '16px', background: colors.bgCardLight, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: typo.small, fontWeight: 600, color: colors.textSecondary }}>{item.label}</div>
            </div>
          ))}
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
          onTouchEnd={(e) => { e.preventDefault(); goToPhase('predict'); }}
          style={{ padding: '16px 40px', borderRadius: '16px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: typo.bodyLarge, fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40`, display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          Begin Experiment <span>→</span>
        </button>

        <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '16px' }}>~5 minutes • Interactive quantum physics lab</p>
      </div>,
      undefined
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'brighter', label: 'Brighter light = faster electrons', desc: 'More light energy = more electron energy', icon: '☀️', tag: 'Classical' },
      { id: 'color', label: 'Light color determines speed', desc: 'Frequency matters more than brightness', icon: '🌈', tag: 'Quantum' },
      { id: 'both', label: 'Both brightness and color', desc: 'Energy accumulates from both factors', icon: '⚖️', tag: 'Combined' },
    ];

    const handlePredictionSelect = (optId: string, optLabel: string) => {
      if (prediction === optId) return; // Already selected
      playSound('click');
      setPrediction(optId);
      emitGameEvent('prediction_made', { prediction: optId, predictionLabel: optLabel });
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 2 • Make Your Prediction', 'What makes electrons fly out faster?', 'When light hits a metal surface, electrons can be knocked free. What determines how fast they fly out?')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginTop: '20px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePredictionSelect(opt.id, opt.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: typo.cardPadding, borderRadius: '16px',
                border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                background: prediction === opt.id ? `${colors.primary}15` : colors.bgCard,
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: prediction === opt.id ? colors.primary : colors.bgCardLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {opt.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: typo.body, fontWeight: 700, color: prediction === opt.id ? colors.primary : colors.textPrimary }}>{opt.label}</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: `${colors.accent}20`, color: colors.accent, fontWeight: 600 }}>{opt.tag}</span>
                </div>
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>{opt.desc}</span>
              </div>
              {prediction === opt.id && <span style={{ color: colors.primary, fontSize: '18px' }}>✓</span>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: typo.cardPadding, borderRadius: '12px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
          <p style={{ fontSize: typo.small, color: colors.textSecondary }}>💡 <strong>Hint:</strong> Think about what gives a photon its energy...</p>
        </div>
      </div>,
      renderBottomBar(true, !!prediction, 'Test Your Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
        {/* Visualization */}
        <div style={{ flex: isMobile ? 'none' : 1, height: isMobile ? '220px' : 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderPhotoelectricLab()}
        </div>

        {/* Controls */}
        <div style={{ flex: isMobile ? 1 : 'none', width: isMobile ? '100%' : '280px', padding: typo.pagePadding, background: `${colors.bgCard}80`, borderTop: isMobile ? `1px solid ${colors.border}` : 'none', borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`, overflowY: 'auto' }}>
          {renderSectionHeader('Step 3 • Experiment', 'Adjust the controls')}

          {/* Wavelength */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: typo.label, fontWeight: 700, color: colors.primary, marginBottom: '8px', textTransform: 'uppercase' }}>Wavelength (λ)</label>
            <input
              type="range" min="200" max="700" step="1" value={wavelength}
              onInput={(e) => { setWavelength(parseInt((e.target as HTMLInputElement).value)); setHasExperimented(true); }}
              onChange={(e) => { setWavelength(parseInt(e.target.value)); setHasExperimented(true); }}
              style={{
                width: '100%',
                accentColor: colors.primary,
                cursor: 'pointer',
                height: '8px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, ${colors.accent}, ${colors.primary}, ${colors.warning}, ${colors.danger})`,
                borderRadius: '4px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.small, color: colors.textMuted, marginTop: '4px' }}>
              <span>UV</span>
              <span style={{ fontWeight: 700, color: wavelengthToColor(wavelength) }}>{wavelength} nm</span>
              <span>Red</span>
            </div>
          </div>

          {/* Metal */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Metal Type</label>
            <select
              value={workFunction}
              onChange={(e) => { setWorkFunction(parseFloat(e.target.value)); setHasExperimented(true); }}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgCardLight, color: colors.textPrimary, fontSize: typo.body }}
            >
              {metals.map(m => (
                <option key={m.name} value={m.workFunction}>{m.name} (Φ = {m.workFunction} eV)</option>
              ))}
            </select>
          </div>

          {/* Results */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>Results</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Photon Energy:</span>
                <span style={{ fontSize: typo.small, fontWeight: 700, color: colors.primary }}>{photonEnergy.toFixed(2)} eV</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Work Function:</span>
                <span style={{ fontSize: typo.small, fontWeight: 700, color: colors.danger }}>{workFunction} eV</span>
              </div>
              <div style={{ paddingTop: '8px', marginTop: '8px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Electron KE:</span>
                <span style={{ fontSize: typo.small, fontWeight: 700, color: emissionOccurs ? colors.success : colors.danger }}>
                  {emissionOccurs ? `${maxKE.toFixed(2)} eV` : 'No emission'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
            <p style={{ fontSize: typo.small, color: colors.textSecondary }}>💡 Try finding the threshold wavelength where electrons start/stop being emitted!</p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, hasExperimented, 'See What Happened')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const concepts = [
      { icon: '⚡', title: 'Photon Energy = hf', desc: 'Each photon carries energy proportional to its frequency. Higher frequency = more energy.', color: colors.primary },
      { icon: '🚧', title: 'Work Function Barrier', desc: 'Electrons are bound with minimum energy Φ. Photons must have E ≥ Φ to free electrons.', color: colors.danger },
      { icon: '🏃', title: 'Kinetic Energy = E - Φ', desc: 'Extra energy beyond the work function becomes kinetic energy of the ejected electron.', color: colors.success },
    ];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 4 • What You Discovered', "Einstein's Key Insight")}

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap }}>
          {concepts.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: typo.cardPadding, borderRadius: '16px', background: `${c.color}10`, border: `1px solid ${c.color}30` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{c.icon}</div>
              <div>
                <p style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: '4px' }}>{c.title}</p>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Einstein's equation */}
        <div style={{ marginTop: '20px', padding: '24px', borderRadius: '20px', background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}10 100%)`, border: `1px solid ${colors.primary}40`, textAlign: 'center' }}>
          <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.primary, marginBottom: '12px', textTransform: 'uppercase' }}>Einstein's Photoelectric Equation</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: colors.textPrimary, fontFamily: 'serif' }}>KE<sub>max</sub> = hf - Φ</p>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, marginTop: '12px' }}>h = Planck's constant • f = frequency • Φ = work function</p>
        </div>
      </div>,
      renderBottomBar(true, true, 'The Paradox')
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'faster', label: 'Brighter light = faster electrons', desc: 'More photons = more total energy delivered', icon: '⬆️' },
      { id: 'same', label: "Brightness doesn't change speed", desc: 'Each photon has fixed energy E = hf', icon: '➡️' },
      { id: 'slower', label: 'Brighter light = slower electrons', desc: 'Energy gets divided among more electrons', icon: '⬇️' },
    ];

    const handleTwistPredictionSelect = (optId: string, optLabel: string) => {
      if (twistPrediction === optId) return; // Already selected
      playSound('click');
      setTwistPrediction(optId);
      emitGameEvent('prediction_made', { prediction: optId, predictionLabel: optLabel, twist: true });
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 5 • The Paradox', 'Classical Physics Got It Wrong!', 'Before Einstein, physicists expected brighter light would make electrons fly faster. What do YOU predict?')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginTop: '20px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleTwistPredictionSelect(opt.id, opt.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: typo.cardPadding, borderRadius: '16px',
                border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                background: twistPrediction === opt.id ? `${colors.accent}15` : colors.bgCard,
                textAlign: 'left', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: twistPrediction === opt.id ? colors.accent : colors.bgCardLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: typo.body, fontWeight: 700, color: twistPrediction === opt.id ? colors.accent : colors.textPrimary }}>{opt.label}</span>
                <p style={{ fontSize: typo.small, color: colors.textSecondary }}>{opt.desc}</p>
              </div>
              {twistPrediction === opt.id && <span style={{ color: colors.accent, fontSize: '18px' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>,
      renderBottomBar(true, !!twistPrediction, 'Test It!', undefined, colors.accent)
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
        <div style={{ flex: isMobile ? 'none' : 1, height: isMobile ? '200px' : 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderPhotoelectricLab()}
        </div>

        <div style={{ flex: isMobile ? 1 : 'none', width: isMobile ? '100%' : '280px', padding: typo.pagePadding, background: `${colors.bgCard}80`, borderTop: isMobile ? `1px solid ${colors.border}` : 'none', borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`, overflowY: 'auto' }}>
          <p style={{ fontSize: typo.body, fontWeight: 700, color: colors.accent, marginBottom: '16px' }}>Intensity vs Frequency Test</p>

          {/* Intensity */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Intensity (# photons)</label>
            <input
              type="range" min="20" max="100" value={intensity}
              onChange={(e) => { setIntensity(parseInt(e.target.value)); setHasTestedIntensity(true); }}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '4px' }}>{intensity}% → {emissionOccurs ? Math.floor(intensity / 12) : 0} electrons/cycle</p>
          </div>

          {/* Wavelength */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: typo.label, fontWeight: 700, color: colors.primary, marginBottom: '8px', textTransform: 'uppercase' }}>Wavelength (photon energy)</label>
            <input
              type="range" min="200" max="700" value={wavelength}
              onChange={(e) => { setWavelength(parseInt(e.target.value)); setHasTestedIntensity(true); }}
              style={{ width: '100%', accentColor: colors.primary }}
            />
            <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '4px' }}>{wavelength}nm → {photonEnergy.toFixed(2)} eV/photon</p>
          </div>

          {/* Key observation */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: typo.small, fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>Key Observation:</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '4px' }}>• Electron count: <span style={{ color: colors.accent, fontWeight: 700 }}>{emissionOccurs ? Math.floor(intensity / 12) : 0}</span> (from intensity)</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary }}>• Electron speed: <span style={{ color: colors.primary, fontWeight: 700 }}>{maxKE.toFixed(2)} eV</span> (from wavelength)</p>
            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: `${colors.success}15`, border: `1px solid ${colors.success}40` }}>
              <p style={{ fontSize: typo.small, color: colors.success, fontWeight: 600 }}>✓ Speed only depends on wavelength—not intensity!</p>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, hasTestedIntensity, 'Understand Why', undefined, colors.accent)
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 7 • The Quantum Truth', 'Light Comes in Packets!')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap }}>
          {/* Classical wrong */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: `${colors.danger}10`, border: `1px solid ${colors.danger}40` }}>
            <p style={{ fontWeight: 700, color: colors.danger, marginBottom: '8px' }}>❌ Classical Prediction (WRONG)</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>
              "Brighter light delivers more total energy, so electrons should fly faster."<br /><br />
              This assumes light energy accumulates continuously like a water wave.
            </p>
          </div>

          {/* Quantum correct */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: `${colors.success}10`, border: `1px solid ${colors.success}40` }}>
            <p style={{ fontWeight: 700, color: colors.success, marginBottom: '8px' }}>✓ Quantum Reality (CORRECT)</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>
              Light comes in <strong style={{ color: colors.textPrimary }}>discrete packets (photons)</strong>, each with energy E = hf.<br /><br />
              More photons = more electrons, but each electron's energy depends only on photon frequency!
            </p>
          </div>

          {/* Nobel Prize */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}10 100%)`, border: `1px solid ${colors.primary}40` }}>
            <p style={{ fontWeight: 700, color: colors.primary, marginBottom: '8px' }}>🏆 Einstein's Nobel Prize (1921)</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>
              This explanation proved that light has <strong style={{ color: colors.textPrimary }}>particle-like properties</strong>. Light isn't just a wave—it's also made of discrete quanta called photons.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, true, 'Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const allComplete = completedApps.every(c => c);
    const currentAppComplete = completedApps[activeApp];
    const isLastApp = activeApp === applications.length - 1;

    // Handle app tab click with proper event emission
    const handleAppTabClick = (index: number) => {
      if (index === activeApp) return; // Already on this app

      // Only allow clicking on completed apps or the next unlocked one
      const canAccess = index === 0 || completedApps[index - 1] || completedApps[index];
      if (!canAccess) return;

      setActiveApp(index);
      const targetApp = applications[index];

      // Override screenDescription and coachMessage with app-specific info
      const appScreenDescription = `REAL WORLD APPLICATION ${index + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
      const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

      emitGameEvent('app_changed', {
        appNumber: index + 1,
        totalApps: 4,
        appTitle: targetApp.title,
        appTagline: targetApp.tagline,
        appConnection: targetApp.connection,
        screenDescription: appScreenDescription,
        coachMessage: appCoachMessage,
        message: `NOW viewing Real-World Application ${index + 1}/4: ${targetApp.title}. ${targetApp.tagline}. Physics connection: ${targetApp.connection}`
      });
    };

    // Handle continue to next app
    const handleContinueToNextApp = () => {
      if (activeApp < applications.length - 1) {
        const nextIndex = activeApp + 1;
        setActiveApp(nextIndex);
        const targetApp = applications[nextIndex];

        // Override screenDescription and coachMessage with app-specific info
        const appScreenDescription = `REAL WORLD APPLICATION ${nextIndex + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
        const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

        emitGameEvent('app_changed', {
          appNumber: nextIndex + 1,
          totalApps: 4,
          appTitle: targetApp.title,
          appTagline: targetApp.tagline,
          appConnection: targetApp.connection,
          screenDescription: appScreenDescription,
          coachMessage: appCoachMessage,
          message: `NOW viewing Real-World Application ${nextIndex + 1}/4: ${targetApp.title}. ${targetApp.tagline}. Physics connection: ${targetApp.connection}`
        });
      }
    };

    return renderPremiumWrapper(
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px', overflowX: 'auto', background: `${colors.bgCard}80`, borderBottom: `1px solid ${colors.border}` }}>
          {applications.map((a, i) => {
            const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];
            const isActive = i === activeApp;
            return (
              <button
                key={i}
                onClick={() => !isLocked && handleAppTabClick(i)}
                disabled={isLocked}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: 'none',
                  background: isActive ? app.color : completedApps[i] ? `${colors.success}20` : colors.bgCardLight,
                  color: isActive ? 'white' : isLocked ? colors.textMuted : colors.textSecondary,
                  fontWeight: 600, fontSize: typo.small,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isLocked ? 0.5 : 1
                }}
              >
                {isLocked ? '🔒' : a.icon} {a.title.split(' ')[0]}
                {completedApps[i] && !isActive && <span style={{ marginLeft: '4px', color: colors.success }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: typo.pagePadding }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{app.icon}</div>
            <div>
              <h3 style={{ fontSize: typo.heading, fontWeight: 800, margin: 0 }}>{app.title}</h3>
              <p style={{ fontSize: typo.small, fontWeight: 600, color: app.color }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6, marginBottom: '16px' }}>{app.description}</p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {app.stats.map((s, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: typo.body, fontWeight: 700, color: app.color }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: colors.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ padding: typo.cardPadding, borderRadius: '16px', background: colors.bgCardLight, border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
            <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Connection to Photoelectric Effect</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>{app.connection}</p>
          </div>

          {/* Continue button at end of content - handles app progression */}
          <button
            onClick={() => {
              // Mark current app as complete
              if (!currentAppComplete) {
                const newCompleted = [...completedApps];
                newCompleted[activeApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');
                emitGameEvent('app_completed', {
                  appNumber: activeApp + 1,
                  appTitle: app.title,
                  message: `Completed application ${activeApp + 1}/4: ${app.title}`
                });
              }
              // If not last app, continue to next; otherwise go to test
              if (!isLastApp) {
                handleContinueToNextApp();
              } else {
                goToPhase('test');
              }
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              fontWeight: 700,
              fontSize: typo.body,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colors.primary}40`,
              marginTop: '16px'
            }}
          >
            {isLastApp ? 'Take the Test →' : `Continue to ${applications[activeApp + 1]?.title.split(' ')[0]} →`}
          </button>
        </div>
      </div>,
      'Step 8 of 10 • Transfer',
      'Real-World Applications',
      `See how the photoelectric effect powers modern technology`,
      null,
      renderBottomBar(true, false, 'Scroll to Continue')
    );
  }


  // TEST PHASE
  if (phase === 'test') {
    const q = testQuestions[currentQuestion];
    const answered = selectedAnswer !== null;

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: typo.small, fontWeight: 700, color: colors.primary }}>Question {currentQuestion + 1} of {testQuestions.length}</p>
          <div style={{ padding: '6px 12px', borderRadius: '12px', background: `${colors.success}15`, border: `1px solid ${colors.success}40` }}>
            <span style={{ fontSize: typo.small, fontWeight: 700, color: colors.success }}>Score: {testScore}/{testQuestions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          {testQuestions.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i === currentQuestion ? colors.primary : i < currentQuestion ? colors.success : colors.border }} />
          ))}
        </div>

        {/* Scenario */}
        <div style={{ padding: '12px 16px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, marginBottom: '16px' }}>
          <p style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600 }}>📍 {q.scenario}</p>
        </div>

        {/* Question */}
        <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, lineHeight: 1.4, marginBottom: '20px' }}>{q.question}</h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt, i) => {
            const isCorrect = opt.correct;
            const isSelected = i === selectedAnswer;
            let bg = colors.bgCard;
            let border = colors.border;

            if (answered) {
              if (isCorrect) { bg = `${colors.success}15`; border = colors.success; }
              else if (isSelected) { bg = `${colors.danger}15`; border = colors.danger; }
            }

            const handleAnswerSelect = () => {
              if (answered) return;
              playSound('click');
              setSelectedAnswer(i);
              setShowExplanation(true);
              if (isCorrect) setTestScore(s => s + 1);
              const newAnswers = [...testAnswers];
              newAnswers[currentQuestion] = i;
              setTestAnswers(newAnswers);
              emitGameEvent(isCorrect ? 'correct_answer' : 'incorrect_answer', { questionNumber: currentQuestion + 1, answer: opt.label, isCorrect });
            };

            return (
              <button
                key={i}
                onClick={handleAnswerSelect}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px', borderRadius: '12px',
                  border: `2px solid ${border}`, background: bg, textAlign: 'left',
                  cursor: answered ? 'default' : 'pointer',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: answered && isCorrect ? colors.success : colors.bgCardLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typo.small, fontWeight: 700, color: answered && isCorrect ? 'white' : colors.textSecondary, flexShrink: 0 }}>
                  {answered && isCorrect ? '✓' : String.fromCharCode(65 + i)}
                </div>
                <span style={{ fontSize: typo.body, color: colors.textPrimary, lineHeight: 1.4 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div style={{ marginTop: '20px', padding: typo.cardPadding, borderRadius: '16px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}40` }}>
            <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.primary, marginBottom: '8px', textTransform: 'uppercase' }}>Explanation</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>{q.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <button
            onClick={() => {
              playSound('transition');
              if (currentQuestion === testQuestions.length - 1) {
                emitGameEvent('game_completed', { score: testScore, maxScore: testQuestions.length, percentage: Math.round((testScore / testQuestions.length) * 100) });
                goToPhase('mastery');
              } else {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
                emitGameEvent('question_changed', { questionNumber: currentQuestion + 2 });
              }
            }}
            style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontWeight: 700, fontSize: typo.body, cursor: 'pointer' }}
          >
            {currentQuestion === testQuestions.length - 1 ? 'See Results →' : 'Next Question →'}
          </button>
        )}
      </div>,
      undefined
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const isPassing = percentage >= 70;

    // Handle return to dashboard - emit event for parent to handle
    const handleReturnToDashboard = () => {
      emitGameEvent('button_clicked', {
        action: 'return_to_dashboard',
        message: 'User requested to return to dashboard'
      });
      // Dispatch custom event for App.tsx to handle
      window.dispatchEvent(new CustomEvent('returnToDashboard'));
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        {/* Trophy */}
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: isPassing ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: isPassing ? `0 8px 32px ${colors.primary}40` : 'none' }}>
          <span style={{ fontSize: '50px' }}>{isPassing ? '🏆' : '📚'}</span>
        </div>

        <h1 style={{ fontSize: typo.title, fontWeight: 800, marginBottom: '8px' }}>
          {isPassing ? 'Photoelectric Master!' : 'Keep Practicing!'}
        </h1>

        <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, marginBottom: '8px' }}>
          You scored <span style={{ fontWeight: 700, color: isPassing ? colors.success : colors.danger }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <p style={{ fontSize: typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          {isPassing ? 'Congratulations! You\'ve mastered the photoelectric effect!' : 'You need 70% to pass. Review and try again!'}
        </p>

        {/* Key learnings - only show with checkmarks if passing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '400px', marginBottom: '32px' }}>
          {masteryItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: `${item.color}10`, border: `1px solid ${item.color}30` }}>
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontWeight: 700, color: colors.textPrimary, fontSize: typo.body }}>{item.title}</p>
                <p style={{ fontSize: typo.small, color: colors.textSecondary }}>{item.desc}</p>
              </div>
              {isPassing && <span style={{ color: colors.success }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
          {/* Primary action */}
          {isPassing ? (
            <button
              onClick={handleReturnToDashboard}
              style={{
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white',
                fontWeight: 700,
                fontSize: typo.body,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              🏠 Return to Dashboard
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentQuestion(0);
                setTestScore(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
                setTestAnswers(Array(10).fill(null));
                goToPhase('test');
              }}
              style={{
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white',
                fontWeight: 700,
                fontSize: typo.body,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              ↺ Retake Test
            </button>
          )}

          {/* Secondary action - Review Lesson */}
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: colors.bgCardLight,
              color: colors.textSecondary,
              fontWeight: 700,
              fontSize: typo.body,
              cursor: 'pointer'
            }}
          >
            🔬 Review Lesson
          </button>

          {/* Tertiary action - Return to Dashboard (if passing, it's primary; if not, show it here) */}
          {!isPassing && (
            <button
              onClick={handleReturnToDashboard}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: colors.textMuted,
                fontWeight: 600,
                fontSize: typo.small,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Return to Dashboard
            </button>
          )}
        </div>

        {/* Quote */}
        <div style={{ marginTop: '32px', padding: '16px 24px', borderRadius: '16px', background: colors.bgCardLight, maxWidth: '400px' }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, fontStyle: 'italic' }}>"The photoelectric effect solved the mystery of light."</p>
          <p style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600, marginTop: '8px' }}>— Albert Einstein</p>
        </div>
      </div>,
      undefined
    );
  }

  return null;
};

export default PhotoelectricEffectRenderer;
