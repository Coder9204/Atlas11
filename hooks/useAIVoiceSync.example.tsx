'use client';

// ============================================================================
// EXAMPLE: How to use useAIVoiceSync in a Game Renderer
// This file demonstrates the integration patterns for AI voice synchronization
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  useAIVoiceSync,
  useDwellSpeech,
  useStruggleDetection,
  COMMON_MESSAGES,
  type ScreenState,
} from './useAIVoiceSync';

// ----------------------------------------------------------------------------
// Example Game Renderer with AI Voice Integration
// ----------------------------------------------------------------------------

interface ExampleGameRendererProps {
  onGameEvent?: (event: unknown) => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'test' | 'mastery';

const ExampleGameRenderer: React.FC<ExampleGameRendererProps> = ({ onGameEvent }) => {
  // Game state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // ----------------------------------------------------------------------------
  // STEP 1: Initialize the AI Voice Sync hook
  // ----------------------------------------------------------------------------
  const voiceSync = useAIVoiceSync(
    'example_game',      // gameType - unique identifier
    'Example Physics',   // gameTitle - human-readable name
    {
      // Optional: customize timing (defaults are usually fine)
      dwellTimeIntro: 2000,    // Wait 2 seconds before intro speech
      dwellTimeHint: 5000,     // Wait 5 seconds before offering hints
      rapidThreshold: 3000,    // 3 seconds between screens = rapid
    }
  );

  // ----------------------------------------------------------------------------
  // STEP 2: Update screen state whenever phase or context changes
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const screenDescriptions: Record<Phase, string> = {
      hook: 'Introduction screen with title and Begin button',
      predict: 'Prediction screen - user must select what they think will happen',
      play: `Experiment screen - slider at ${sliderValue}, user ${hasInteracted ? 'has' : 'has not'} interacted`,
      review: 'Review screen - explaining the physics concept',
      test: `Test screen - question ${1}, score ${testScore}`,
      mastery: `Mastery screen - final score ${testScore}`,
    };

    const phaseLabels: Record<Phase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Experiment',
      review: 'Understanding',
      test: 'Knowledge Test',
      mastery: 'Mastery',
    };

