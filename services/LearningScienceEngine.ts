import { Concept, UserState } from '../types';

/**
 * Project Atlas Learning Science Engine
 * Implements:
 * 1. Spaced Repetition (Modified SM-2 Algorithm)
 * 2. Difficulty Calibration (Zone of Proximal Development)
 * 3. Mastery Tracking
 */

export class LearningScienceEngine {

    // --- CONSTANTS ---
    private static readonly MIN_EASE = 1.3;
    private static readonly DEFAULT_EASE = 2.5;
    private static readonly INTERVAL_MODIFIER = 1.0; // Can be used to speed up/slow down globally

    /**
     * Calculates the next review interval using the SM-2 algorithm.
     * 
     * @param concept The concept to update
     * @param performanceRating 0-5 rating of the user's performance
     *        5 - Perfect response, instant
     *        4 - Correct response after hesitation
     *        3 - Correct response recalled with serious difficulty
     *        2 - Incorrect response; where the correct one seemed easy to recall
     *        1 - Incorrect response; the correct one remembered
     *        0 - Complete blackout
     * @returns Updated Concept object
     */
    static calculateNextReview(concept: Concept, performanceRating: number): Concept {
        const ease = concept.easeFactor || this.DEFAULT_EASE;
        const consecutive = concept.consecutiveCorrect || 0;

        let newEase = ease;
        let newConsecutive = consecutive;
        let interval = 0; // In days

        if (performanceRating >= 3) {
            // Correct response
            if (consecutive === 0) {
                interval = 1;
            } else if (consecutive === 1) {
                interval = 6;
            } else {
                interval = Math.round((concept.nextReview - concept.lastReviewed) / 86400000 * ease);
            }
            newConsecutive++;
        } else {
            // Incorrect response - reset
            newConsecutive = 0;
            interval = 1;
        }

        // Update Ease Factor
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        newEase = ease + (0.1 - (5 - performanceRating) * (0.08 + (5 - performanceRating) * 0.02));
        if (newEase < this.MIN_EASE) newEase = this.MIN_EASE;

        const nextReviewDate = Date.now() + (interval * 24 * 60 * 60 * 1000 * this.INTERVAL_MODIFIER);

        return {
            ...concept,
            easeFactor: newEase,
            consecutiveCorrect: newConsecutive,
            lastReviewed: Date.now(),
            nextReview: nextReviewDate,
            mastery: this.calculateMastery(newEase, newConsecutive),
            exposure: performanceRating >= 3 ? 'practiced' : 'explained'
        };
    }

    /**
     * Estimates mastery (0-100) based on SM-2 parameters.
     */
    private static calculateMastery(ease: number, consecutive: number): number {
        // Heuristic: High ease + high consecutive = High Mastery
        const base = Math.min(consecutive * 15, 80); // Cap consecutive contribution
        const easeBonus = (ease - 1.3) * 10;
        return Math.min(Math.round(base + easeBonus), 100);
    }

    /**
     * Determines the optimal difficulty for the next interaction.
     * Based on recent performance window (if we had one) or current mastery.
     */
    static getRecommendedDifficulty(concept: Concept): 'novice' | 'intermediate' | 'advanced' | 'expert' {
        if (concept.mastery < 30) return 'novice';
        if (concept.mastery < 60) return 'intermediate';
        if (concept.mastery < 90) return 'advanced';
        return 'expert';
    }

    /**
     * Returns concepts that are due for review.
     */
    static getDueReviews(concepts: Record<string, Concept>): Concept[] {
        const now = Date.now();
        return Object.values(concepts)
            .filter(c => c.nextReview <= now)
            .sort((a, b) => a.nextReview - b.nextReview); // Most overdue first
    }
}
