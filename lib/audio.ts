/**
 * Audio utility for playing sound effects in the application
 */

type SoundType = 'click' | 'success' | 'failure' | 'transition' | 'correct' | 'incorrect' | 'complete';

// Frequency and duration configurations for different sound types
const soundConfigs: Record<SoundType, { frequency: number; duration: number }> = {
  click: { frequency: 800, duration: 0.05 },
  success: { frequency: 880, duration: 0.15 },
  failure: { frequency: 200, duration: 0.2 },
  transition: { frequency: 440, duration: 0.1 },
  correct: { frequency: 880, duration: 0.15 },
  incorrect: { frequency: 200, duration: 0.2 },
  complete: { frequency: 660, duration: 0.2 },
};

/**
 * Plays a sound effect using the Web Audio API
 * @param type - The type of sound to play
 */
export function playSound(type: SoundType): void {
  try {
    const config = soundConfigs[type] || soundConfigs.click;
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = config.frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch {
    // Silent fail if audio not available
  }
}
