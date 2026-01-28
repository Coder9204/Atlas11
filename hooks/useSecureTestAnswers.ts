/**
 * SECURE TEST ANSWERS HOOK
 *
 * This hook provides secure answer validation for all games.
 * Answers are validated on the server - the correct answer is NEVER sent to the browser.
 *
 * Usage:
 * ```tsx
 * const { validateAnswer, submitTest, isValidating } = useSecureTestAnswers('center_of_mass');
 *
 * // When user selects an answer:
 * const result = await validateAnswer(questionIndex, selectedIndex);
 * // result = { correct: boolean, explanation: string }
 *
 * // When test is complete:
 * const finalResult = await submitTest(allAnswers);
 * // finalResult = { score: number, total: number, passed: boolean, results: boolean[] }
 * ```
 */

import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// ============================================================
// TYPES
// ============================================================

export interface ValidateAnswerResult {
  correct: boolean;
  explanation: string;
}

export interface SubmitTestResult {
  score: number;
  total: number;
  passed: boolean;
  results: boolean[]; // true/false for each question
}

export interface UseSecureTestAnswersReturn {
  /** Validate a single answer. Returns { correct, explanation } */
  validateAnswer: (questionIndex: number, selectedIndex: number) => Promise<ValidateAnswerResult>;

  /** Submit all answers at once. Returns { score, total, passed, results } */
  submitTest: (answers: number[]) => Promise<SubmitTestResult>;

  /** True while a validation request is in progress */
  isValidating: boolean;

  /** Error message if last validation failed */
  error: string | null;

  /** Clear the error state */
  clearError: () => void;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useSecureTestAnswers(gameId: string): UseSecureTestAnswersReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate a single answer against the server.
   */
  const validateAnswer = useCallback(async (
    questionIndex: number,
    selectedIndex: number
  ): Promise<ValidateAnswerResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const functions = getFunctions(getApp());
      const validateFn = httpsCallable<
        { gameId: string; questionIndex: number; selectedIndex: number },
        ValidateAnswerResult
      >(functions, 'validateTestAnswer');

      const result = await validateFn({
        gameId,
        questionIndex,
        selectedIndex
      });

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate answer. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [gameId]);

  /**
   * Submit all answers at once for final scoring.
   */
  const submitTest = useCallback(async (answers: number[]): Promise<SubmitTestResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const functions = getFunctions(getApp());
      const submitFn = httpsCallable<
        { gameId: string; answers: number[] },
        SubmitTestResult
      >(functions, 'submitTest');

      const result = await submitFn({
        gameId,
        answers
      });

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit test. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [gameId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    validateAnswer,
    submitTest,
    isValidating,
    error,
    clearError
  };
}

// ============================================================
// FALLBACK FOR OFFLINE/DEVELOPMENT MODE
// ============================================================

/**
 * Fallback hook for when Firebase is not available (offline/dev mode).
 * Uses local validation as a fallback.
 *
 * SECURITY WARNING: This should ONLY be used in development.
 * Production builds should always use useSecureTestAnswers.
 */
export function useLocalTestAnswers(
  questions: Array<{ correctIndex?: number; correct?: number; options?: Array<{ correct?: boolean }> }>
): UseSecureTestAnswersReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Console warning in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️ useLocalTestAnswers: Using local answer validation. ' +
      'This is insecure and should only be used in development.'
    );
  }

  const validateAnswer = useCallback(async (
    questionIndex: number,
    selectedIndex: number
  ): Promise<ValidateAnswerResult> => {
    setIsValidating(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const question = questions[questionIndex];
    if (!question) {
      setIsValidating(false);
      throw new Error('Question not found');
    }

    // Support different answer patterns
    let isCorrect = false;
    if (typeof question.correctIndex === 'number') {
      isCorrect = selectedIndex === question.correctIndex;
    } else if (typeof question.correct === 'number') {
      isCorrect = selectedIndex === question.correct;
    } else if (question.options) {
      isCorrect = question.options[selectedIndex]?.correct === true;
    }

    setIsValidating(false);

    return {
      correct: isCorrect,
      explanation: 'Explanation available after test completion.'
    };
  }, [questions]);

  const submitTest = useCallback(async (answers: number[]): Promise<SubmitTestResult> => {
    setIsValidating(true);

    await new Promise(resolve => setTimeout(resolve, 200));

    const results: boolean[] = [];
    let score = 0;

    for (let i = 0; i < answers.length; i++) {
      const question = questions[i];
      let isCorrect = false;

      if (typeof question?.correctIndex === 'number') {
        isCorrect = answers[i] === question.correctIndex;
      } else if (typeof question?.correct === 'number') {
        isCorrect = answers[i] === question.correct;
      } else if (question?.options) {
        isCorrect = question.options[answers[i]]?.correct === true;
      }

      results.push(isCorrect);
      if (isCorrect) score++;
    }

    setIsValidating(false);

    return {
      score,
      total: answers.length,
      passed: score >= Math.ceil(answers.length * 0.7),
      results
    };
  }, [questions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    validateAnswer,
    submitTest,
    isValidating,
    error,
    clearError
  };
}

// ============================================================
// HYBRID HOOK (Recommended for Migration)
// ============================================================

/**
 * Hybrid hook that tries server validation first, falls back to local.
 *
 * Use this during migration to ensure games work even if server
 * answers aren't configured yet.
 */
export function useTestAnswers(
  gameId: string,
  localQuestions: Array<{ correctIndex?: number; correct?: number; options?: Array<{ correct?: boolean }> }>
): UseSecureTestAnswersReturn & { isUsingServer: boolean } {
  const secure = useSecureTestAnswers(gameId);
  const local = useLocalTestAnswers(localQuestions);
  const [isUsingServer, setIsUsingServer] = useState(true);

  const validateAnswer = useCallback(async (
    questionIndex: number,
    selectedIndex: number
  ): Promise<ValidateAnswerResult> => {
    try {
      const result = await secure.validateAnswer(questionIndex, selectedIndex);
      setIsUsingServer(true);
      return result;
    } catch (err: any) {
      // If server validation fails (game not configured), fall back to local
      if (err.message?.includes('not found') || err.message?.includes('not properly configured')) {
        console.warn(`Game "${gameId}" not configured on server, using local validation`);
        setIsUsingServer(false);
        return local.validateAnswer(questionIndex, selectedIndex);
      }
      throw err;
    }
  }, [gameId, secure, local]);

  const submitTest = useCallback(async (answers: number[]): Promise<SubmitTestResult> => {
    try {
      const result = await secure.submitTest(answers);
      setIsUsingServer(true);
      return result;
    } catch (err: any) {
      if (err.message?.includes('not found') || err.message?.includes('not properly configured')) {
        console.warn(`Game "${gameId}" not configured on server, using local validation`);
        setIsUsingServer(false);
        return local.submitTest(answers);
      }
      throw err;
    }
  }, [gameId, secure, local]);

  return {
    validateAnswer,
    submitTest,
    isValidating: secure.isValidating || local.isValidating,
    error: secure.error || local.error,
    clearError: () => {
      secure.clearError();
      local.clearError();
    },
    isUsingServer
  };
}

export default useSecureTestAnswers;
