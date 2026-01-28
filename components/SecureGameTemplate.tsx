/**
 * SECURE GAME TEMPLATE
 *
 * This is a reference template showing the CORRECT pattern for implementing
 * test questions with server-side answer validation.
 *
 * KEY SECURITY FEATURES:
 * 1. Correct answers are NEVER stored in this file
 * 2. Answer validation happens on the server via Firebase Functions
 * 3. The client only receives correct/incorrect feedback, never the actual answer
 *
 * TO USE THIS TEMPLATE:
 * 1. Copy this file and rename to YourGameRenderer.tsx
 * 2. Add your game-specific visualization in the renderPlayPhase function
 * 3. Update the questions array (WITHOUT correct answer marking)
 * 4. Add your answers to functions/src/gameAnswers.ts
 * 5. Update the GAME_ID constant
 */

import React, { useState, useCallback } from 'react';
import { useTestAnswers } from '@/hooks/useSecureTestAnswers';

// ============================================================
// GAME CONFIGURATION
// ============================================================

// IMPORTANT: This ID must match the key in functions/src/gameAnswers.ts
const GAME_ID = 'your_game_id';

// Questions array - NOTE: No correct answers here!
// The options are just display text. Correct answer is on the server.
const questions = [
  {
    scenario: "Context or setup for the question...",
    question: "What happens when you adjust the variable?",
    options: [
      "Option A - some answer",
      "Option B - another answer",
      "Option C - yet another answer",
      "Option D - final answer"
    ]
    // NOTE: No correctIndex or correct field!
  },
  // ... 9 more questions (10 total)
];

// ============================================================
// GAME PHASES
// ============================================================

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

// ============================================================
// MAIN COMPONENT
// ============================================================

interface SecureGameTemplateProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
}