    // CRITICAL: Update screen state on every meaningful change
    voiceSync.updateScreenState({
      phase,
      phaseLabel: phaseLabels[phase],
      description: screenDescriptions[phase],
      interactionState: {
        hasInteracted,
        sliderValues: { mainSlider: sliderValue },
        selectedOption: prediction,
        score: testScore,
      },
    });
  }, [phase, sliderValue, hasInteracted, prediction, testScore, voiceSync]);

  // ----------------------------------------------------------------------------
  // STEP 3: Use dwell speech for phase introductions
  // ----------------------------------------------------------------------------

  // Automatically speak when user settles on the play phase
  useDwellSpeech(voiceSync, {
    phase: 'play',
    messages: COMMON_MESSAGES.experiment.intro,
    priority: 'medium',
    dwellTime: 2000, // Wait 2 seconds before speaking
  });

  // Automatically speak when user settles on the predict phase
  useDwellSpeech(voiceSync, {
    phase: 'predict',
    messages: COMMON_MESSAGES.prediction.intro,
    priority: 'medium',
    dwellTime: 2000,
  });

  // ----------------------------------------------------------------------------
  // STEP 4: Use struggle detection to offer help
  // ----------------------------------------------------------------------------

  // Offer help if user hasn't interacted with the experiment after 10 seconds
  useStruggleDetection(voiceSync, hasInteracted, {
    phase: 'play',
    inactivityThreshold: 10000, // 10 seconds
    helpMessage: COMMON_MESSAGES.experiment.hint.medium,
    priority: 'high',
  });

  // ----------------------------------------------------------------------------
  // STEP 5: Queue speech for important events
  // ----------------------------------------------------------------------------

  // Handle correct answer
  const handleCorrectAnswer = useCallback(() => {
    // CRITICAL priority = speaks immediately, interrupts other speech
    voiceSync.queueSpeech(
      COMMON_MESSAGES.test.correct.medium,
      'critical'
    );
    setTestScore(prev => prev + 1);
  }, [voiceSync]);

  // Handle incorrect answer
  const handleIncorrectAnswer = useCallback((explanation: string) => {
    // CRITICAL priority for feedback
    voiceSync.queueSpeech(
      `${COMMON_MESSAGES.test.incorrect.short} ${explanation}`,
      'critical'
    );
  }, [voiceSync]);

  // Handle discovery milestone
  const handleDiscovery = useCallback((discoveryText: string) => {
    // HIGH priority = speaks unless user is rapidly clicking through
    voiceSync.queueSpeech(
      `Great discovery! ${discoveryText}`,
      'high'
    );
  }, [voiceSync]);

  // ----------------------------------------------------------------------------
  // STEP 6: Navigation with voice sync
  // ----------------------------------------------------------------------------

  const goToPhase = useCallback((newPhase: Phase) => {
    // The voice sync will automatically:
    // 1. Cancel any in-progress speech
    // 2. Clear the speech queue
    // 3. Detect if this is rapid progression
    // 4. Wait for dwell time before speaking introduction

    setPhase(newPhase);

    // Emit to AI system
    voiceSync.emitToAI('phase_changed', {
      from: phase,
      to: newPhase,
    });
  }, [phase, voiceSync]);

  // ----------------------------------------------------------------------------
  // STEP 7: Handle slider with smooth updates (no speech spam)
  // ----------------------------------------------------------------------------

  const handleSliderChange = useCallback((value: number) => {
    setSliderValue(value);
    setHasInteracted(true);

    // DON'T queue speech on every slider change - too spammy
    // Instead, the screen state update will inform the AI of the new value
    // The AI can decide whether to comment based on the context
  }, []);

  // Detect significant changes worth commenting on
  useEffect(() => {
    // Example: comment when slider crosses threshold
    if (hasInteracted && sliderValue === 100) {
      handleDiscovery("You've reached the maximum value!");
    }
  }, [sliderValue, hasInteracted, handleDiscovery]);

  // ----------------------------------------------------------------------------
  // STEP 8: Render with voice-sync aware UI
  // ----------------------------------------------------------------------------

  return (
    <div style={{ padding: '20px' }}>
      {/* Debug info - remove in production */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: '#1e293b',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#94a3b8',
      }}>
        <div>Phase: {voiceSync.currentPhase}</div>
        <div>Dwell: {Math.round(voiceSync.dwellTime / 1000)}s</div>
        <div>Rapid Mode: {voiceSync.isInRapidMode ? 'YES' : 'no'}</div>
        <div>Speaking: {voiceSync.isSpeaking ? 'YES' : 'no'}</div>
        <div>Msg Length: {voiceSync.getRecommendedMessageLength()}</div>
      </div>

      {/* Phase content */}
      {phase === 'hook' && (
        <div>
          <h1>Welcome to Example Physics</h1>
          <button onClick={() => goToPhase('predict')}>
            Begin Experiment →
          </button>
        </div>
      )}

      {phase === 'predict' && (
        <div>
          <h2>Make Your Prediction</h2>
          {['A', 'B', 'C'].map(opt => (
            <button
              key={opt}
              onClick={() => {
                setPrediction(opt);
                voiceSync.queueSpeech(`You chose option ${opt}`, 'low');
              }}
              style={{
                background: prediction === opt ? '#22c55e' : '#334155',
                margin: '5px',
              }}
            >
              Option {opt}
            </button>
          ))}
          {prediction && (
            <button onClick={() => goToPhase('play')}>
              See What Happens →
            </button>
          )}
        </div>
      )}

      {phase === 'play' && (
        <div>
          <h2>Experiment</h2>
          <div>
            <label>Adjust the value: {sliderValue}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onInput={(e) => handleSliderChange(Number((e.target as HTMLInputElement).value))}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
            />
          </div>
          <button onClick={() => goToPhase('review')}>
            I Understand →
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div>
          <h2>Understanding the Concept</h2>
          <p>Here's why this happens...</p>
          <button onClick={() => goToPhase('test')}>
            Take the Test →
          </button>
        </div>
      )}

      {phase === 'test' && (
        <div>
          <h2>Knowledge Test</h2>
          <p>Score: {testScore}</p>
          <button onClick={handleCorrectAnswer}>Simulate Correct Answer</button>
          <button onClick={() => handleIncorrectAnswer('The correct answer is B because...')}>
            Simulate Wrong Answer
          </button>
          <button onClick={() => goToPhase('mastery')}>
            Complete Test →
          </button>
        </div>
      )}

      {phase === 'mastery' && (
        <div>
          <h2>Congratulations!</h2>
          <p>Final Score: {testScore}</p>
          <button onClick={() => {
            // Queue appropriate message based on pass/fail
            const passed = testScore >= 7;
            voiceSync.queueSpeech(
              passed ? COMMON_MESSAGES.mastery.pass.medium : COMMON_MESSAGES.mastery.fail.medium,
              'high'
            );
          }}>
            Hear Results
          </button>
        </div>
      )}
    </div>
  );
};

export default ExampleGameRenderer;

// ============================================================================
// QUICK REFERENCE: When to use each speech priority
// ============================================================================
/*

CRITICAL - Use for:
  - Correct/incorrect answer feedback
  - Test completion
  - Error states
  - User-requested speech

HIGH - Use for:
  - Discovery milestones
  - Struggle detection hints
  - Important phase transitions

MEDIUM - Use for:
  - Phase introductions (after dwell time)
  - App tab introductions
  - General explanations

LOW - Use for:
  - Fun facts
  - Encouragement
  - Optional elaboration

*/

// ============================================================================
// QUICK REFERENCE: Key patterns
// ============================================================================
/*

1. ALWAYS update screen state when phase/context changes:
   voiceSync.updateScreenState({ phase, description, ... })

2. Use dwell speech hooks for automatic introductions:
   useDwellSpeech(voiceSync, { phase: 'play', messages: {...}, ... })

3. Use struggle detection for help:
   useStruggleDetection(voiceSync, hasInteracted, { ... })

4. Queue speech with appropriate priority:
   voiceSync.queueSpeech(text, 'critical' | 'high' | 'medium' | 'low')

5. The hook automatically:
   - Cancels speech on navigation
   - Detects rapid progression and goes silent
   - Adapts message length to user pace
   - Validates speech is for current screen before playing

*/
