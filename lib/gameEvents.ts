import type { GameEvent } from '../components/GeneratedDiagram';

/**
 * Formats a GameEvent into a human-readable string for AI voice coach comprehension.
 * Shared between App.tsx (dashboard) and AICoachContext (in-game).
 */
export function formatGameEventForAI(event: GameEvent): string {
  const { eventType, gameType, gameTitle, details } = event;

  switch (eventType) {
    case 'game_started':
      return `[GAME EVENT] The learner just started the "${gameTitle}" interactive graphic (type: ${gameType}). They are on screen ${details.currentScreen || 1} of ${details.totalScreens || 'unknown'}. Be ready to guide them through the learning experience.`;

    case 'screen_change':
      return `[GAME EVENT] The learner moved to screen ${details.currentScreen} of ${details.totalScreens} in "${gameTitle}". ${details.phase ? `Current phase: ${details.phase}.` : ''} Watch their progress and offer guidance if they seem stuck.`;

    case 'prediction_made':
      return `[GAME EVENT] In "${gameTitle}", the learner made a prediction: "${details.prediction}". ${details.conceptName ? `This relates to the concept: ${details.conceptName}.` : ''} Wait to see if they're correct before revealing the answer.`;

    case 'answer_submitted':
      return `[GAME EVENT] The learner submitted an answer in "${gameTitle}". Their answer: ${JSON.stringify(details.actualValue)}. ${details.isCorrect !== undefined ? (details.isCorrect ? 'They got it CORRECT!' : 'They got it WRONG.') : ''} ${details.attemptCount ? `This was attempt #${details.attemptCount}.` : ''}`;

    case 'correct_answer':
      return `[GAME EVENT] CORRECT! The learner answered correctly in "${gameTitle}". ${details.conceptName ? `They demonstrated understanding of: ${details.conceptName}.` : ''} Celebrate their success briefly and reinforce the learning!`;

    case 'incorrect_answer':
      return `[GAME EVENT] INCORRECT. The learner got the wrong answer in "${gameTitle}". Expected: ${details.expectedValue}, Got: ${details.actualValue}. ${details.attemptCount ? `Attempt #${details.attemptCount}.` : ''} Offer encouragement and a helpful hint without giving away the answer.`;

    case 'slider_changed':
    case 'value_changed':
      return `[GAME EVENT] The learner adjusted "${details.variableName}" from ${details.oldValue} to ${details.newValue} in "${gameTitle}". ${details.newValue > details.oldValue ? 'They increased the value.' : 'They decreased the value.'} If they're exploring, let them discover. If stuck, offer guidance.`;

    case 'button_clicked':
      return `[GAME EVENT] The learner clicked "${details.buttonLabel}" in "${gameTitle}". Respond appropriately based on what action they took.`;

    case 'phase_changed':
      return `[GAME EVENT] The learner entered the "${details.phase}" phase in "${gameTitle}". ${details.phase === 'predict' ? 'They need to make a prediction.' : details.phase === 'play' ? 'They can now interact with the simulation.' : details.phase === 'review' ? 'Time to review what they learned.' : details.phase === 'test' ? 'Testing their understanding with a new scenario.' : ''}`;

    case 'hint_requested':
      return `[GAME EVENT] The learner requested a hint in "${gameTitle}". ${details.hint ? `The hint shown: "${details.hint}".` : ''} They might be struggling - offer additional support.`;

    case 'struggle_detected':
      return `[GAME EVENT] STRUGGLE DETECTED in "${gameTitle}". ${details.attemptCount ? `They've made ${details.attemptCount} attempts.` : ''} ${details.timeSpent ? `Time spent: ${Math.round(details.timeSpent / 1000)}s.` : ''} They may need encouragement or a different explanation approach.`;

    case 'game_completed':
      return `[GAME EVENT] The learner COMPLETED "${gameTitle}"! Final score: ${details.score || 'N/A'}. Mastery level: ${details.masteryLevel || 'N/A'}. Celebrate their achievement and summarize what they learned!`;

    case 'achievement_unlocked':
      return `[GAME EVENT] ACHIEVEMENT UNLOCKED in "${gameTitle}"! ${details.conceptName ? `Achievement: ${details.conceptName}.` : ''} Celebrate this milestone!`;

    case 'selection_made':
      return `[GAME EVENT] The learner selected "${details.selection}" in "${gameTitle}". ${details.isCorrect !== undefined ? (details.isCorrect ? 'Correct choice!' : 'Incorrect choice.') : ''}`;

    case 'timer_expired':
      return `[GAME EVENT] Time expired in "${gameTitle}". They may need a hint or different approach.`;

    default:
      return `[GAME EVENT] ${eventType} occurred in "${gameTitle}". Details: ${JSON.stringify(details)}`;
  }
}
