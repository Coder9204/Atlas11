import { useCallback, useRef, useState, useEffect } from 'react';

// Cross-platform AudioContext with proper fallbacks
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  try {
    return new AudioContextClass();
  } catch {
    return null;
  }
};

export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isAudioSupported, setIsAudioSupported] = useState(true);

  // Initialize audio on user gesture (required for mobile)
  const initAudio = useCallback(async () => {
    if (audioContextRef.current?.state === 'running') {
      setIsAudioEnabled(true);
      return true;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = getAudioContext();
      }

      if (!audioContextRef.current) {
        setIsAudioSupported(false);
        return false;
      }

      // Resume if suspended (mobile browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setIsAudioEnabled(true);
      return true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      setIsAudioSupported(false);
      return false;
    }
  }, []);

  // Play a simple beep/tone
  const playTone = useCallback((frequency = 440, duration = 0.1, volume = 0.3) => {
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      return;
    }

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Auto-init on first user interaction
  useEffect(() => {
    const handleUserGesture = () => {
      initAudio();
    };

    // Listen for various user gestures
    const events = ['touchstart', 'mousedown', 'keydown', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserGesture, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserGesture);
      });
    };
  }, [initAudio]);

  return {
    audioContext: audioContextRef.current,
    isAudioEnabled,
    isAudioSupported,
    initAudio,
    playTone,
  };
};

export default useAudio;
