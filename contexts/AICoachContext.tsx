import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { GeminiService } from '../services/gemini';
import { ATLAS_SYSTEM_INSTRUCTION } from '../services/gemini';
import { formatGameEventForAI } from '../lib/gameEvents';
import type { GameEvent } from '../components/GeneratedDiagram';
import { trackAICoachSessionStarted, trackAICoachMessageSent, trackAICoachHintRequested } from '../services/AnalyticsService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatTurn {
  role: 'user' | 'atlas';
  text: string;
  isStreaming?: boolean;
}

interface AICoachContextValue {
  // Session
  isSessionActive: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isRecording: boolean;
  isVoiceEnabled: boolean;

  // Chat
  transcriptions: ChatTurn[];

  // Game awareness
  isGameActive: boolean;
  currentGamePhase: string;
  currentGameTitle: string;

  // Actions
  startSession: () => Promise<void>;
  endSession: () => void;
  sendMessage: (text: string) => void;
  sendGameEvent: (event: Record<string, unknown>) => void;
  toggleVoice: () => void;
  toggleRecording: () => Promise<void>;
  stopAudio: () => void;
  requestHint: () => void;
  setGameActive: (active: boolean, slug?: string, title?: string) => void;
  setGamePhase: (phase: string) => void;

  // Availability
  isAvailable: boolean;
}

