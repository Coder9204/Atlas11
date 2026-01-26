'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

// ============================================================================
// AI VOICE SYNCHRONIZATION HOOK
// Ensures AI voice stays in sync with what's on screen
// Prevents talking about old screens when user progresses quickly
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type SpeechPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SpeechItem {
  id: string;
  text: string;
  priority: SpeechPriority;
  forPhase: string;
  forSubScreen?: string;
  maxAge?: number; // milliseconds before this speech becomes stale (default: 10000)
  createdAt: number;
}

export interface ScreenState {
  phase: string;
  phaseLabel: string;
  subScreen?: string; // e.g., transfer app index, question number
  description: string; // Human-readable description of what's on screen
  interactionState: {
    hasInteracted: boolean;
    sliderValues?: Record<string, number>;
    selectedOption?: string | null;
    currentQuestion?: number;
    score?: number;
  };
  timestamp: number;
}

export interface AIVoiceSyncConfig {
  // Dwell times (how long to wait before speaking)
  dwellTimeIntro: number;      // Default: 2000ms - time before phase intro
  dwellTimeHint: number;       // Default: 5000ms - time before offering help
  dwellTimeAfterRapid: number; // Default: 5000ms - time to wait after rapid progression ends

  // Rapid progression detection
  rapidThreshold: number;      // Default: 3000ms - if transitions faster than this, it's "rapid"
  rapidCountThreshold: number; // Default: 3 - number of rapid transitions to trigger silent mode

  // Speech behavior
  cancelOnNavigate: boolean;   // Default: true - stop speech when user navigates
  adaptMessageLength: boolean; // Default: true - shorter messages for fast users
}

export interface UseAIVoiceSyncReturn {
  // Screen state management
  updateScreenState: (state: Partial<ScreenState>) => void;
  getCurrentScreenState: () => ScreenState;

  // Speech control
  queueSpeech: (text: string, priority?: SpeechPriority, options?: Partial<SpeechItem>) => void;
  cancelAllSpeech: () => void;
  cancelCurrentSpeech: () => void;

  // State queries
  isRapidProgression: () => boolean;
  shouldSpeak: (priority: SpeechPriority) => boolean;
  getRecommendedMessageLength: () => 'short' | 'medium' | 'long';

  // Event emission for AI system
  emitToAI: (eventType: string, details: Record<string, unknown>) => void;

  // Status
  isSpeaking: boolean;
  isInRapidMode: boolean;
  currentPhase: string;
  dwellTime: number; // How long user has been on current screen
}

// ----------------------------------------------------------------------------
// Default Configuration
// ----------------------------------------------------------------------------

const DEFAULT_CONFIG: AIVoiceSyncConfig = {
  dwellTimeIntro: 2000,
  dwellTimeHint: 5000,
  dwellTimeAfterRapid: 5000,
  rapidThreshold: 3000,
  rapidCountThreshold: 3,
  cancelOnNavigate: true,
  adaptMessageLength: true,
};

// ----------------------------------------------------------------------------
// Priority Weights (higher = more important)
// ----------------------------------------------------------------------------

const PRIORITY_WEIGHTS: Record<SpeechPriority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

// ----------------------------------------------------------------------------
// Main Hook
// ----------------------------------------------------------------------------