const SecureGameTemplate: React.FC<SecureGameTemplateProps> = ({
  onComplete,
  onGameEvent
}) => {
  // ============================================================
  // STATE
  // ============================================================

  const [phase, setPhase] = useState<Phase>('hook');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // ============================================================
  // SECURE ANSWER VALIDATION HOOK
  // ============================================================

  const {
    validateAnswer,
    submitTest,
    isValidating,
    error: validationError
  } = useTestAnswers(GAME_ID, questions);

  // ============================================================
  // HANDLERS
  // ============================================================

  /**
   * Handle answer selection in test phase.
   * This validates the answer on the server.
   */
  const handleAnswerSelect = useCallback(async (selectedIndex: number) => {
    // Prevent re-answering
    if (testAnswers[currentQuestion] !== null || isValidating) return;

    try {
      // Validate answer on server
      const result = await validateAnswer(currentQuestion, selectedIndex);

      // Update local state
      const newAnswers = [...testAnswers];
      newAnswers[currentQuestion] = selectedIndex;
      setTestAnswers(newAnswers);

      // Update score if correct
      if (result.correct) {
        setTestScore(prev => prev + 1);
        // Play success sound/animation
        onGameEvent?.({ type: 'answer_correct', data: { question: currentQuestion } });
      } else {
        // Play error sound/animation
        onGameEvent?.({ type: 'answer_incorrect', data: { question: currentQuestion } });
      }

      // Show explanation
      setCurrentExplanation(result.explanation);
      setShowExplanation(true);

    } catch (error) {
      console.error('Failed to validate answer:', error);
      // Show error to user
    }
  }, [currentQuestion, testAnswers, isValidating, validateAnswer, onGameEvent]);

  /**
   * Move to next question or submit test.
   */
  const handleNextQuestion = useCallback(() => {
    setShowExplanation(false);
    setCurrentExplanation('');

    if (currentQuestion < 9) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // All questions answered - submit for final scoring
      handleSubmitTest();
    }
  }, [currentQuestion]);

  /**
   * Submit complete test for final scoring.
   */
  const handleSubmitTest = useCallback(async () => {
    try {
      // Convert null answers to 0 (shouldn't happen if UI prevents skipping)
      const answers = testAnswers.map(a => a ?? 0);

      const result = await submitTest(answers);

      setTestSubmitted(true);
      setTestScore(result.score);
      setTestPassed(result.passed);

      onGameEvent?.({
        type: 'test_complete',
        data: {
          score: result.score,
          passed: result.passed
        }
      });

      // Move to mastery phase
      setPhase('mastery');

    } catch (error) {
      console.error('Failed to submit test:', error);
    }
  }, [testAnswers, submitTest, onGameEvent]);

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  const renderTestPhase = () => {
    const question = questions[currentQuestion];

    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Progress indicator */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor:
                    testAnswers[i] !== null
                      ? '#22c55e'
                      : i === currentQuestion
                        ? '#3b82f6'
                        : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '20px' }}>
          {question.scenario && (
            <p style={{
              padding: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {question.scenario}
            </p>
          )}
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {question.question}
          </h3>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {question.options.map((option, index) => {
            const isSelected = testAnswers[currentQuestion] === index;
            const isDisabled = testAnswers[currentQuestion] !== null || isValidating;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isDisabled}
                style={{
                  padding: '16px',
                  border: isSelected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: isDisabled && !isSelected ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontWeight: 'bold', marginRight: '12px' }}>
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {isValidating && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            Checking your answer...
          </div>
        )}

        {/* Explanation (shown after answering) */}
        {showExplanation && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            borderLeft: '4px solid #f59e0b'
          }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              Explanation
            </h4>
            <p>{currentExplanation}</p>

            <button
              onClick={handleNextQuestion}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {currentQuestion < 9 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}

        {/* Error state */}
        {validationError && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#dc2626'
          }}>
            {validationError}
          </div>
        )}
      </div>
    );
  };

  const renderMasteryPhase = () => {
    return (
      <div style={{
        padding: '40px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: testPassed ? '#22c55e' : '#ef4444'
        }}>
          {testPassed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
        </h2>

        <div style={{
          fontSize: '64px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          {testScore}/10
        </div>

        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '40px'
        }}>
          {testPassed
            ? 'You passed the test! Great job understanding this concept.'
            : 'You need 7/10 to pass. Review the lesson and try again.'}
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          {!testPassed && (
            <button
              onClick={() => {
                setPhase('hook');
                setCurrentQuestion(0);
                setTestAnswers(Array(10).fill(null));
                setTestScore(0);
                setTestSubmitted(false);
              }}
              style={{
                padding: '16px 32px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Review Lesson
            </button>
          )}

          <button
            onClick={onComplete}
            style={{
              padding: '16px 32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {phase === 'test' && renderTestPhase()}
      {phase === 'mastery' && renderMasteryPhase()}
      {/* Add other phases... */}
    </div>
  );
};

export default SecureGameTemplate;

/**
 * =============================================================
 * MIGRATION CHECKLIST
 * =============================================================
 *
 * When converting an existing game to this secure pattern:
 *
 * □ 1. Identify the game ID (snake_case version of component name)
 *
 * □ 2. Add answers to server:
 *      - Open functions/src/gameAnswers.ts
 *      - Add entry to GAME_ANSWERS object with all 10 questions
 *      - Each question needs: { correctIndex: number, explanation: string }
 *
 * □ 3. Update component imports:
 *      import { useTestAnswers } from '@/hooks/useSecureTestAnswers';
 *
 * □ 4. Add the hook in component:
 *      const { validateAnswer, submitTest, isValidating } = useTestAnswers(GAME_ID, questions);
 *
 * □ 5. Update answer handling:
 *      - Change synchronous check to async validateAnswer() call
 *      - Use result.correct and result.explanation from server response
 *
 * □ 6. Remove correct answers from client:
 *      - Remove correctIndex/correct from questions array (optional but recommended)
 *      - The server will handle all answer checking
 *
 * □ 7. Deploy and test:
 *      - cd functions && npm run build && npm run deploy
 *      - Test in emulator first: npm run firebase:emulators
 *
 * □ 8. Verify in production:
 *      - Check DevTools Network tab - no correct answers in responses
 *      - Check DevTools Sources - no correct answers in bundle
 *
 * =============================================================
 */