const AICoachContext = createContext<AICoachContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAICoach(): AICoachContextValue | null {
  return useContext(AICoachContext);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a human-readable title from a game slug (e.g. "inertia" → "Inertia") */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AICoachProvider({ children }: { children: React.ReactNode }) {
  // Check API key availability once
  const isAvailable = Boolean(
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_GEMINI_API_KEY
  );

  // ---- Session state ----
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [transcriptions, setTranscriptions] = useState<ChatTurn[]>([]);

  // ---- Game state ----
  const [isGameActive, setIsGameActiveState] = useState(false);
  const [currentGamePhase, setCurrentGamePhaseState] = useState('');
  const [currentGameTitle, setCurrentGameTitleState] = useState('');
  const currentSlugRef = useRef('');

  // ---- Refs for session internals ----
  const sessionObjectRef = useRef<any>(null);
  const isSessionActiveRef = useRef(false);
  const isVoiceEnabledRef = useRef(true);

  // Audio playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Microphone
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Streaming text accumulators
  const pendingAtlasTextRef = useRef('');
  const pendingUserTextRef = useRef('');

  // Throttling / dedup
  const lastSendTimeRef = useRef(0);
  const lastSentMsgRef = useRef('');
  const THROTTLE_MS = 400;
  const PRIORITY_THROTTLE_MS = 100;

  // Dedup for addMessage
  const lastMsgTextRef = useRef('');
  const lastMsgTimeRef = useRef(0);

  // ---- Keep refs synced ----
  const syncRef = <T,>(ref: React.MutableRefObject<T>, val: T) => { ref.current = val; };

  // ---------------------------------------------------------------------------
  // stopAudio — disconnect all playing AudioBufferSourceNodes
  // ---------------------------------------------------------------------------
  const stopAudio = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  // ---------------------------------------------------------------------------
  // safeSend — throttled, deduped message dispatch to Gemini session
  // ---------------------------------------------------------------------------
  const safeSend = useCallback((text: string, priority: 'high' | 'normal' | 'low' = 'normal') => {
    const now = Date.now();
    const elapsed = now - lastSendTimeRef.current;
    const threshold = priority === 'high' ? PRIORITY_THROTTLE_MS : THROTTLE_MS;

    if (priority === 'low' && elapsed < THROTTLE_MS) return false;
    if (elapsed < threshold) return false;
    if (priority !== 'high' && text === lastSentMsgRef.current && elapsed < 5000) return false;
    if (!isSessionActiveRef.current) return false;

    const session = sessionObjectRef.current;
    if (!session) return false;

    try {
      if (typeof session.send === 'function') {
        session.send([{ text }], true);
      } else if (typeof session.sendClientContent === 'function') {
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
      }
      lastSendTimeRef.current = now;
      lastSentMsgRef.current = text;
      return true;
    } catch (err) {
      console.warn('[AICoach safeSend]', err);
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // addMessage — deduplicated chat append
  // ---------------------------------------------------------------------------
  const addMessage = useCallback((role: 'user' | 'atlas', text: string) => {
    const now = Date.now();
    if (text === lastMsgTextRef.current && now - lastMsgTimeRef.current < 3000) return;
    lastMsgTextRef.current = text;
    lastMsgTimeRef.current = now;
    setTranscriptions(prev => [...prev, { role, text }]);
  }, []);

  // ---------------------------------------------------------------------------
  // startSession — lazy init of Gemini Live session
  // ---------------------------------------------------------------------------
  const startSession = useCallback(async () => {
    if (isSessionActiveRef.current || isConnecting) return;
    setIsConnecting(true);

    try {
      // Audio context for playback
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const gemini = new GeminiService();

      const gameContext = currentSlugRef.current
        ? `\n\n[GAME CONTEXT] The learner is playing the game "${slugToTitle(currentSlugRef.current)}" (slug: ${currentSlugRef.current}). Guide them through each phase of the game: hook → predict → play → review → test. Be phase-aware and respond to game events in real-time.`
        : '';

      const historyContext = 'Start of a fresh dialogue.' + gameContext;

      const session = await gemini.createLiveSession({
        onopen: () => {
          isSessionActiveRef.current = true;
          setIsSessionActive(true);
          setIsConnecting(false);
          trackAICoachSessionStarted(currentSlugRef.current || '');
        },
        onmessage: async (message: any) => {
          // --- Output transcription (AI text) ---
          if (message.serverContent?.outputTranscription) {
            pendingAtlasTextRef.current += message.serverContent.outputTranscription.text;
            setTranscriptions(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'atlas' && last.isStreaming) {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'atlas', text: pendingAtlasTextRef.current, isStreaming: true };
                return updated;
              }
              return [...prev, { role: 'atlas', text: pendingAtlasTextRef.current, isStreaming: true }];
            });
          }

          // --- Input transcription (user voice) ---
          if (message.serverContent?.inputTranscription) {
            pendingUserTextRef.current += message.serverContent.inputTranscription.text;
            setTranscriptions(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user' && last.isStreaming) {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'user', text: pendingUserTextRef.current, isStreaming: true };
                return updated;
              }
              return [...prev, { role: 'user', text: pendingUserTextRef.current, isStreaming: true }];
            });
          }

          // --- Turn complete ---
          if (message.serverContent?.turnComplete) {
            setTranscriptions(prev => prev.map(t => ({ ...t, isStreaming: false })));
            pendingAtlasTextRef.current = '';
            pendingUserTextRef.current = '';
          }

          // --- Audio playback ---
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && audioContextRef.current && isVoiceEnabledRef.current) {
            setIsSpeaking(true);
            const buffer = await GeminiService.decodeAudioData(
              GeminiService.decode(audioData),
              audioContextRef.current,
              24000,
              1,
            );
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            const startTime = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
            source.start(startTime);
            nextStartTimeRef.current = startTime + buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) setIsSpeaking(false);
            };
          }

          // --- Interrupted ---
          if (message.serverContent?.interrupted) {
            stopAudio();
          }
        },
        onerror: (e: any) => {
          console.error('[AICoach] session error', e);
          isSessionActiveRef.current = false;
          setIsSessionActive(false);
          setIsConnecting(false);
          sessionObjectRef.current = null;
        },
        onclose: () => {
          isSessionActiveRef.current = false;
          setIsSessionActive(false);
          setIsConnecting(false);
          sessionObjectRef.current = null;
        },
      }, historyContext);

      sessionObjectRef.current = session;
    } catch (err) {
      console.error('[AICoach] failed to start session', err);
      setIsConnecting(false);
    }
  }, [isConnecting, stopAudio]);

  // ---------------------------------------------------------------------------
  // endSession
  // ---------------------------------------------------------------------------
  const endSession = useCallback(() => {
    stopAudio();
    // Stop microphone
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }
    // Close session
    const session = sessionObjectRef.current;
    if (session) {
      try { session.close?.(); } catch {}
      sessionObjectRef.current = null;
    }
    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setIsRecording(false);
    setTranscriptions([]);
    pendingAtlasTextRef.current = '';
    pendingUserTextRef.current = '';
  }, [stopAudio]);

  // ---------------------------------------------------------------------------
  // sendMessage — user typed a chat message
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    trackAICoachMessageSent(currentSlugRef.current || '', currentGamePhase);

    // Build context-aware message
    let msg = text;
    if (isGameActive) {
      msg = `[CONTEXT] User is in "${currentGameTitle}", phase "${currentGamePhase}". [USER MESSAGE] ${text}`;
    }

    const session = sessionObjectRef.current;
    if (session) {
      try {
        if (typeof session.send === 'function') {
          session.send([{ text: msg }], true);
        } else if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: msg }] }], turnComplete: true });
        }
      } catch (err) {
        console.warn('[AICoach sendMessage]', err);
      }
    }
  }, [addMessage, isGameActive, currentGameTitle, currentGamePhase]);

  // ---------------------------------------------------------------------------
  // sendGameEvent — forward renderer events to Gemini
  // ---------------------------------------------------------------------------
  const sendGameEvent = useCallback((event: Record<string, unknown>) => {
    if (!isSessionActiveRef.current) return;
    try {
      const formatted = formatGameEventForAI(event as unknown as GameEvent);
      const eventType = (event.eventType as string) || (event.type as string) || '';
      const priority = eventType === 'phase_changed' || eventType === 'phase_change' ? 'high' : 'normal';
      safeSend(formatted, priority as 'high' | 'normal');
    } catch {
      // Silently ignore malformed events
    }
  }, [safeSend]);

  // ---------------------------------------------------------------------------
  // toggleVoice — enable/disable voice output
  // ---------------------------------------------------------------------------
  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => {
      const next = !prev;
      isVoiceEnabledRef.current = next;
      if (!next) stopAudio();
      return next;
    });
  }, [stopAudio]);

  // ---------------------------------------------------------------------------
  // toggleRecording — microphone on/off via AudioWorklet
  // ---------------------------------------------------------------------------
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close().catch(() => {});
        inputAudioContextRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      streamRef.current = stream;

      const actx = new AudioContext({ sampleRate: 16000 });
      inputAudioContextRef.current = actx;

      await actx.audioWorklet.addModule('/audio-processor.js');
      const source = actx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(actx, 'audio-processor');
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (e: MessageEvent) => {
        const session = sessionObjectRef.current;
        if (!session || !isSessionActiveRef.current) return;
        const pcmData = e.data as Float32Array;
        const int16 = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcmData[i] * 32768)));
        }
        try {
          session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: GeminiService.encode(new Uint8Array(int16.buffer)) } });
        } catch {}
      };

      source.connect(worklet);
      worklet.connect(actx.destination);
      setIsRecording(true);
    } catch (err) {
      console.warn('[AICoach] mic access denied', err);
    }
  }, [isRecording]);

  // ---------------------------------------------------------------------------
  // requestHint — sends a hint request for the current game phase
  // ---------------------------------------------------------------------------
  const requestHint = useCallback(() => {
    trackAICoachHintRequested(currentSlugRef.current || '', currentGamePhase);
    const msg = `[HINT REQUEST] The learner is asking for a hint in "${currentGameTitle}", currently in the "${currentGamePhase}" phase. Provide a scaffolded hint — guide them toward the answer without giving it away directly.`;
    safeSend(msg, 'normal');
  }, [safeSend, currentGameTitle, currentGamePhase]);

  // ---------------------------------------------------------------------------
  // setGameActive / setGamePhase — called by GameShell
  // ---------------------------------------------------------------------------
  const setGameActive = useCallback((active: boolean, slug?: string, title?: string) => {
    setIsGameActiveState(active);
    if (active && slug) {
      currentSlugRef.current = slug;
      const t = title || slugToTitle(slug);
      setCurrentGameTitleState(t);
    } else if (!active) {
      currentSlugRef.current = '';
      setCurrentGameTitleState('');
      setCurrentGamePhaseState('');
    }
  }, []);

  const setGamePhase = useCallback((phase: string) => {
    setCurrentGamePhaseState(phase);
    if (isSessionActiveRef.current) {
      safeSend(
        `[PHASE CHANGE] The learner just entered the "${phase}" phase in "${currentGameTitle}". Adjust your coaching accordingly.`,
        'high',
      );
    }
  }, [safeSend, currentGameTitle]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: AICoachContextValue = {
    isSessionActive,
    isConnecting,
    isSpeaking,
    isRecording,
    isVoiceEnabled,
    transcriptions,
    isGameActive,
    currentGamePhase,
    currentGameTitle,
    startSession,
    endSession,
    sendMessage,
    sendGameEvent,
    toggleVoice,
    toggleRecording,
    stopAudio,
    requestHint,
    setGameActive,
    setGamePhase,
    isAvailable,
  };

  return <AICoachContext.Provider value={value}>{children}</AICoachContext.Provider>;
}

export default AICoachContext;