export function useAIVoiceSync(
  gameType: string,
  gameTitle: string,
  config: Partial<AIVoiceSyncConfig> = {}
): UseAIVoiceSyncReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // ----------------------------------------------------------------------------
  // State
  // ----------------------------------------------------------------------------

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInRapidMode, setIsInRapidMode] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [dwellTime, setDwellTime] = useState(0);

  // ----------------------------------------------------------------------------
  // Refs (for values that shouldn't trigger re-renders)
  // ----------------------------------------------------------------------------

  // Screen state
  const screenStateRef = useRef<ScreenState>({
    phase: '',
    phaseLabel: '',
    description: '',
    interactionState: { hasInteracted: false },
    timestamp: Date.now(),
  });

  // Navigation history for rapid detection
  const navigationHistory = useRef<{ phase: string; timestamp: number }[]>([]);

  // Speech queue
  const speechQueue = useRef<SpeechItem[]>([]);
  const currentSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Timers
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rapidModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phase entry timestamp
  const phaseEnteredAt = useRef<number>(Date.now());

  // Speech synthesis available check
  const speechAvailable = useRef<boolean>(
    typeof window !== 'undefined' && 'speechSynthesis' in window
  );

  // ----------------------------------------------------------------------------
  // Utility Functions
  // ----------------------------------------------------------------------------

  const generateSpeechId = (): string => {
    return `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // ----------------------------------------------------------------------------
  // Speech Control Functions
  // ----------------------------------------------------------------------------

  const cancelCurrentSpeech = useCallback(() => {
    if (speechAvailable.current && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    currentSpeechRef.current = null;
    setIsSpeaking(false);
  }, []);

  const cancelAllSpeech = useCallback(() => {
    // Clear queue
    speechQueue.current = [];

    // Cancel current speech
    cancelCurrentSpeech();

    // Clear timers
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, [cancelCurrentSpeech]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!speechAvailable.current) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      currentSpeechRef.current = utterance;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      currentSpeechRef.current = null;
      onEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      currentSpeechRef.current = null;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const processQueue = useCallback(() => {
    if (speechQueue.current.length === 0) return;
    if (isSpeaking) return;

    const currentState = screenStateRef.current;

    // Find the highest priority valid speech item
    const validItems = speechQueue.current.filter(item => {
      // Check if speech is for current screen
      if (item.forPhase !== currentState.phase) return false;
      if (item.forSubScreen && item.forSubScreen !== currentState.subScreen) return false;

      // Check if speech is stale
      const age = Date.now() - item.createdAt;
      const maxAge = item.maxAge || 10000;
      if (age > maxAge) return false;

      return true;
    });

    if (validItems.length === 0) {
      // All items are invalid, clear queue
      speechQueue.current = [];
      return;
    }

    // Sort by priority (highest first)
    validItems.sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]);

    const itemToSpeak = validItems[0];

    // Remove from queue
    speechQueue.current = speechQueue.current.filter(i => i.id !== itemToSpeak.id);

    // Speak it
    speakText(itemToSpeak.text, () => {
      // Process next item after this one finishes
      processQueue();
    });
  }, [isSpeaking, speakText]);

  // ----------------------------------------------------------------------------
  // Rapid Progression Detection
  // ----------------------------------------------------------------------------

  const isRapidProgression = useCallback((): boolean => {
    const history = navigationHistory.current;
    if (history.length < mergedConfig.rapidCountThreshold) return false;

    // Check if recent transitions were all rapid
    const recentTransitions = history.slice(-mergedConfig.rapidCountThreshold);
    for (let i = 1; i < recentTransitions.length; i++) {
      const timeDiff = recentTransitions[i].timestamp - recentTransitions[i - 1].timestamp;
      if (timeDiff > mergedConfig.rapidThreshold) return false;
    }
    return true;
  }, [mergedConfig.rapidCountThreshold, mergedConfig.rapidThreshold]);

  const getAveragePhaseTime = useCallback((): number => {
    const history = navigationHistory.current;
    if (history.length < 2) return Infinity;

    let total = 0;
    for (let i = 1; i < history.length; i++) {
      total += history[i].timestamp - history[i - 1].timestamp;
    }
    return total / (history.length - 1);
  }, []);

  // ----------------------------------------------------------------------------
  // Decision Functions
  // ----------------------------------------------------------------------------

  const shouldSpeak = useCallback((priority: SpeechPriority): boolean => {
    // Critical always speaks (unless screen changed - handled elsewhere)
    if (priority === 'critical') return true;

    // In rapid mode, only critical speaks
    if (isInRapidMode) return false;

    // High priority speaks unless very rapid
    if (priority === 'high') {
      return !isRapidProgression();
    }

    // Medium priority needs user to be settled
    if (priority === 'medium') {
      return getAveragePhaseTime() > 5000;
    }

    // Low priority needs user to be taking their time
    if (priority === 'low') {
      return getAveragePhaseTime() > 15000;
    }

    return false;
  }, [isInRapidMode, isRapidProgression, getAveragePhaseTime]);

  const getRecommendedMessageLength = useCallback((): 'short' | 'medium' | 'long' => {
    if (!mergedConfig.adaptMessageLength) return 'medium';

    const avgTime = getAveragePhaseTime();

    if (avgTime < 5000) return 'short';
    if (avgTime < 15000) return 'medium';
    return 'long';
  }, [mergedConfig.adaptMessageLength, getAveragePhaseTime]);

  // ----------------------------------------------------------------------------
  // Screen State Management
  // ----------------------------------------------------------------------------

  const updateScreenState = useCallback((state: Partial<ScreenState>) => {
    const previousPhase = screenStateRef.current.phase;
    const previousSubScreen = screenStateRef.current.subScreen;

    const newState: ScreenState = {
      ...screenStateRef.current,
      ...state,
      timestamp: Date.now(),
    };

    screenStateRef.current = newState;

    // Check if this is a navigation (phase or subscreen change)
    const isNavigation =
      state.phase !== undefined && state.phase !== previousPhase ||
      state.subScreen !== undefined && state.subScreen !== previousSubScreen;

    if (isNavigation) {
      const now = Date.now();

      // Update navigation history
      navigationHistory.current.push({
        phase: newState.phase + (newState.subScreen ? `_${newState.subScreen}` : ''),
        timestamp: now,
      });

      // Keep only last 10 entries
      if (navigationHistory.current.length > 10) {
        navigationHistory.current.shift();
      }

      // Cancel speech on navigate
      if (mergedConfig.cancelOnNavigate) {
        cancelAllSpeech();
      }

      // Update phase entry time
      phaseEnteredAt.current = now;
      setCurrentPhase(newState.phase);
      setDwellTime(0);

      // Check for rapid progression
      const rapid = isRapidProgression();
      if (rapid && !isInRapidMode) {
        setIsInRapidMode(true);

        // Set timer to exit rapid mode after user settles
        if (rapidModeTimerRef.current) {
          clearTimeout(rapidModeTimerRef.current);
        }
      }

      // Emit screen change to AI system
      emitToAI('screen_changed', {
        phase: newState.phase,
        phaseLabel: newState.phaseLabel,
        subScreen: newState.subScreen,
        description: newState.description,
        isRapidProgression: rapid,
        timestamp: now,
      });
    }
  }, [cancelAllSpeech, mergedConfig.cancelOnNavigate, isRapidProgression, isInRapidMode]);

  const getCurrentScreenState = useCallback((): ScreenState => {
    return { ...screenStateRef.current };
  }, []);

  // ----------------------------------------------------------------------------
  // Speech Queueing
  // ----------------------------------------------------------------------------

  const queueSpeech = useCallback((
    text: string,
    priority: SpeechPriority = 'medium',
    options: Partial<SpeechItem> = {}
  ) => {
    const currentState = screenStateRef.current;

    // Check if we should even try to speak
    if (!shouldSpeak(priority)) {
      return;
    }

    const item: SpeechItem = {
      id: generateSpeechId(),
      text,
      priority,
      forPhase: currentState.phase,
      forSubScreen: currentState.subScreen,
      maxAge: options.maxAge || 10000,
      createdAt: Date.now(),
      ...options,
    };

    // For critical priority, interrupt current speech
    if (priority === 'critical') {
      cancelCurrentSpeech();
      // Add to front of queue
      speechQueue.current.unshift(item);
    } else {
      // Add to queue
      speechQueue.current.push(item);
    }

    // Process queue
    processQueue();
  }, [shouldSpeak, cancelCurrentSpeech, processQueue]);

  // ----------------------------------------------------------------------------
  // AI Event Emission
  // ----------------------------------------------------------------------------

  const emitToAI = useCallback((eventType: string, details: Record<string, unknown>) => {
    const event = new CustomEvent('aiVoiceEvent', {
      detail: {
        eventType,
        gameType,
        gameTitle,
        screenState: screenStateRef.current,
        isRapidProgression: isRapidProgression(),
        recommendedMessageLength: getRecommendedMessageLength(),
        ...details,
        timestamp: Date.now(),
      },
    });

    window.dispatchEvent(event);
  }, [gameType, gameTitle, isRapidProgression, getRecommendedMessageLength]);

  // ----------------------------------------------------------------------------
  // Dwell Time Tracking
  // ----------------------------------------------------------------------------

  useEffect(() => {
    // Update dwell time every 100ms
    dwellIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - phaseEnteredAt.current;
      setDwellTime(elapsed);

      // Check if we should exit rapid mode
      if (isInRapidMode && elapsed > mergedConfig.dwellTimeAfterRapid) {
        setIsInRapidMode(false);
      }
    }, 100);

    return () => {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
      }
    };
  }, [isInRapidMode, mergedConfig.dwellTimeAfterRapid]);

  // ----------------------------------------------------------------------------
  // Cleanup on Unmount
  // ----------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      cancelAllSpeech();
      if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
      if (rapidModeTimerRef.current) clearTimeout(rapidModeTimerRef.current);
    };
  }, [cancelAllSpeech]);

  // ----------------------------------------------------------------------------
  // Return
  // ----------------------------------------------------------------------------

  return {
    updateScreenState,
    getCurrentScreenState,
    queueSpeech,
    cancelAllSpeech,
    cancelCurrentSpeech,
    isRapidProgression,
    shouldSpeak,
    getRecommendedMessageLength,
    emitToAI,
    isSpeaking,
    isInRapidMode,
    currentPhase,
    dwellTime,
  };
}

// ============================================================================
// COMPANION HOOK: useDwellSpeech
// Automatically speaks after user has dwelled on a screen
// ============================================================================

export interface DwellSpeechConfig {
  phase: string;
  subScreen?: string;
  messages: {
    short: string;
    medium: string;
    long: string;
  };
  priority?: SpeechPriority;
  dwellTime?: number; // Override default dwell time
}

export function useDwellSpeech(
  voiceSync: UseAIVoiceSyncReturn,
  config: DwellSpeechConfig
) {
  const hasSpoken = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when phase/subscreen changes
    hasSpoken.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if we're on the right screen
    const currentState = voiceSync.getCurrentScreenState();
    if (currentState.phase !== config.phase) return;
    if (config.subScreen && currentState.subScreen !== config.subScreen) return;

    // Set up dwell timer
    const dwellTime = config.dwellTime || 2000;

    timeoutRef.current = setTimeout(() => {
      // Double-check we're still on the same screen
      const newState = voiceSync.getCurrentScreenState();
      if (newState.phase !== config.phase) return;
      if (config.subScreen && newState.subScreen !== config.subScreen) return;

      // Don't speak twice
      if (hasSpoken.current) return;
      hasSpoken.current = true;

      // Get appropriate message length
      const length = voiceSync.getRecommendedMessageLength();
      const message = config.messages[length];

      // Queue the speech
      voiceSync.queueSpeech(message, config.priority || 'medium');
    }, dwellTime);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [voiceSync, config, voiceSync.currentPhase]);
}

// ============================================================================
// COMPANION HOOK: useStruggleDetection
// Detects when user is struggling and offers help
// ============================================================================

export interface StruggleConfig {
  phase: string;
  inactivityThreshold?: number; // Default: 10000ms
  helpMessage: string;
  priority?: SpeechPriority;
}

export function useStruggleDetection(
  voiceSync: UseAIVoiceSyncReturn,
  hasInteracted: boolean,
  config: StruggleConfig
) {
  const helpOffered = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when phase changes
    const currentState = voiceSync.getCurrentScreenState();
    if (currentState.phase !== config.phase) {
      helpOffered.current = false;
      return;
    }

    // If user has interacted, don't offer help
    if (hasInteracted) {
      helpOffered.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // If help already offered, don't repeat
    if (helpOffered.current) return;

    // Set up inactivity timer
    const threshold = config.inactivityThreshold || 10000;

    timeoutRef.current = setTimeout(() => {
      // Check we're still on same phase and haven't interacted
      const newState = voiceSync.getCurrentScreenState();
      if (newState.phase !== config.phase) return;
      if (hasInteracted) return;
      if (helpOffered.current) return;

      helpOffered.current = true;
      voiceSync.queueSpeech(config.helpMessage, config.priority || 'high');
    }, threshold);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [voiceSync, hasInteracted, config, voiceSync.currentPhase]);
}

// ============================================================================
// UTILITY: Message Templates with Length Variants
// ============================================================================

export interface MessageVariants {
  short: string;
  medium: string;
  long: string;
}

export const createPhaseMessages = (
  phase: string,
  messages: MessageVariants
): DwellSpeechConfig => ({
  phase,
  messages,
  priority: 'medium',
  dwellTime: 2000,
});

// Common message templates
export const COMMON_MESSAGES = {
  experiment: {
    intro: {
      short: "Try the controls!",
      medium: "Use the sliders to explore how the variables interact.",
      long: "Welcome to the experiment. Use the sliders on the right to adjust the variables. Watch how the simulation responds in real-time as you make changes.",
    },
    hint: {
      short: "Try moving the sliders.",
      medium: "Drag the sliders to see how things change.",
      long: "It looks like you haven't tried the controls yet. Try dragging the sliders to see how the simulation responds. That's where the real learning happens!",
    },
  },
  prediction: {
    intro: {
      short: "What do you think?",
      medium: "Make your prediction before we run the experiment.",
      long: "Before we see what happens, I want you to make a prediction. Think about what you already know and pick the option that seems most likely to you.",
    },
  },
  review: {
    intro: {
      short: "Here's why.",
      medium: "Let's understand why this happens.",
      long: "Now that you've seen it in action, let's understand the physics behind what you observed. This is the key concept.",
    },
  },
  test: {
    intro: {
      short: "Good luck!",
      medium: "Take your time with each question.",
      long: "Time to test your understanding. Read each question carefully and take your time. You can always go back to review earlier questions.",
    },
    correct: {
      short: "Correct!",
      medium: "That's right! Great job.",
      long: "Excellent! That's exactly right. You're really understanding this concept.",
    },
    incorrect: {
      short: "Not quite.",
      medium: "Not quite. Let me explain why.",
      long: "That's not the right answer, but that's okay - this is how we learn. Let me explain what's actually happening.",
    },
  },
  mastery: {
    pass: {
      short: "Congratulations!",
      medium: "You've mastered this topic! Well done.",
      long: "Congratulations! You've demonstrated a solid understanding of this physics concept. You should be proud of what you've learned.",
    },
    fail: {
      short: "Keep practicing!",
      medium: "You're getting there. Review and try again.",
      long: "You're on the right track, but there's still more to learn. I recommend reviewing the lesson and trying the test again when you're ready.",
    },
  },
};

export default useAIVoiceSync;
