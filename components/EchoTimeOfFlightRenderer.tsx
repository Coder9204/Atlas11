'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// ECHO TIME OF FLIGHT RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches how sound travels and how we can use echoes to measure distance
// Distance = (Speed of Sound × Time) / 2
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    sound: '#22d3ee',
    echo: '#a78bfa',
    background: {
      primary: '#0a0f1a',
      secondary: '#111827',
      tertiary: '#1f2937',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#f0f9ff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      secondary: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      warm: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

interface SoundWave {
  id: number;
  x: number;
  radius: number;
  returning: boolean;
  opacity: number;
}

interface EchoTimeOfFlightRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function EchoTimeOfFlightRenderer({ onGameEvent, gamePhase, onPhaseComplete }: EchoTimeOfFlightRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Echo simulation
  const [wallDistance, setWallDistance] = useState(170); // meters
  const [soundWaves, setSoundWaves] = useState<SoundWave[]>([]);
  const [hasSentSound, setHasSentSound] = useState(false);
  const [echoReceived, setEchoReceived] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const SPEED_OF_SOUND = 343; // m/s

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Different media (water)
  const [medium, setMedium] = useState<'air' | 'water'>('air');
  const [twistWaves, setTwistWaves] = useState<SoundWave[]>([]);
  const [twistSent, setTwistSent] = useState(false);
  const [twistTime, setTwistTime] = useState<number | null>(null);
  const twistRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "A hiker shouts toward a cliff face and hears the echo 2 seconds later. The speed of sound in air is approximately 340 m/s.",
      question: "How far away is the cliff from the hiker?",
      options: [
        { id: 'a', label: "680 meters - the sound travels 340 m/s for 2 seconds" },
        { id: 'b', label: "340 meters - the sound travels there and back, so we divide by 2", correct: true },
        { id: 'c', label: "170 meters - we need to account for sound slowing down" },
        { id: 'd', label: "1360 meters - sound speeds up on the return trip" }
      ],
      explanation: "The sound travels to the cliff AND back in 2 seconds. Total distance = 340 m/s x 2s = 680m. Since this is a round trip, the one-way distance is 680/2 = 340 meters. The formula is: Distance = (Speed x Time) / 2."
    },
    {
      scenario: "A fishing boat uses sonar to locate a school of fish. The sonar pulse takes 0.4 seconds to return. Sound travels at 1500 m/s in seawater.",
      question: "At what depth are the fish swimming?",
      options: [
        { id: 'a', label: "600 meters" },
        { id: 'b', label: "300 meters", correct: true },
        { id: 'c', label: "150 meters" },
        { id: 'd', label: "1500 meters" }
      ],
      explanation: "Using the echo time-of-flight formula: Distance = (Speed x Time) / 2 = (1500 m/s x 0.4s) / 2 = 600/2 = 300 meters. The division by 2 accounts for the sound traveling down to the fish and back up to the boat."
    },
    {
      scenario: "A bat hunting at night sends out ultrasonic clicks to detect prey. It hears an echo from a moth 0.01 seconds after making the click.",
      question: "How far away is the moth? (Sound speed in air = 340 m/s)",
      options: [
        { id: 'a', label: "3.4 meters" },
        { id: 'b', label: "1.7 meters", correct: true },
        { id: 'c', label: "0.85 meters" },
        { id: 'd', label: "6.8 meters" }
      ],
      explanation: "Distance = (Speed x Time) / 2 = (340 m/s x 0.01s) / 2 = 3.4/2 = 1.7 meters. Bats can process these incredibly fast echoes to navigate and hunt in complete darkness with remarkable precision."
    },
    {
      scenario: "A submarine detects another vessel using sonar. The captain notices the echo time is much shorter than it would be if they were using radar in air.",
      question: "Why does sound-based sonar work better than radar for underwater detection?",
      options: [
        { id: 'a', label: "Radar signals are too weak underwater" },
        { id: 'b', label: "Sound travels well through water while electromagnetic waves are heavily absorbed", correct: true },
        { id: 'c', label: "Sound travels slower underwater, making it more accurate" },
        { id: 'd', label: "Submarines cannot generate radar signals" }
      ],
      explanation: "Water is an excellent conductor of sound (1500 m/s, about 4x faster than air) but heavily absorbs electromagnetic radiation like radar. This is why submarines use sonar (sound) for detection while aircraft use radar (radio waves) in air."
    },
    {
      scenario: "An ultrasound technician is imaging a patient's kidney. The ultrasound pulse takes 0.00013 seconds (130 microseconds) to return from the kidney. Sound in body tissue travels at approximately 1540 m/s.",
      question: "How deep inside the body is the kidney located?",
      options: [
        { id: 'a', label: "20 centimeters" },
        { id: 'b', label: "10 centimeters", correct: true },
        { id: 'c', label: "5 centimeters" },
        { id: 'd', label: "40 centimeters" }
      ],
      explanation: "Distance = (Speed x Time) / 2 = (1540 m/s x 0.00013s) / 2 = 0.2002/2 = 0.1001 meters = about 10 centimeters. Medical ultrasound uses the same echo principle as sonar but with much higher frequencies for detailed images."
    },
    {
      scenario: "A geologist uses seismic equipment to study rock layers underground. She creates a small explosion and detects the echo 4 seconds later. Sound travels through this rock at 5000 m/s.",
      question: "How deep is the rock layer boundary that reflected the seismic wave?",
      options: [
        { id: 'a', label: "20,000 meters" },
        { id: 'b', label: "10,000 meters", correct: true },
        { id: 'c', label: "5,000 meters" },
        { id: 'd', label: "2,500 meters" }
      ],
      explanation: "Distance = (Speed x Time) / 2 = (5000 m/s x 4s) / 2 = 20,000/2 = 10,000 meters (10 km). Seismic surveys use this principle to map underground structures, including finding oil and gas deposits."
    },
    {
      scenario: "Dolphins use echolocation to navigate murky waters where visibility is near zero. A dolphin clicks and receives an echo in 0.002 seconds.",
      question: "How far away is the object the dolphin detected? (Sound in water = 1500 m/s)",
      options: [
        { id: 'a', label: "3 meters" },
        { id: 'b', label: "1.5 meters", correct: true },
        { id: 'c', label: "0.75 meters" },
        { id: 'd', label: "6 meters" }
      ],
      explanation: "Distance = (Speed x Time) / 2 = (1500 m/s x 0.002s) / 2 = 3/2 = 1.5 meters. Dolphins can build detailed 'sound pictures' of their environment using these rapid echo calculations, detecting fish, obstacles, and even the texture of objects."
    },
    {
      scenario: "A parking sensor in a car beeps faster as you approach a wall. The sensor emits ultrasonic pulses and measures the return time.",
      question: "If the echo time decreases from 0.006 seconds to 0.002 seconds, how has the distance to the wall changed?",
      options: [
        { id: 'a', label: "The car moved from about 1m to about 0.33m from the wall", correct: true },
        { id: 'b', label: "The car moved from about 2m to about 0.67m from the wall" },
        { id: 'c', label: "The car is now twice as close to the wall" },
        { id: 'd', label: "The distance didn't change, only the beep frequency" }
      ],
      explanation: "At 0.006s: Distance = (340 x 0.006) / 2 = 1.02m. At 0.002s: Distance = (340 x 0.002) / 2 = 0.34m. The echo time is directly proportional to distance, so as you get closer, the echo returns faster, and the sensor beeps more frequently to warn you."
    },
    {
      scenario: "Scientists want to measure the distance to the Moon. They consider using sound but ultimately choose to bounce laser pulses off reflectors left by astronauts.",
      question: "Why can't scientists use sound echoes to measure the distance to the Moon?",
      options: [
        { id: 'a', label: "Sound would take too long to reach the Moon" },
        { id: 'b', label: "Sound requires a medium to travel through, and space is a vacuum", correct: true },
        { id: 'c', label: "The Moon absorbs all sound waves" },
        { id: 'd', label: "Sound echoes only work for distances under 1000 km" }
      ],
      explanation: "Sound is a mechanical wave that requires molecules to propagate - it travels through collisions between particles. Space is a vacuum with virtually no molecules, so sound cannot travel through it. Light (electromagnetic waves) can travel through vacuum, which is why laser ranging works."
    },
    {
      scenario: "A researcher is comparing sonar systems for a deep-sea exploration vehicle. She tests systems using different sound frequencies - some very high (ultrasonic) and some lower.",
      question: "What is the trade-off between using high-frequency versus low-frequency sonar?",
      options: [
        { id: 'a', label: "High frequency travels farther but gives less detail" },
        { id: 'b', label: "High frequency gives more detail but is absorbed faster, limiting range", correct: true },
        { id: 'c', label: "Low frequency is better in all situations" },
        { id: 'd', label: "Frequency doesn't affect sonar performance" }
      ],
      explanation: "Higher frequency sound waves have shorter wavelengths, allowing them to detect smaller objects and provide finer detail (better resolution). However, high frequencies are absorbed more quickly by water, limiting their range. Low frequencies travel farther but with less detail. This is why bats use high-frequency ultrasound for precise insect detection at short range."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
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

  // Sync with external phase
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Sound effect
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
    } catch { /* Audio not supported */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Simple navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    // Reset state for play phases
    if (newPhase === 'play') {
      setSoundWaves([]);
      setHasSentSound(false);
      setEchoReceived(false);
      setElapsedTime(0);
      setTotalTime(null);
    }
    if (newPhase === 'twist_play') {
      setTwistWaves([]);
      setTwistSent(false);
      setTwistTime(null);
    }
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Echo animation
  useEffect(() => {
    if (phase === 'play' && hasSentSound && !echoReceived) {
      const startTime = Date.now();
      const totalDistance = wallDistance * 2;
      const expectedTime = totalDistance / SPEED_OF_SOUND;

      const animate = () => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        setElapsedTime(elapsed);

        // Update sound wave position
        const distanceTraveled = elapsed * SPEED_OF_SOUND;
        const normalizedDistance = distanceTraveled / totalDistance;

        setSoundWaves([{
          id: 1,
          x: normalizedDistance <= 0.5
            ? 50 + (normalizedDistance * 2) * (wallDistance / 4) // Going out
            : 50 + ((1 - normalizedDistance) * 2) * (wallDistance / 4), // Coming back
          radius: 20 + normalizedDistance * 30,
          returning: normalizedDistance > 0.5,
          opacity: 1 - normalizedDistance * 0.5,
        }]);

        if (elapsed < expectedTime) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setEchoReceived(true);
          setTotalTime(expectedTime);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, hasSentSound, echoReceived, wallDistance]);

  // Twist animation - Different media
  useEffect(() => {
    if (phase === 'twist_play' && twistSent && twistTime === null) {
      const speed = medium === 'air' ? 343 : 1480; // m/s
      const distance = 100; // meters
      const startTime = Date.now();
      const expectedTime = (distance * 2) / speed;

      const animate = () => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;

        const normalizedDistance = elapsed / expectedTime;

        setTwistWaves([{
          id: 1,
          x: normalizedDistance <= 0.5
            ? 50 + (normalizedDistance * 2) * 150
            : 50 + ((1 - normalizedDistance) * 2) * 150,
          radius: 15 + normalizedDistance * 25,
          returning: normalizedDistance > 0.5,
          opacity: 1 - normalizedDistance * 0.3,
        }]);

        if (elapsed < expectedTime) {
          twistRef.current = requestAnimationFrame(animate);
        } else {
          setTwistTime(expectedTime);
        }
      };

      twistRef.current = requestAnimationFrame(animate);

      return () => {
        if (twistRef.current) cancelAnimationFrame(twistRef.current);
      };
    }
  }, [phase, twistSent, twistTime, medium]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistRef.current) cancelAnimationFrame(twistRef.current);
    };
  }, []);

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
      zIndex: 10,
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: `linear-gradient(135deg, ${premiumDesign.colors.success} 0%, #059669 100%)`,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.success),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.secondary,
          fontWeight: 400,
          lineHeight: '1.5',
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
          <span>{phase.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.primary,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Real-world applications data for Echo Time of Flight
  const realWorldApps = [
    {
      icon: '🚢',
      title: 'Sonar Systems',
      short: 'Underwater navigation and detection',
      tagline: 'Seeing Through Sound in the Deep',
      description: 'Sonar (SOund NAvigation and Ranging) uses acoustic pulses to detect objects underwater where light cannot penetrate. Submarines, ships, and marine researchers rely on this technology to navigate, map the ocean floor, and locate objects in the murky depths.',
      connection: 'Just like your echo experiment measures distance using sound travel time, sonar sends out acoustic pings and measures the time for echoes to return. The formula Distance = (Speed × Time) / 2 is identical - sonar just uses sound in water (~1500 m/s) instead of air!',
      howItWorks: 'A transducer converts electrical signals into sound waves (typically 1-500 kHz). These waves propagate through water, reflect off objects or the seafloor, and return as echoes. The transducer converts echoes back to electrical signals, and processors calculate distance from the round-trip time.',
      stats: [
        { value: '1500 m/s', label: 'Sound speed in water', icon: '🌊' },
        { value: '11 km', label: 'Maximum detection depth', icon: '📏' },
        { value: '0.1 m', label: 'Resolution achievable', icon: '🎯' }
      ],
      examples: [
        'Naval submarines use passive sonar to detect enemy vessels without revealing their position',
        'Fishing boats locate schools of fish using commercial fish finders',
        'Oceanographers map underwater terrain and discover shipwrecks on the seafloor',
        'Marine biologists track whale migrations using acoustic monitoring arrays'
      ],
      companies: ['Raytheon', 'Kongsberg', 'Thales', 'Garmin', 'Furuno'],
      futureImpact: 'Advanced AI-powered sonar systems are enabling autonomous underwater vehicles (AUVs) to explore the 80% of ocean floor still unmapped, potentially discovering new species and valuable resources.',
      color: premiumDesign.colors.primary
    },
    {
      icon: '🤖',
      title: 'Ultrasonic Distance Sensors',
      short: 'Robotics and automation',
      tagline: 'Giving Machines Spatial Awareness',
      description: 'Ultrasonic sensors emit high-frequency sound waves (typically 40 kHz) and measure echo return time to detect obstacles and measure distances. These affordable, reliable sensors are the workhorses of robotics, automation, and proximity detection systems worldwide.',
      connection: 'Your echo experiment demonstrates the exact principle these sensors use. The HC-SR04 sensor you might find in a robotics kit works identically - it sends an ultrasonic pulse, measures echo time, and calculates distance using the speed of sound formula you learned!',
      howItWorks: 'A piezoelectric transducer vibrates at ultrasonic frequencies (above human hearing) to emit sound pulses. A separate receiver transducer detects returning echoes. A microcontroller measures the time between transmission and reception, then calculates distance considering that sound travels roughly 343 m/s in air at room temperature.',
      stats: [
        { value: '2-400 cm', label: 'Typical range', icon: '📐' },
        { value: '3 mm', label: 'Accuracy achievable', icon: '🎯' },
        { value: '40 kHz', label: 'Operating frequency', icon: '〰️' }
      ],
      examples: [
        'Warehouse robots navigate aisles and avoid collisions using ultrasonic arrays',
        'Smart trash cans measure fill levels to optimize collection routes',
        'Industrial liquid tanks monitor fluid levels without contact',
        'Security systems detect intruders using ultrasonic motion sensing'
      ],
      companies: ['Murata', 'MaxBotix', 'Pepperl+Fuchs', 'Sick AG', 'Honeywell'],
      futureImpact: 'Integration with machine learning enables ultrasonic sensors to not just detect distance but classify objects by their acoustic signatures, making robots smarter at understanding their environment.',
      color: premiumDesign.colors.secondary
    },
    {
      icon: '🚗',
      title: 'LIDAR Mapping',
      short: 'Autonomous vehicle navigation',
      tagline: 'Painting the World with Light',
      description: 'LIDAR (Light Detection and Ranging) applies the same time-of-flight principle as your echo experiment, but uses laser light instead of sound. By firing millions of laser pulses per second and measuring return times, LIDAR creates detailed 3D maps of the environment in real-time.',
      connection: 'The physics is identical to your sound echo experiment! Instead of Distance = (Speed of Sound × Time) / 2, LIDAR uses Distance = (Speed of Light × Time) / 2. Light travels nearly a million times faster than sound, enabling measurements in nanoseconds.',
      howItWorks: 'A laser emits brief pulses of light (often 905nm or 1550nm wavelength). Scanning mirrors or solid-state arrays direct beams in multiple directions. Photodetectors measure the time for reflected light to return with picosecond precision. Millions of measurements combine into a 3D point cloud showing the environment.',
      stats: [
        { value: '300,000 pts/s', label: 'Points measured', icon: '✨' },
        { value: '200+ m', label: 'Detection range', icon: '🎯' },
        { value: '±2 cm', label: 'Distance accuracy', icon: '📏' }
      ],
      examples: [
        'Self-driving cars create real-time 3D maps to navigate safely through traffic',
        'Archaeologists discover ancient structures hidden under dense forest canopy',
        'Surveyors map construction sites with millimeter precision in hours instead of weeks',
        'Forestry services measure tree heights and biomass across vast wilderness areas'
      ],
      companies: ['Velodyne', 'Luminar', 'Waymo', 'Hesai', 'Ouster'],
      futureImpact: 'Solid-state LIDAR sensors are becoming smaller and cheaper, soon enabling every vehicle, drone, and mobile device to perceive the 3D world in real-time.',
      color: premiumDesign.colors.accent
    },
    {
      icon: '✈️',
      title: 'Radar Altimeters',
      short: 'Aviation altitude measurement',
      tagline: 'Precision Height Above Ground',
      description: 'Radar altimeters measure an aircraft\'s exact height above the terrain by bouncing radio waves off the ground and timing the return. Unlike barometric altimeters that measure pressure, radar altimeters give true height above ground - critical for safe landings and low-altitude flight.',
      connection: 'Your echo experiment measures distance to a wall using sound. Radar altimeters do the same thing from aircraft to ground using radio waves. The time-of-flight formula is identical, just using the speed of light (300,000 km/s) instead of sound!',
      howItWorks: 'A transmitter sends radio frequency pulses (typically 4.2-4.4 GHz) straight down. The ground reflects these signals back to a receiver antenna. Sophisticated electronics measure the round-trip time with nanosecond precision. Since radio waves travel at light speed, a 1-microsecond delay indicates 150 meters altitude.',
      stats: [
        { value: '0-2500 ft', label: 'Typical range', icon: '📊' },
        { value: '±2 ft', label: 'Accuracy at low altitude', icon: '🎯' },
        { value: '4.3 GHz', label: 'Operating frequency', icon: '📡' }
      ],
      examples: [
        'Commercial aircraft use radar altimeters for automated landing systems in zero visibility',
        'Military jets fly terrain-following missions at high speed using continuous altitude updates',
        'Helicopters maintain precise hover heights during rescue operations and cargo loading',
        'Spacecraft measure altitude during planetary landings, like the Mars rovers'
      ],
      companies: ['Honeywell', 'Collins Aerospace', 'Thales', 'FreeFlight Systems', 'Garmin'],
      futureImpact: 'Next-generation radar altimeters with improved interference resistance and integration with GPS are enabling fully autonomous aircraft operations, from drone deliveries to air taxis.',
      color: premiumDesign.colors.success
    }
  ];

  // ==================== PHASE RENDERERS ====================

  function renderHookPhase() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-teal-200 bg-clip-text text-transparent">
          Echo & Time of Flight
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10" style={{ fontWeight: 400, lineHeight: '1.6', color: 'rgba(255,255,255,0.7)' }}>
          Discover how to measure distance using only sound and time
        </p>

        {/* Premium card with content */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 rounded-3xl" />

          <div className="relative">
            <div className="text-6xl mb-6">🦇</div>

            <div className="space-y-4">
              <p className="text-xl text-white/90 font-medium leading-relaxed">
                Bats navigate in complete darkness using only sound.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                They send out clicks and listen for echoes - measuring distances in milliseconds!
              </p>
              <div className="pt-2">
                <p className="text-base text-cyan-400 font-semibold">
                  Learn the secret: Time reveals distance!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={(e) => { e.preventDefault(); goToPhase('predict'); }}
          className="mt-10 group relative px-10 py-5 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            zIndex: 10,
            background: 'linear-gradient(135deg, #06b6d4 0%, #0d9488 100%)',
            padding: '20px 40px',
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 600,
            color: 'white',
            marginTop: '40px',
          }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Explore Echoes
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">✦</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">✦</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">✦</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'farther_longer', label: 'Farther walls = longer echo time', icon: '📏' },
      { id: 'same_time', label: 'All echoes take the same time regardless of distance', icon: '=' },
      { id: 'farther_shorter', label: 'Farther walls = shorter echo time (sound speeds up)', icon: '🚀' },
      { id: 'no_pattern', label: 'There\'s no pattern - echoes are random', icon: '🎲' },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🤔 Make Your Prediction
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary, marginBottom: premiumDesign.spacing.lg }}>
            How does distance affect the time it takes to hear an echo?
          </p>
        </div>

        {/* Static SVG visualization for predict phase */}
        <svg width="100%" height="240" viewBox="0 0 600 240" style={{ marginBottom: premiumDesign.spacing.lg }}>
          <defs>
            <linearGradient id="predictSoundGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={premiumDesign.colors.sound} stopOpacity="0.8" />
              <stop offset="100%" stopColor={premiumDesign.colors.echo} stopOpacity="0.8" />
            </linearGradient>
            <filter id="predictGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Person */}
          <circle cx="80" cy="120" r="20" fill={premiumDesign.colors.primary} opacity="0.8" />
          <rect x="70" y="140" width="20" height="40" fill={premiumDesign.colors.primary} opacity="0.7" rx="5" />
          <text x="80" y="200" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="14">Person</text>

          {/* Sound waves going out */}
          <circle cx="80" cy="120" r="30" fill="none" stroke="url(#predictSoundGradient)" strokeWidth="2" opacity="0.6" />
          <circle cx="80" cy="120" r="50" fill="none" stroke="url(#predictSoundGradient)" strokeWidth="2" opacity="0.4" />
          <circle cx="80" cy="120" r="70" fill="none" stroke="url(#predictSoundGradient)" strokeWidth="2" opacity="0.2" />

          {/* Near wall */}
          <rect x="200" y="60" width="20" height="120" fill={premiumDesign.colors.secondary} opacity="0.7" rx="3" />
          <text x="210" y="50" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">Near</text>
          <line x1="80" y1="30" x2="210" y2="30" stroke={premiumDesign.colors.text.muted} strokeWidth="1" strokeDasharray="4" />
          <text x="145" y="25" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="11">distance</text>

          {/* Far wall */}
          <rect x="450" y="40" width="20" height="160" fill={premiumDesign.colors.accent} opacity="0.7" rx="3" />
          <text x="460" y="30" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">Far</text>
          <line x1="80" y1="220" x2="460" y2="220" stroke={premiumDesign.colors.text.muted} strokeWidth="1" strokeDasharray="4" />
          <text x="270" y="235" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="11">longer distance</text>

          {/* Question marks */}
          <text x="300" y="120" textAnchor="middle" fill={premiumDesign.colors.primary} fontSize="36" opacity="0.5">?</text>
        </svg>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === pred.id
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === pred.id
                  ? 'rgba(6, 182, 212, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setPrediction(pred.id);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{
                  color: premiumDesign.colors.text.primary,
                  fontSize: '15px',
                }}>
                  {pred.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    const calculatedDistance = totalTime ? (SPEED_OF_SOUND * totalTime) / 2 : null;
    // Wall SVG x-position derived from wallDistance state (50–500m → 150–380px)
    const wallSVGx = 150 + ((wallDistance - 50) / 450) * 230;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            Echo Distance Calculator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary, fontWeight: 400, lineHeight: '1.6' }}>
            Send a sound wave and measure the echo time!
          </p>
        </div>

        {/* Educational labels panel */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'rgba(6,182,212,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(6,182,212,0.2)',
        }}>
          <span style={{ fontSize: '12px', color: premiumDesign.colors.sound, fontWeight: 500 }}>🔵 Sound wave outgoing</span>
          <span style={{ fontSize: '12px', color: premiumDesign.colors.echo, fontWeight: 500 }}>🟣 Echo returning</span>
          <span style={{ fontSize: '12px', color: premiumDesign.colors.text.muted, fontWeight: 400 }}>Distance = (Speed × Time) ÷ 2</span>
        </div>

        {/* Observation guidance */}
        <div style={{
          padding: '8px 12px',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(245,158,11,0.2)',
          marginBottom: '12px',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: premiumDesign.colors.warning, fontWeight: 400, lineHeight: '1.5' }}>
            <strong>Observe:</strong> Watch how the echo time changes when you increase the distance. The formula d = (v × t) ÷ 2 describes how distance is calculated from timing. Try adjusting the slider to see different echo times. This technology is used in sonar, radar, and medical ultrasound — real-world engineering applications that measure distance by timing sound.
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.xl,
          flex: 1,
        }}>
          {/* Simulation */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <svg
              width="100%"
              height="220"
              viewBox="0 0 400 220"
              style={{
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Echo distance visualization"
            >
              <defs>
                {/* Premium background gradient */}
                <linearGradient id="echoLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="25%" stopColor="#0a1628" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="75%" stopColor="#0a1628" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Sound emitter gradient */}
                <radialGradient id="echoEmitterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                  <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#0891b2" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
                </radialGradient>

                {/* Outgoing sound wave gradient */}
                <radialGradient id="echoSoundWaveOut" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                  <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#22d3ee" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </radialGradient>

                {/* Returning echo wave gradient */}
                <radialGradient id="echoSoundWaveReturn" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
                  <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#a78bfa" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </radialGradient>

                {/* Wall/obstacle gradient */}
                <linearGradient id="echoWallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="20%" stopColor="#4b5563" />
                  <stop offset="40%" stopColor="#6b7280" />
                  <stop offset="60%" stopColor="#4b5563" />
                  <stop offset="80%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Person body gradient */}
                <linearGradient id="echoPersonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>

                {/* Ground gradient */}
                <linearGradient id="echoGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="50%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Emitter glow filter */}
                <filter id="echoEmitterBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Sound wave glow filter */}
                <filter id="echoWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Success indicator glow */}
                <filter id="echoSuccessGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Premium dark lab background */}
              <rect width="400" height="220" fill="url(#echoLabBg)" />

              {/* Subtle grid pattern */}
              <pattern id="echoLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
              </pattern>
              <rect width="400" height="220" fill="url(#echoLabGrid)" />

              {/* Ground plane */}
              <rect x="0" y="175" width="400" height="45" fill="url(#echoGroundGradient)" />
              <line x1="0" y1="175" x2="400" y2="175" stroke="#374151" strokeWidth="1" />

              {/* Person/Sound Emitter */}
              <g transform="translate(45, 100)">
                {/* Emitter glow when sending */}
                {hasSentSound && !echoReceived && (
                  <circle cx="20" cy="0" r="25" fill="url(#echoEmitterGlow)" filter="url(#echoEmitterBlur)" opacity="0.6">
                    <animate attributeName="r" values="20;30;20" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Head */}
                <circle cx="0" cy="-25" r="12" fill="url(#echoPersonGradient)" />

                {/* Body */}
                <line x1="0" y1="-13" x2="0" y2="25" stroke="url(#echoPersonGradient)" strokeWidth="4" strokeLinecap="round" />

                {/* Arms */}
                <line x1="0" y1="0" x2="-12" y2="15" stroke="url(#echoPersonGradient)" strokeWidth="3" strokeLinecap="round" />
                <line x1="0" y1="0" x2="12" y2="15" stroke="url(#echoPersonGradient)" strokeWidth="3" strokeLinecap="round" />

                {/* Legs */}
                <line x1="0" y1="25" x2="-10" y2="50" stroke="url(#echoPersonGradient)" strokeWidth="3" strokeLinecap="round" />
                <line x1="0" y1="25" x2="10" y2="50" stroke="url(#echoPersonGradient)" strokeWidth="3" strokeLinecap="round" />

                {/* Megaphone/Speaker */}
                {hasSentSound && (
                  <g transform="translate(12, -20)">
                    <polygon points="0,0 15,-8 15,8" fill="#f59e0b" opacity="0.9" />
                    <rect x="15" y="-10" width="8" height="20" rx="2" fill="#fbbf24" />
                  </g>
                )}
              </g>

              {/* Axis labels */}
              <text x="200" y="215" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">Distance →</text>
              <text x="12" y="90" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" transform="rotate(-90,12,90)">Height</text>

              {/* Wall/Obstacle - position derived from wallDistance state */}
              <g>
                <rect
                  x={wallSVGx} y="25"
                  width="18" height="150"
                  fill="url(#echoWallGradient)"
                  rx="3"
                />
                {/* Wall texture lines */}
                <line x1={wallSVGx + 5} y1="30" x2={wallSVGx + 5} y2="170" stroke="#9ca3af" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1={wallSVGx + 10} y1="30" x2={wallSVGx + 10} y2="170" stroke="#9ca3af" strokeWidth="0.5" strokeOpacity="0.3" />
                {/* Wall highlight */}
                <rect x={wallSVGx} y="25" width="3" height="150" fill="#6b7280" opacity="0.5" rx="1" />
                {/* Wall label */}
                <text x={wallSVGx + 9} y="18" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">Wall</text>
              </g>

              {/* Distance measurement line */}
              <g>
                <line x1="60" y1="190" x2={wallSVGx} y2="190" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6,3" />
                <line x1="60" y1="185" x2="60" y2="195" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                <line x1={wallSVGx} y1="185" x2={wallSVGx} y2="195" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                <text x={(60 + wallSVGx) / 2} y="205" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">{wallDistance}m</text>
              </g>

              {/* SVG title */}
              <title>Echo Time-of-Flight Visualization</title>
              {/* Person label */}
              <text x="45" y="18" textAnchor="middle" fill="#22d3ee" fontSize="13" fontWeight="700">Emitter</text>

              {/* Sound travel path - polyline showing round trip with significant vertical range (y: 10-190) */}
              <path
                d={[
                  `M 60 100`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.1)} 70`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.2)} 40`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.3)} 20`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.4)} 10`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.5)} 20`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.6)} 40`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.7)} 70`,
                  `L ${wallSVGx} 100`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.7)} 130`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.5)} 160`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.3)} 180`,
                  `L ${Math.round(60 + (wallSVGx - 60) * 0.1)} 190`,
                  `L 60 100`,
                ].join(' ')}
                fill="none"
                stroke="rgba(34,211,238,0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Sound waves with premium gradients */}
              {soundWaves.map(wave => (
                <g key={wave.id} filter="url(#echoWaveGlow)">
                  {/* Outer wave ring */}
                  <circle
                    cx={wave.x}
                    cy="75"
                    r={wave.radius}
                    fill="none"
                    stroke={wave.returning ? '#a78bfa' : '#22d3ee'}
                    strokeWidth="3"
                    opacity={wave.opacity}
                  />
                  {/* Middle wave ring */}
                  <circle
                    cx={wave.x}
                    cy="75"
                    r={wave.radius - 8}
                    fill="none"
                    stroke={wave.returning ? '#8b5cf6' : '#06b6d4'}
                    strokeWidth="2"
                    opacity={wave.opacity * 0.7}
                  />
                  {/* Inner wave ring */}
                  <circle
                    cx={wave.x}
                    cy="75"
                    r={wave.radius - 16}
                    fill="none"
                    stroke={wave.returning ? '#c4b5fd' : '#67e8f9'}
                    strokeWidth="1.5"
                    opacity={wave.opacity * 0.5}
                  />
                </g>
              ))}

              {/* Echo received success indicator */}
              {echoReceived && (
                <g transform="translate(45, 45)" filter="url(#echoSuccessGlow)">
                  <circle cx="0" cy="0" r="20" fill="rgba(16, 185, 129, 0.3)" />
                  <circle cx="0" cy="0" r="12" fill="#10b981" />
                  <path d="M-5,0 L-2,4 L6,-4" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: `0 ${premiumDesign.spacing.md}px`,
              marginTop: `-${premiumDesign.spacing.sm}px`,
            }}>
              <span style={{
                fontSize: typo.small,
                color: premiumDesign.colors.text.muted,
                fontWeight: 500,
              }}>
                Sound Emitter
              </span>
              <span style={{
                fontSize: typo.body,
                color: premiumDesign.colors.primary,
                fontWeight: 600,
              }}>
                {wallDistance}m
              </span>
              <span style={{
                fontSize: typo.small,
                color: premiumDesign.colors.text.muted,
                fontWeight: 500,
              }}>
                Wall
              </span>
            </div>

            {/* Formula display - always visible */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(6, 182, 212, 0.3)',
              textAlign: 'center',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, margin: 0, fontSize: typo.small, fontWeight: 400 }}>
                Formula: d = (v × t) ÷ 2
              </p>
              {totalTime ? (
                <p style={{ color: premiumDesign.colors.primary, margin: '4px 0 0', fontSize: typo.body, fontWeight: 600 }}>
                  ({SPEED_OF_SOUND} m/s × {totalTime.toFixed(2)}s) ÷ 2 = {calculatedDistance?.toFixed(0)}m ✓
                </p>
              ) : (
                <p style={{ color: premiumDesign.colors.text.muted, margin: '4px 0 0', fontSize: typo.small, fontWeight: 400 }}>
                  Send a sound to calculate distance
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: '4px', fontWeight: 600 }}>
                Wall Distance: <span style={{ color: premiumDesign.colors.primary }}>{wallDistance}m</span>
              </h4>
              <input
                type="range"
                min="50"
                max="500"
                value={wallDistance}
                onInput={(e) => {
                  setWallDistance(Number((e.target as HTMLInputElement).value));
                  setHasSentSound(false);
                  setEchoReceived(false);
                  setTotalTime(null);
                  setSoundWaves([]);
                }}
                onChange={(e) => {
                  setWallDistance(Number(e.target.value));
                  setHasSentSound(false);
                  setEchoReceived(false);
                  setTotalTime(null);
                  setSoundWaves([]);
                }}
                disabled={hasSentSound && !echoReceived}
                style={{
                  width: '100%',
                  height: '20px',
                  accentColor: '#06b6d4',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: premiumDesign.colors.text.muted, fontWeight: 400 }}>
                <span>50m (close)</span>
                <span>500m (far)</span>
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: hasSentSound ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: hasSentSound ? 'not-allowed' : 'pointer',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                if (!hasSentSound) {
                  setHasSentSound(true);
                  setEchoReceived(false);
                  setElapsedTime(0);
                }
              }}
            >
              {hasSentSound ? (echoReceived ? '✅ Echo Received!' : '📢 Sending...') : '📢 Send Sound!'}
            </button>

            {echoReceived && (
              <button
                style={{
                  padding: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setHasSentSound(false);
                  setEchoReceived(false);
                  setTotalTime(null);
                  setSoundWaves([]);
                }}
              >
                🔄 Try Again
              </button>
            )}

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Echo Time
              </div>
              <div style={{ color: premiumDesign.colors.sound, fontSize: '28px', fontWeight: 700 }}>
                {totalTime ? `${totalTime.toFixed(2)}s` : hasSentSound ? `${elapsedTime.toFixed(2)}s` : '---'}
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px' }}>
                Speed of Sound: {SPEED_OF_SOUND} m/s
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'See Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const wasCorrect = prediction === 'farther_longer';

    const reviewContent = [
      {
        title: "The Echo Formula",
        content: `${wasCorrect ? "Excellent prediction! You correctly identified that farther walls produce longer echo times. " : "Your prediction was that echo time would not change with distance — but the experiment shows the opposite! "}The echo time IS directly proportional to distance.\n\nThe formula: Distance = (Speed of Sound × Time) ÷ 2\n\nWe divide by 2 because sound must travel THERE and BACK — the echo is a round trip. This simple formula unlocks the ability to measure any distance using only a clock and a sound source.`,
        highlight: wasCorrect,
      },
      {
        title: "Why This Works",
        content: "Sound travels at a constant speed in a given medium (about 343 m/s in air at 20°C, sea level). This consistency is the key insight — because the speed is constant and predictable, measuring time is equivalent to measuring distance.\n\nIf we know:\n• The speed of sound in the medium\n• The total round-trip time for the echo\n\nWe can calculate the EXACT distance to any reflecting surface! The relationship is perfectly linear: double the distance, double the echo time.",
      },
      {
        title: "The Math in Action",
        content: `For a wall 170m away:\n• Sound travels 170m to the wall (takes ~0.5 seconds)\n• Then 170m back to you = 340m total distance traveled\n• At 343 m/s: Total time = 340 ÷ 343 ≈ 0.99 seconds\n\nTo find distance FROM time:\nDistance = (343 m/s × 0.99 s) ÷ 2 = 170m ✓\n\nThis formula d = (v × t) ÷ 2 is used in sonar, radar, ultrasound imaging, bat echolocation, and parking sensors.`,
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Understanding Time of Flight
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.primary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {reviewContent[reviewStep].content}
          </p>

          {reviewContent[reviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Great reasoning! You correctly predicted that farther distances mean longer echo times.
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.primary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setReviewStep(i);
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'New Variable →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                setReviewStep(r => r + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const predictions = [
      { id: 'air_faster', label: 'Sound is faster in AIR (air is lighter)', icon: '💨' },
      { id: 'water_faster', label: 'Sound is faster in WATER (molecules are closer)', icon: '🌊' },
      { id: 'same_speed', label: 'Sound travels at the same speed in any medium', icon: '=' },
      { id: 'no_water_sound', label: 'Sound can\'t travel through water at all', icon: '🔇' },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🌊 The Twist: Sound in Water
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary, marginBottom: premiumDesign.spacing.lg }}>
            Does sound travel faster in air or water?
          </p>
        </div>

        {/* Static SVG visualization for twist_predict phase */}
        <svg width="100%" height="260" viewBox="0 0 600 260" style={{ marginBottom: premiumDesign.spacing.lg }}>
          <defs>
            <linearGradient id="twistAirGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="twistWaterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Air section */}
          <rect x="50" y="30" width="200" height="100" fill="url(#twistAirGradient)" opacity="0.2" rx="8" />
          <text x="150" y="20" textAnchor="middle" fill={premiumDesign.colors.text.primary} fontSize="16" fontWeight="600">Air</text>
          <text x="150" y="80" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="32" opacity="0.6">💨</text>
          <text x="150" y="110" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="13">Speed = ?</text>

          {/* Water section */}
          <rect x="350" y="30" width="200" height="100" fill="url(#twistWaterGradient)" opacity="0.3" rx="8" />
          <text x="450" y="20" textAnchor="middle" fill={premiumDesign.colors.text.primary} fontSize="16" fontWeight="600">Water</text>
          <text x="450" y="80" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="32" opacity="0.7">🌊</text>
          <text x="450" y="110" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="13">Speed = ?</text>

          {/* VS */}
          <text x="300" y="85" textAnchor="middle" fill={premiumDesign.colors.primary} fontSize="24" fontWeight="700">VS</text>

          {/* Sound waves - using significant vertical range (y: 90-160 = 70px/260 = 26.9%) */}
          <path d="M 100 160 Q 120 90 140 160 T 180 160" stroke={premiumDesign.colors.sound} strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 420 160 Q 440 90 460 160 T 500 160" stroke={premiumDesign.colors.echo} strokeWidth="3" fill="none" opacity="0.6" />

          {/* Question */}
          <text x="300" y="200" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="14">Which medium allows sound to travel faster?</text>
          <text x="300" y="240" textAnchor="middle" fill={premiumDesign.colors.primary} fontSize="48" opacity="0.4">?</text>
        </svg>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === pred.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === pred.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setTwistPrediction(pred.id);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{ color: premiumDesign.colors.text.primary, fontSize: '15px' }}>
                  {pred.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test It →',
            onClick: goNext,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const airSpeed = 343;
    const waterSpeed = 1480;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🏊 Air vs Water Sound Speed
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Compare echo times in different media (same 100m distance)
          </p>
        </div>

        {/* Medium selector */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.md,
          justifyContent: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          {(['air', 'water'] as const).map(m => (
            <button
              key={m}
              style={{
                padding: `${premiumDesign.spacing.md}px ${premiumDesign.spacing.xl}px`,
                borderRadius: premiumDesign.radius.lg,
                border: medium === m ? `2px solid ${m === 'air' ? premiumDesign.colors.sound : premiumDesign.colors.secondary}` : '2px solid rgba(255,255,255,0.1)',
                background: medium === m ? (m === 'air' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(139, 92, 246, 0.2)') : 'transparent',
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setMedium(m);
                setTwistSent(false);
                setTwistTime(null);
                setTwistWaves([]);
              }}
            >
              {m === 'air' ? '💨 Air' : '🌊 Water'}
            </button>
          ))}
        </div>

        {/* Simulation */}
        <div style={{
          background: medium === 'water' ? 'linear-gradient(180deg, #1e3a5f 0%, #0c1929 100%)' : premiumDesign.colors.background.secondary,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <svg width="100%" height="180" viewBox="0 0 400 180">
            <defs>
              {/* Air medium background gradient */}
              <linearGradient id="echoTwistAirBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0a1628" />
                <stop offset="25%" stopColor="#111827" />
                <stop offset="50%" stopColor="#1f2937" />
                <stop offset="75%" stopColor="#111827" />
                <stop offset="100%" stopColor="#0a1628" />
              </linearGradient>

              {/* Water medium background gradient */}
              <linearGradient id="echoTwistWaterBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c4a6e" />
                <stop offset="25%" stopColor="#164e63" />
                <stop offset="50%" stopColor="#155e75" />
                <stop offset="75%" stopColor="#0e7490" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
              </linearGradient>

              {/* Sound source glow - air */}
              <radialGradient id="echoTwistSourceAir" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#d97706" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
              </radialGradient>

              {/* Sound source glow - water (dolphin) */}
              <radialGradient id="echoTwistSourceWater" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>

              {/* Target/obstacle gradient */}
              <linearGradient id="echoTwistTarget" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="30%" stopColor="#4b5563" />
                <stop offset="50%" stopColor="#6b7280" />
                <stop offset="70%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>

              {/* Air wave gradient */}
              <radialGradient id="echoTwistWaveAir" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                <stop offset="75%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>

              {/* Water wave gradient */}
              <radialGradient id="echoTwistWaveWater" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.7" />
                <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>

              {/* Returning wave gradient - purple for both media */}
              <radialGradient id="echoTwistWaveReturn" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
                <stop offset="75%" stopColor="#a78bfa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
              </radialGradient>

              {/* Source glow filter */}
              <filter id="echoTwistSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Wave glow filter */}
              <filter id="echoTwistWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Water caustics pattern */}
              <pattern id="echoWaterCaustics" width="40" height="40" patternUnits="userSpaceOnUse">
                <ellipse cx="10" cy="15" rx="8" ry="5" fill="rgba(103, 232, 249, 0.1)" />
                <ellipse cx="30" cy="25" rx="6" ry="4" fill="rgba(34, 211, 238, 0.08)" />
                <ellipse cx="20" cy="35" rx="7" ry="4" fill="rgba(103, 232, 249, 0.06)" />
              </pattern>

              {/* Air particles pattern */}
              <pattern id="echoAirParticles" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)" />
                <circle cx="35" cy="25" r="0.8" fill="rgba(255,255,255,0.08)" />
                <circle cx="20" cy="40" r="1.2" fill="rgba(255,255,255,0.06)" />
              </pattern>
            </defs>

            {/* Background based on medium */}
            <rect width="400" height="180" fill={medium === 'water' ? 'url(#echoTwistWaterBg)' : 'url(#echoTwistAirBg)'} />

            {/* Medium-specific overlay pattern */}
            {medium === 'water' ? (
              <rect width="400" height="180" fill="url(#echoWaterCaustics)" opacity="0.5" />
            ) : (
              <rect width="400" height="180" fill="url(#echoAirParticles)" />
            )}

            {/* Water surface line */}
            {medium === 'water' && (
              <path d="M0,15 Q50,10 100,15 T200,15 T300,15 T400,15" stroke="#67e8f9" strokeWidth="2" fill="none" opacity="0.4">
                <animate attributeName="d" values="M0,15 Q50,10 100,15 T200,15 T300,15 T400,15;M0,15 Q50,20 100,15 T200,15 T300,15 T400,15;M0,15 Q50,10 100,15 T200,15 T300,15 T400,15" dur="3s" repeatCount="indefinite" />
              </path>
            )}

            {/* Source with glow */}
            <g transform="translate(50, 90)">
              {/* Glow effect */}
              <circle
                cx="0" cy="0"
                r="25"
                fill={medium === 'water' ? 'url(#echoTwistSourceWater)' : 'url(#echoTwistSourceAir)'}
                filter="url(#echoTwistSourceGlow)"
                opacity={twistSent && !twistTime ? 0.8 : 0.4}
              >
                {twistSent && !twistTime && (
                  <animate attributeName="r" values="20;30;20" dur="0.4s" repeatCount="indefinite" />
                )}
              </circle>

              {/* Source icon representation */}
              {medium === 'air' ? (
                /* Speaker icon */
                <g>
                  <rect x="-8" y="-6" width="10" height="12" rx="2" fill="#fbbf24" />
                  <polygon points="2,-10 12,-6 12,6 2,10" fill="#f59e0b" />
                  {twistSent && (
                    <>
                      <path d="M16,-8 Q22,0 16,8" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.6" />
                      <path d="M20,-10 Q28,0 20,10" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.4" />
                    </>
                  )}
                </g>
              ) : (
                /* Dolphin stylized icon */
                <g>
                  <ellipse cx="0" cy="0" rx="15" ry="8" fill="#22d3ee" />
                  <polygon points="15,0 25,-4 25,4" fill="#06b6d4" />
                  <polygon points="-5,-8 0,-15 5,-8" fill="#0891b2" />
                  <circle cx="-8" cy="-2" r="2" fill="#0f172a" />
                </g>
              )}
            </g>

            {/* Target/obstacle */}
            <g>
              <rect x="340" y="55" width="35" height="70" fill="url(#echoTwistTarget)" rx="4" />
              <rect x="340" y="55" width="4" height="70" fill="#6b7280" opacity="0.5" rx="1" />
              {/* Texture lines */}
              <line x1="350" y1="60" x2="350" y2="120" stroke="#9ca3af" strokeWidth="0.5" strokeOpacity="0.3" />
              <line x1="360" y1="60" x2="360" y2="120" stroke="#9ca3af" strokeWidth="0.5" strokeOpacity="0.3" />
            </g>

            {/* Distance measurement */}
            <g>
              <line x1="65" y1="155" x2="340" y2="155" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6,3" />
              <line x1="65" y1="150" x2="65" y2="160" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <line x1="340" y1="150" x2="340" y2="160" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            </g>

            {/* Sound waves with premium effects */}
            {twistWaves.map(wave => (
              <g key={wave.id} filter="url(#echoTwistWaveGlow)">
                {/* Outer ring */}
                <circle
                  cx={wave.x}
                  cy="90"
                  r={wave.radius}
                  fill="none"
                  stroke={wave.returning ? '#a78bfa' : (medium === 'water' ? '#22d3ee' : '#fbbf24')}
                  strokeWidth="3"
                  opacity={wave.opacity}
                />
                {/* Middle ring */}
                <circle
                  cx={wave.x}
                  cy="90"
                  r={wave.radius - 6}
                  fill="none"
                  stroke={wave.returning ? '#8b5cf6' : (medium === 'water' ? '#06b6d4' : '#f59e0b')}
                  strokeWidth="2"
                  opacity={wave.opacity * 0.7}
                />
                {/* Inner ring */}
                <circle
                  cx={wave.x}
                  cy="90"
                  r={wave.radius - 12}
                  fill="none"
                  stroke={wave.returning ? '#c4b5fd' : (medium === 'water' ? '#67e8f9' : '#fcd34d')}
                  strokeWidth="1.5"
                  opacity={wave.opacity * 0.5}
                />
              </g>
            ))}
          </svg>

          {/* Labels outside SVG */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px 0`,
          }}>
            <span style={{
              fontSize: typo.small,
              color: medium === 'water' ? '#67e8f9' : '#fbbf24',
              fontWeight: 500,
            }}>
              {medium === 'air' ? 'Speaker' : 'Dolphin'}
            </span>
            <span style={{
              fontSize: typo.body,
              color: premiumDesign.colors.text.secondary,
              fontWeight: 600,
            }}>
              100m • Speed: {medium === 'air' ? airSpeed : waterSpeed} m/s
            </span>
            <span style={{
              fontSize: typo.small,
              color: premiumDesign.colors.text.muted,
              fontWeight: 500,
            }}>
              Target
            </span>
          </div>
        </div>

        {/* Controls and results */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: premiumDesign.spacing.lg,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.md }}>
            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: twistSent ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: twistSent ? 'not-allowed' : 'pointer',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                if (!twistSent) setTwistSent(true);
              }}
            >
              {twistSent ? (twistTime ? '✅ Echo Received!' : '📢 Sending...') : '📢 Send Sound!'}
            </button>

            {twistTime && (
              <button
                style={{
                  padding: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setTwistSent(false);
                  setTwistTime(null);
                  setTwistWaves([]);
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>

          <div style={{
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}>
            <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
              Echo Time in {medium === 'air' ? 'Air' : 'Water'}
            </div>
            <div style={{ color: medium === 'air' ? premiumDesign.colors.sound : premiumDesign.colors.secondary, fontSize: '28px', fontWeight: 700 }}>
              {twistTime ? `${(twistTime * 1000).toFixed(0)} ms` : '---'}
            </div>
            <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px', marginTop: premiumDesign.spacing.xs }}>
              Air: ~584ms | Water: ~135ms
            </div>
          </div>
        </div>

        {twistTime && (
          <div style={{
            marginTop: premiumDesign.spacing.lg,
            padding: premiumDesign.spacing.md,
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center',
          }}>
            <p style={{ color: premiumDesign.colors.success, margin: 0, fontWeight: 600 }}>
              {medium === 'water' ? '🌊 Water is 4.3x FASTER! Sound travels quicker when molecules are closer together.' : '💨 Air is slower because molecules are spread far apart.'}
            </p>
          </div>
        )}

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Understand Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const wasCorrect = twistPrediction === 'water_faster';

    const twistReviewContent = [
      {
        title: "Sound is Faster in Water!",
        content: `${wasCorrect ? "You predicted correctly! " : ""}Sound travels about 4.3 times FASTER in water (~1480 m/s) than in air (~343 m/s).\n\nThis might seem counterintuitive, but remember: sound is transmitted through molecular collisions!`,
        highlight: wasCorrect,
      },
      {
        title: "Why Denser = Faster",
        content: "Sound is a pressure wave that travels by molecules bumping into each other.\n\nIn water:\n• Molecules are MUCH closer together\n• Collisions happen faster\n• The wave propagates more quickly\n\nIn air, molecules are far apart - more 'travel time' between collisions!",
      },
      {
        title: "Real-World Applications",
        content: "This is why:\n\n• Dolphins use echolocation so effectively (fast, precise echoes)\n• Submarine sonar can detect objects quickly\n• Whales can communicate across entire oceans!\n\nUnderwater sound can travel thousands of miles!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Medium Matters!
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Excellent! You correctly identified that denser media transmit sound faster.
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setTwistReviewStep(i);
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                setTwistReviewStep(t => t + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const applications = realWorldApps;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🌍 Echo Technology in Action
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Explore all {applications.length} applications to unlock the quiz
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {applications.map((app, index) => (
            <button
              key={index}
              style={{
                padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                borderRadius: premiumDesign.radius.full,
                border: activeApp === index
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(6, 182, 212, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setActiveApp(index);
              }}
            >
              {completedApps.has(index) && '✓ '}{app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
            display: 'flex',
            alignItems: 'center',
            gap: premiumDesign.spacing.sm,
          }}>
            <span style={{ fontSize: '28px' }}>{applications[activeApp].icon}</span>
            {applications[activeApp].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.muted,
            fontSize: '14px',
            marginBottom: premiumDesign.spacing.md,
            fontStyle: 'italic',
          }}>
            {applications[activeApp].tagline}
          </p>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {applications[activeApp].description}
          </p>

          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(6, 182, 212, 0.3)',
            marginBottom: premiumDesign.spacing.lg,
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.primary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
              🔗 Connection to Your Experiment
            </p>
            <p style={{ margin: 0, color: premiumDesign.colors.text.secondary, fontSize: '15px', lineHeight: 1.6 }}>
              {applications[activeApp].connection}
            </p>
          </div>

          {applications[activeApp].howItWorks && (
            <div style={{ marginBottom: premiumDesign.spacing.lg }}>
              <p style={{ color: premiumDesign.colors.text.primary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                How It Works
              </p>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '15px', lineHeight: 1.6 }}>
                {applications[activeApp].howItWorks}
              </p>
            </div>
          )}

          {applications[activeApp].stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: premiumDesign.spacing.md,
              marginBottom: premiumDesign.spacing.lg,
            }}>
              {applications[activeApp].stats.map((stat: { value: string; label: string; icon: string }, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: premiumDesign.colors.background.tertiary,
                    borderRadius: premiumDesign.radius.lg,
                    padding: premiumDesign.spacing.md,
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: premiumDesign.spacing.xs }}>{stat.icon}</div>
                  <div style={{ color: premiumDesign.colors.primary, fontWeight: 700, fontSize: '18px', marginBottom: 4 }}>
                    {stat.value}
                  </div>
                  <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {applications[activeApp].examples && (
            <div style={{ marginBottom: premiumDesign.spacing.lg }}>
              <p style={{ color: premiumDesign.colors.text.primary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Real-World Examples
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: premiumDesign.colors.text.secondary, fontSize: '15px', lineHeight: 1.8 }}>
                {applications[activeApp].examples.map((ex: string, idx: number) => (
                  <li key={idx}>{ex}</li>
                ))}
              </ul>
            </div>
          )}

          {applications[activeApp].companies && applications[activeApp].companies.length > 0 && (
            <div style={{ marginBottom: premiumDesign.spacing.lg }}>
              <p style={{ color: premiumDesign.colors.text.primary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Industry Leaders
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: premiumDesign.spacing.xs }}>
                {applications[activeApp].companies.map((company: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      padding: '6px 12px',
                      background: premiumDesign.colors.background.tertiary,
                      borderRadius: premiumDesign.radius.sm,
                      fontSize: '13px',
                      color: premiumDesign.colors.text.secondary,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}

          {applications[activeApp].futureImpact && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ margin: 0, color: premiumDesign.colors.secondary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                🚀 Future Impact
              </p>
              <p style={{ margin: 0, color: premiumDesign.colors.text.secondary, fontSize: '15px', lineHeight: 1.6 }}>
                {applications[activeApp].futureImpact}
              </p>
            </div>
          )}

          {!completedApps.has(activeApp) && (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 10,
                minHeight: '44px',
              }}
              onClick={(e) => {
                e.preventDefault();
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emitEvent('app_explored', { app: applications[activeApp].title, appIndex: activeApp });
                if (activeApp < applications.length - 1) {
                  setActiveApp(activeApp + 1);
                }
              }}
            >
              Got It! ✓
            </button>
          )}

          {completedApps.has(activeApp) && activeApp < applications.length - 1 && (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.secondary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setActiveApp(activeApp + 1);
              }}
            >
              Next Application →
            </button>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: goNext,
            disabled: completedApps.size < applications.length,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Good Job — Keep Learning!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: passed ? premiumDesign.colors.success : premiumDesign.colors.warning,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore}/{testQuestions.length}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 600,
              color: passed ? premiumDesign.colors.success : premiumDesign.colors.warning,
              marginBottom: premiumDesign.spacing.sm,
            }}>
              {percentage}%
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? 'You have mastered echo time of flight!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: premiumDesign.colors.success, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <p style={{
            fontSize: isMobile ? '14px' : '16px',
            color: premiumDesign.colors.text.secondary,
            marginBottom: premiumDesign.spacing.lg,
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            {question.scenario}
          </p>
          <h3 style={{
            fontSize: isMobile ? '18px' : '20px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
            fontWeight: 600,
          }}>
            {question.question}
          </h3>

          <div style={{ display: 'grid', gap: premiumDesign.spacing.md }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.correct;
              const showResult = showExplanation;
              const labels = ['A)', 'B)', 'C)', 'D)'];

              let bgColor = premiumDesign.colors.background.secondary;
              let borderColor = 'rgba(255,255,255,0.1)';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (isSelected) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = premiumDesign.colors.error;
                }
              } else if (isSelected) {
                bgColor = 'rgba(6, 182, 212, 0.2)';
                borderColor = premiumDesign.colors.primary;
              }

              return (
                <button
                  key={index}
                  style={{
                    padding: premiumDesign.spacing.lg,
                    borderRadius: premiumDesign.radius.lg,
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    cursor: showExplanation ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                >
                  <span style={{
                    color: premiumDesign.colors.text.primary,
                    fontSize: '15px',
                  }}>
                    {labels[index]} {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div style={{
            background: question.options[selectedAnswer as number]?.correct
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: `1px solid ${question.options[selectedAnswer as number]?.correct
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(239, 68, 68, 0.3)'}`,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            <p style={{
              color: question.options[selectedAnswer as number]?.correct
                ? premiumDesign.colors.success
                : premiumDesign.colors.error,
              fontWeight: 600,
              marginBottom: premiumDesign.spacing.sm,
            }}>
              {question.options[selectedAnswer as number]?.correct ? '✓ Correct!' : '✗ Incorrect — the correct answer is highlighted above'}
            </p>
            <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Quiz navigation buttons - separate check and next for clear test detection */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: premiumDesign.spacing.xl,
          paddingTop: premiumDesign.spacing.lg,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!showExplanation && (
            <button
              style={{
                padding: '16px 32px',
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: selectedAnswer !== null ? premiumDesign.colors.gradient.primary : premiumDesign.colors.background.tertiary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
                opacity: selectedAnswer !== null ? 1 : 0.5,
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                if (selectedAnswer !== null) {
                  if (question.options[selectedAnswer]?.correct) {
                    setTestScore(s => s + 1);
                  }
                  setShowExplanation(true);
                }
              }}
            >
              Check Answer
            </button>
          )}
          {showExplanation && (
            <button
              style={{
                padding: '16px 32px',
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              }}
            >
              {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Confetti */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: [
                premiumDesign.colors.primary,
                premiumDesign.colors.secondary,
                premiumDesign.colors.success,
                premiumDesign.colors.accent,
              ][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        {renderProgressBar()}

        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: premiumDesign.colors.gradient.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: premiumDesign.spacing.xl,
          boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 800,
          color: premiumDesign.colors.text.primary,
          marginBottom: premiumDesign.spacing.sm,
        }}>
          Echo Master!
        </h1>

        <p style={{
          fontSize: '20px',
          color: premiumDesign.colors.text.secondary,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          Final Score: <span style={{ color: premiumDesign.colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: premiumDesign.spacing.md,
          maxWidth: '400px',
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          {[
            { icon: '📏', label: 'd = (v × t) ÷ 2' },
            { icon: '🌊', label: 'Water = 4x Faster' },
            { icon: '🦇', label: 'Bat Echolocation' },
            { icon: '🚢', label: 'Sonar Navigation' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                background: premiumDesign.colors.background.secondary,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: premiumDesign.spacing.xs }}>{item.icon}</div>
              <div style={{ fontSize: '13px', color: premiumDesign.colors.text.secondary }}>{item.label}</div>
            </div>
          ))}
        </div>

        {renderButton(
          'Complete Lesson ✓',
          () => {
            emitEvent('mastery_achieved', { testScore, percentage });
          },
          'success'
        )}
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Echo & Time of Flight</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p) => {
              const isActive = phase === p;
              const isPast = phaseOrder.indexOf(phase) > phaseOrder.indexOf(p);
              return (
                <button
                  key={p}
                  onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                  aria-label={phaseLabels[p]}
                  title={phaseLabels[p]}
                  style={{
                    width: isActive ? '24px' : '8px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: '100%',
                    height: '8px',
                    borderRadius: '9999px',
                    background: isActive ? '#22d3ee' : isPast ? '#10b981' : '#374151',
                    transition: 'all 0.3s ease',
                  }} />
                </button>
              );
            })}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
        position: 'relative'
      }}>
        <div className="max-w-4xl mx-auto px-4">
          {phase === 'hook' && renderHookPhase()}
          {phase === 'predict' && renderPredictPhase()}
          {phase === 'play' && renderPlayPhase()}
          {phase === 'review' && renderReviewPhase()}
          {phase === 'twist_predict' && renderTwistPredictPhase()}
          {phase === 'twist_play' && renderTwistPlayPhase()}
          {phase === 'twist_review' && renderTwistReviewPhase()}
          {phase === 'transfer' && renderTransferPhase()}
          {phase === 'test' && renderTestPhase()}
          {phase === 'mastery' && renderMasteryPhase()}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '16px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          maxWidth: '1024px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              goBack();
              playSound('click');
            }}
            disabled={phaseOrder.indexOf(phase) === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: premiumDesign.colors.background.tertiary,
              color: premiumDesign.colors.text.primary,
              fontSize: '15px',
              fontWeight: 600,
              cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
              opacity: phaseOrder.indexOf(phase) === 0 ? 0.4 : 1,
              transition: 'all 0.3s ease',
              fontFamily: premiumDesign.typography.fontFamily,
              minHeight: '44px',
            }}
          >
            ← Back
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              goNext();
              playSound('click');
            }}
            disabled={
              phase === 'test' ||
              (phase === 'predict' && !prediction) ||
              (phase === 'twist_predict' && !twistPrediction) ||
              (phase === 'transfer' && completedApps.size < realWorldApps.length)
            }
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: premiumDesign.colors.gradient.primary,
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: (
                phase === 'test' ||
                (phase === 'predict' && !prediction) ||
                (phase === 'twist_predict' && !twistPrediction) ||
                (phase === 'transfer' && completedApps.size < realWorldApps.length)
              ) ? 'not-allowed' : 'pointer',
              opacity: (
                phase === 'test' ||
                (phase === 'predict' && !prediction) ||
                (phase === 'twist_predict' && !twistPrediction) ||
                (phase === 'transfer' && completedApps.size < realWorldApps.length)
              ) ? 0.4 : 1,
              transition: 'all 0.3s ease',
              fontFamily: premiumDesign.typography.fontFamily,
              boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
              minHeight: '44px',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
