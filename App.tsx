import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiService } from './services/gemini';
import { LearningScienceEngine } from './services/LearningScienceEngine';
import { VisualContext, UserState, Concept } from './types';
import Sidebar from './components/Sidebar';
import ConversationInterface from './components/ConversationInterface';
import VisualPanel from './components/VisualPanel';
import CoachAvatar from './components/CoachAvatar';
import { GameEvent } from './components/GeneratedDiagram';
import { formatGameEventForAI } from './lib/gameEvents';

interface ChatTurn {
  role: 'user' | 'atlas';
  text: string;
  isStreaming?: boolean;
}

const App: React.FC = () => {
  const [visualContext, setVisualContext] = useState<VisualContext>({ type: 'none', data: null });
  const visualContextRef = useRef<VisualContext>(visualContext); // Ref to track current context for callbacks
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserState>({
    name: "Learner",
    profile: {
      goals: ["Understand financial modeling"],
      interests: ["Economics", "Startups"],
      background: "Undergraduate Student",
      preferences: {
        pace: 'moderate',
        style: 'visual'
      }
    },
    concepts: {
      "compound_interest": {
        id: "ci_1",
        name: "Compound Interest",
        mastery: 45,
        exposure: 'explained',
        lastReviewed: Date.now(),
        nextReview: Date.now() + 86400000,
        prerequisites: []
      },
      "applied_finance": {
        id: "af_1",
        name: "Applied Finance",
        mastery: 10,
        exposure: 'none',
        lastReviewed: Date.now(),
        nextReview: Date.now(),
        prerequisites: ["compound_interest"]
      }
    }
  });

  const [notes, setNotes] = useState<string[]>([]);
  const [archive, setArchive] = useState<VisualContext[]>([]);
  const [transcriptions, setTranscriptions] = useState<ChatTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // Mobile chat modal state
  // Smart Dashboard state - can be updated by AI
  const [dashboardKeyPoints, setDashboardKeyPoints] = useState<string[]>([]);

  // Navigation history for back/forward between modules
  const [navigationHistory, setNavigationHistory] = useState<VisualContext[]>([{ type: 'none', data: null }]);
  const [navigationIndex, setNavigationIndex] = useState(0);
  const isNavigatingRef = useRef(false); // Prevent history recording during navigation

  // Game progress persistence - save to localStorage
  const PROGRESS_VERSION = 3; // Increment this to invalidate old saved progress (bumped to clear ALL stale data)
  const PROGRESS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // One-time cleanup of ALL old localStorage game progress on app load
  useEffect(() => {
    try {
      const cleanupKey = 'atlas_cleanup_version';
      const lastCleanupVersion = localStorage.getItem(cleanupKey);

      if (!lastCleanupVersion || parseInt(lastCleanupVersion) < PROGRESS_VERSION) {
        console.log('[Cleanup] Performing one-time cleanup of old game progress data...');

        // Find and remove ALL atlas game progress items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('atlas_game_progress_')) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => {
          console.log('[Cleanup] Removing old progress:', key);
          localStorage.removeItem(key);
        });

        // Mark cleanup as done for this version
        localStorage.setItem(cleanupKey, String(PROGRESS_VERSION));
        console.log('[Cleanup] Done. Removed', keysToRemove.length, 'old progress items.');
      }
    } catch (e) {
      console.warn('[Cleanup] Error during localStorage cleanup:', e);
    }
  }, []);

  // Listen for returnToDashboard event from games
  useEffect(() => {
    const handleReturnToDashboard = () => {
      console.log('[App] Return to dashboard requested');
      // Archive current visual if not none
      setVisualContext(prev => {
        if (prev.type !== 'none') {
          setArchive(oldArchive => [...oldArchive, prev]);
        }
        return { type: 'none', data: null };
      });
    };

    window.addEventListener('returnToDashboard', handleReturnToDashboard);
    return () => window.removeEventListener('returnToDashboard', handleReturnToDashboard);
  }, []);

  type GameProgress = {
    gameId: string;
    phase: string;
    prediction?: string;
    testQuestion?: number;
    testAnswers?: (string | null)[];
    transferAppNum?: number;
    completed: boolean;
    lastUpdated: number;
    version?: number; // Added for version checking
    sessionId?: string; // Track which browser session this progress is from
  };

  // Unique ID for this page load session - used to distinguish "user just changed phase" from "user came back later"
  const pageLoadSessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`).current;

  // Load saved progress from localStorage (with version and expiry checks)
  const loadGameProgress = (gameId: string): GameProgress | null => {
    try {
      const saved = localStorage.getItem(`atlas_game_progress_${gameId}`);
      if (!saved) return null;

      const progress = JSON.parse(saved) as GameProgress;

      // Check version - invalidate old progress
      if (!progress.version || progress.version < PROGRESS_VERSION) {
        console.log('[LoadProgress] Invalidating old progress (version mismatch):', gameId);
        localStorage.removeItem(`atlas_game_progress_${gameId}`);
        return null;
      }

      // Check expiry - invalidate progress older than 7 days
      if (Date.now() - progress.lastUpdated > PROGRESS_EXPIRY_MS) {
        console.log('[LoadProgress] Invalidating expired progress:', gameId);
        localStorage.removeItem(`atlas_game_progress_${gameId}`);
        return null;
      }

      return progress;
    } catch { return null; }
  };

  // Save progress to localStorage (with version and sessionId)
  const saveGameProgress = (progress: GameProgress) => {
    try {
      const progressWithMeta = { ...progress, version: PROGRESS_VERSION, sessionId: pageLoadSessionId };
      localStorage.setItem(`atlas_game_progress_${progress.gameId}`, JSON.stringify(progressWithMeta));
    } catch (e) { console.warn('Could not save game progress:', e); }
  };

  // Clear progress for a game
  const clearGameProgress = (gameId: string) => {
    try {
      localStorage.removeItem(`atlas_game_progress_${gameId}`);
    } catch (e) { console.warn('Could not clear game progress:', e); }
  };

  // Game coaching state
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentGamePhase, setCurrentGamePhase] = useState<string>('');
  const [currentGameTitle, setCurrentGameTitle] = useState<string>('');
  const [currentGameId, setCurrentGameId] = useState<string>('');
  const [guidedModeEnabled, setGuidedModeEnabled] = useState(true);
  const [currentTestQuestion, setCurrentTestQuestion] = useState<number>(1);
  const [currentQuestionContent, setCurrentQuestionContent] = useState<{scenario: string, question: string, options: string}>({scenario: '', question: '', options: ''});
  const [lastPrediction, setLastPrediction] = useState<string>('');
  const [currentTransferApp, setCurrentTransferApp] = useState<{num: number, title: string, description: string}>({num: 1, title: 'Quantum Computing', description: ''});
  const [lastGuideMessage, setLastGuideMessage] = useState<string>('');
  const [shownHalfwayMessage, setShownHalfwayMessage] = useState<boolean>(false);
  const [showResumePrompt, setShowResumePrompt] = useState<{gameId: string, phase: string} | null>(null);
  const resumePromptShownRef = useRef<string | null>(null); // Track which game has shown resume prompt

  // Deduplication refs to prevent repeated messages
  const lastAtlasMessageRef = useRef<string>('');
  const lastAtlasMessageTimeRef = useRef<number>(0);

  // Voice coaching refs to prevent jamming and duplicates
  const lastSpokenPhaseRef = useRef<string>('');
  const speechDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const gameVisualStateRef = useRef<{
    electronCount: number;
    pattern: string;
    observerMode: boolean;
    slitConfig: string;
  }>({ electronCount: 0, pattern: 'none', observerMode: false, slitConfig: 'both_open' });

  const pendingAtlasTextRef = useRef<string>("");
  const pendingUserTextRef = useRef<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionObjectRef = useRef<any>(null); // Direct reference to the session object
  const streamRef = useRef<MediaStream | null>(null);
  const videoFrameIntervalRef = useRef<number | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const isVoiceOutputEnabledRef = useRef<boolean>(true);

  // Session message throttling to prevent spam
  const lastSessionSendRef = useRef<number>(0);
  const lastSentMessageRef = useRef<string>('');
  const SESSION_SEND_THROTTLE_MS = 400; // Minimum time between normal sends
  const PRIORITY_THROTTLE_MS = 100; // Minimum time for priority messages (phase changes)

  // Current location tracking - ensures AI always knows where user is
  const currentLocationRef = useRef<{ phase: string; screen: number; timestamp: number }>({
    phase: '', screen: 0, timestamp: 0
  });
  const pendingLocationUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Safe session send helper - prevents sending to closed/invalid sessions
  // priority: 'high' = phase changes (bypass most throttling, interrupt audio)
  //           'normal' = regular events
  //           'low' = background updates (can be dropped if throttled)
  const safeSend = useCallback((text: string, isSilent: boolean = true, priority: 'high' | 'normal' | 'low' = 'normal') => {
    const now = Date.now();
    const timeSinceLast = now - lastSessionSendRef.current;

    // Determine throttle based on priority
    const throttleMs = priority === 'high' ? PRIORITY_THROTTLE_MS : SESSION_SEND_THROTTLE_MS;

    // Low priority messages get dropped if throttled
    if (priority === 'low' && timeSinceLast < SESSION_SEND_THROTTLE_MS) {
      return false;
    }

    // Throttle sends to prevent flooding (but high priority has lower threshold)
    if (timeSinceLast < throttleMs) {
      return false;
    }

    // Prevent duplicate messages (but allow if priority is high)
    if (priority !== 'high' && text === lastSentMessageRef.current && timeSinceLast < 5000) {
      return false;
    }

    // Check if session is still active
    if (!isSessionActiveRef.current) {
      return false;
    }

    // Try to send
    const session = sessionObjectRef.current;
    if (session) {
      try {
        if (typeof session.send === 'function') {
          session.send([{ text }], isSilent);
          lastSessionSendRef.current = now;
          lastSentMessageRef.current = text;
          return true;
        } else if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
          lastSessionSendRef.current = now;
          lastSentMessageRef.current = text;
          return true;
        }
      } catch (err) {
        console.warn('[safeSend] Error sending message:', err);
        return false;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isVoiceOutputEnabledRef.current = isVoiceOutputEnabled;
  }, [isVoiceOutputEnabled]);

  // Track navigation history when visual context changes (not during navigation)
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    // Only add to history if this is a new context (not the same as current)
    setNavigationHistory(prev => {
      const currentInHistory = prev[navigationIndex];
      // Check if context actually changed
      if (currentInHistory?.type === visualContext.type &&
          JSON.stringify(currentInHistory?.data) === JSON.stringify(visualContext.data)) {
        return prev;
      }

      // Truncate forward history if we're not at the end
      const newHistory = prev.slice(0, navigationIndex + 1);
      return [...newHistory, visualContext];
    });

    setNavigationIndex(prev => {
      const currentHistory = navigationHistory;
      const currentInHistory = currentHistory[prev];
      if (currentInHistory?.type === visualContext.type &&
          JSON.stringify(currentInHistory?.data) === JSON.stringify(visualContext.data)) {
        return prev;
      }
      return currentHistory.length; // Move to end
    });
  }, [visualContext]);

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    if (navigationIndex > 0) {
      isNavigatingRef.current = true;
      const prevContext = navigationHistory[navigationIndex - 1];
      setNavigationIndex(navigationIndex - 1);
      setVisualContext(prevContext);
    }
  }, [navigationIndex, navigationHistory]);

  const handleGoForward = useCallback(() => {
    if (navigationIndex < navigationHistory.length - 1) {
      isNavigatingRef.current = true;
      const nextContext = navigationHistory[navigationIndex + 1];
      setNavigationIndex(navigationIndex + 1);
      setVisualContext(nextContext);
    }
  }, [navigationIndex, navigationHistory]);

  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex < navigationHistory.length - 1;

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  // Immediately sync current location with AI - used after rapid navigation
  const syncCurrentLocation = useCallback((phase: string, screen: number, forceInterrupt: boolean = false) => {
    const now = Date.now();
    currentLocationRef.current = { phase, screen, timestamp: now };

    // Clear any pending location update
    if (pendingLocationUpdateRef.current) {
      clearTimeout(pendingLocationUpdateRef.current);
      pendingLocationUpdateRef.current = null;
    }

    // If force interrupt, stop all audio and send immediate update
    if (forceInterrupt) {
      stopAllAudio();
    }

    // Debounce the location sync (wait 150ms for rapid navigation to settle)
    pendingLocationUpdateRef.current = setTimeout(() => {
      // Only send if this is still the current location
      if (currentLocationRef.current.timestamp === now && isSessionActiveRef.current) {
        const locationUpdate = `[LOCATION SYNC] User is NOW on: Phase="${phase}", Screen ${screen}/10. Any previous guidance about other phases is STALE - focus ONLY on current phase.`;
        safeSend(locationUpdate, true, 'high');
      }
    }, 150);
  }, [safeSend, stopAllAudio]);

  // Full-screen games that should NOT be interrupted by other content
  const fullScreenGames = [
    'wave_particle_duality', 'dispersion', 'thin_film', 'ray_tracing', 'diffraction',
    'polarization', 'scattering', 'spectroscopy', 'photoelectric_effect'
  ];

  // Keep ref in sync with state (for use in callbacks that might have stale closures)
  useEffect(() => {
    visualContextRef.current = visualContext;
  }, [visualContext]);

  // Check if a full-screen game is currently active - uses ref to avoid stale closure
  const isFullScreenGameActive = () => {
    const ctx = visualContextRef.current;
    return ctx.type === 'diagram' &&
           ctx.data?.type &&
           fullScreenGames.includes(ctx.data.type);
  };

  const handleFunctionCall = async (fc: any) => {
    let result: any = { status: "success" };

    // Block ALL context-changing calls when full-screen game is active
    const contextChangingCalls = [
      'triggerAssessment', 'generateEducationalPoster', 'playVideo', 'playPodcast',
      'showBriefing', 'openWhiteboard', 'generateDocument', 'switchContent',
      'navigateBack', 'navigateForward'
    ];

    if (contextChangingCalls.includes(fc.name) && isFullScreenGameActive()) {
      console.log(`[App] Blocking ${fc.name} - full-screen game active:`, visualContextRef.current.data?.type);
      return { status: "blocked", reason: "Full-screen game is active. Use the game's navigation instead." };
    }

    switch (fc.name) {
      case 'startCourse':
        setActiveTopic(fc.args.topic);
        break;
      case 'triggerAssessment':
        setVisualContext({ type: 'assessment', data: fc.args });
        break;
      case 'generateEducationalPoster':
        if (!(await (window as any).aistudio.hasSelectedApiKey())) {
          await (window as any).aistudio.openSelectKey();
        }
        const gemini = new GeminiService();
        const url = await gemini.generateImage(fc.args.prompt);
        setVisualContext({ type: 'diagram', data: { type: 'poster', data: url, title: fc.args.title || 'Concept Artifact' } });
        break;
      case 'playVideo':
        setVisualContext({ type: 'youtube', data: fc.args });
        break;
      case 'controlMedia':
        setVisualContext(prev => ({
          ...prev,
          command: { action: fc.args.action, timestamp: fc.args.timestamp, id: Math.random().toString(36).substr(2, 9) }
        }));
        break;
      case 'playPodcast': setVisualContext({ type: 'podcast', data: fc.args }); break;
      case 'showBriefing': setVisualContext({ type: 'briefing', data: fc.args }); break;
      case 'showDiagram':
        // Allow showDiagram only if it's showing the same game or not a full-screen game
        if (isFullScreenGameActive() && fc.args.type !== visualContextRef.current.data?.type) {
          console.log('[App] Blocking showDiagram - different full-screen game active');
          return { status: "blocked", reason: "Full-screen game is active." };
        }
        setVisualContext({ type: 'diagram', data: fc.args });
        break;
      case 'openWhiteboard': setVisualContext({ type: 'whiteboard', data: fc.args }); break;
      case 'generateDocument': setVisualContext({ type: 'document', data: fc.args }); break;
      case 'switchContent':
        if (fc.args.target === 'previous' || fc.args.index !== undefined) {
          // Restore from archive
          const idx = fc.args.index !== undefined ? fc.args.index : archive.length - 1;
          if (archive[idx]) {
            const restored = archive[idx];
            setArchive(prev => prev.filter((_, i) => i !== idx));
            setVisualContext(prev => {
              if (prev.type !== 'none') setArchive(a => [...a, prev]);
              return restored;
            });
          }
        } else {
          // Find most recent of type
          const foundIdx = archive.findIndex(item => item.type === fc.args.target);
          if (foundIdx !== -1) {
            const restored = archive[foundIdx];
            setArchive(prev => prev.filter((_, i) => i !== foundIdx));
            setVisualContext(prev => {
              if (prev.type !== 'none') setArchive(a => [...a, prev]);
              return restored;
            });
          }
        }
        break;
      case 'stopSpeaking': stopAllAudio(); break;
      case 'navigateBack':
        if (navigationIndex > 0) {
          isNavigatingRef.current = true;
          const prevContext = navigationHistory[navigationIndex - 1];
          setNavigationIndex(navigationIndex - 1);
          setVisualContext(prevContext);
          result = { status: "success", message: `Navigated back to ${prevContext.type === 'diagram' ? prevContext.data?.title || 'previous module' : prevContext.type}` };
        } else {
          result = { status: "error", message: "No previous module in history to go back to" };
        }
        break;
      case 'navigateForward':
        if (navigationIndex < navigationHistory.length - 1) {
          isNavigatingRef.current = true;
          const nextContext = navigationHistory[navigationIndex + 1];
          setNavigationIndex(navigationIndex + 1);
          setVisualContext(nextContext);
          result = { status: "success", message: `Navigated forward to ${nextContext.type === 'diagram' ? nextContext.data?.title || 'next module' : nextContext.type}` };
        } else {
          result = { status: "error", message: "No next module in history to go forward to" };
        }
        break;
      case 'getNavigationState':
        result = {
          status: "success",
          canGoBack: navigationIndex > 0,
          canGoForward: navigationIndex < navigationHistory.length - 1,
          currentModule: visualContext.type === 'diagram' ? visualContext.data?.title : visualContext.type,
          historyLength: navigationHistory.length,
          currentPosition: navigationIndex + 1
        };
        break;
      case 'updateSmartDashboard':
        // Update the dashboard with new topic and key points from AI
        if (fc.args.topic) {
          setActiveTopic(fc.args.topic);
        }
        if (fc.args.keyPoints && Array.isArray(fc.args.keyPoints)) {
          setDashboardKeyPoints(fc.args.keyPoints);
        }
        // If currently viewing dashboard, this will immediately update
        result = { status: "success", message: "Dashboard updated with new insights" };
        break;
    }
    // Send tool response directly (no throttle - must respond to function calls)
    const session = sessionObjectRef.current;
    if (session) {
      try {
        session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: result }] });
      } catch (err) {
        console.warn('[handleFunctionCall] Error sending tool response:', err);
      }
    }
  };

  const startTutorSession = async () => {
    if (isSessionActive) return;
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const gemini = new GeminiService();

    // API KEY CHECK
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
    if (!apiKey) {
      alert("Missing API Key. Please set VITE_GEMINI_API_KEY in your .env file.");
      return;
    }

    // HISTORY INJECTION: Crucial for session memory
    const historyString = transcriptions.length > 0
      ? transcriptions.filter(t => !t.isStreaming).map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n')
      : "Start of a fresh dialogue.";

    // LEARNING ENGINE CONTEXT INJECTION
    const dueReviews = LearningScienceEngine.getDueReviews(userState.concepts);

    // Build visual context description
    const getVisualContextDescription = () => {
      if (visualContext.type === 'none') return "No visual currently displayed - showing dashboard.";
      if (visualContext.type === 'diagram') {
        const title = visualContext.data?.title || 'Unknown';
        const type = visualContext.data?.type || 'Unknown';
        return `DIAGRAM/GAME: "${title}" (type: ${type}). ${currentGamePhase ? `Current phase: ${currentGamePhase}.` : ''} ${currentGameTitle ? `Game title: ${currentGameTitle}.` : ''} The learner is actively viewing this interactive module.`;
      }
      if (visualContext.type === 'youtube') return `YOUTUBE VIDEO: ${visualContext.data?.videoId || 'Unknown video'}. The learner is watching a video.`;
      if (visualContext.type === 'podcast') return `PODCAST: "${visualContext.data?.title || 'Unknown'}" by ${visualContext.data?.artist || 'Unknown artist'}. The learner is listening to audio content.`;
      if (visualContext.type === 'whiteboard') return "WHITEBOARD: The learner is working on a whiteboard/drawing.";
      if (visualContext.type === 'document') return `DOCUMENT: "${visualContext.data?.title || 'Unknown'}" (${visualContext.data?.type || 'document'}). The learner is reading this document.`;
      if (visualContext.type === 'screen') return "SCREEN SHARE: The learner is sharing their screen with you - you can see what they see.";
      if (visualContext.type === 'briefing') return `BRIEFING: "${visualContext.data?.title || 'Unknown'}". The learner is reading a briefing.`;
      if (visualContext.type === 'assessment') return "ASSESSMENT/QUIZ: The learner is taking an assessment.";
      return `Visual type: ${visualContext.type}`;
    };

    const contextString = `
    [CURRENT USER STATE]
    Name: ${userState.name}
    Interests: ${userState.profile.interests.join(', ')}

    [DUE FOR REVIEW (SPACED REPETITION)]
    ${dueReviews.length > 0 ? dueReviews.map(c => `- ${c.name} (Mastery: ${c.mastery}%)`).join('\n') : "No specific reviews due."}

    [ACTIVE CONTEXT]
    Topic: ${activeTopic || "General"}

    [CURRENTLY ON SCREEN - VERY IMPORTANT]
    ${getVisualContextDescription()}
    CRITICAL: If the user mentions something on their screen, refers to "this", "this module", "what I'm looking at", or names the current visual, DO NOT try to open/build a new module. They are referring to what is ALREADY displayed. Respond to questions about the current visual context instead.
    `;

    try {
      const promise = gemini.createLiveSession({
        onopen: () => setIsSessionActive(true),
        onmessage: async (message) => {
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) handleFunctionCall(fc);
          }

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

          if (message.serverContent?.turnComplete) {
            setTranscriptions(prev => prev.map(t => ({ ...t, isStreaming: false })));
            pendingAtlasTextRef.current = "";
            pendingUserTextRef.current = "";
          }

          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          // Use ref to get current value (not stale closure value)
          if (audioData && audioContextRef.current && isVoiceOutputEnabledRef.current) {
            setIsSpeaking(true);
            const buffer = await GeminiService.decodeAudioData(GeminiService.decode(audioData), audioContextRef.current, 24000, 1);
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

          if (message.serverContent?.interrupted) stopAllAudio();
        },
        onerror: (e) => {
          console.error("Coach Context Error:", e);
          setIsSessionActive(false);
          sessionObjectRef.current = null;
        },
        onclose: () => {
          setIsSessionActive(false);
          sessionPromiseRef.current = null;
          sessionObjectRef.current = null;
        }
      }, historyString + "\n\n" + contextString);
      sessionPromiseRef.current = promise;
      // Store the session object directly for safe access
      promise.then(session => {
        sessionObjectRef.current = session;
      });
      await promise;
    } catch (error) {
      console.error("Session failed to initialize.", error);
    }
  };

  // PRD Feature 2 & 7.3: Screen Comprehension Pipeline
  useEffect(() => {
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current);
      videoFrameIntervalRef.current = null;
    }

    if (visualContext.type === 'screen' && visualContext.data?.stream && isSessionActive) {
      const videoEl = document.createElement('video');
      videoEl.srcObject = visualContext.data.stream;
      videoEl.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Notify Atlas that screen share has started so it switches context
      const session = sessionObjectRef.current;
      if (session) {
        try {
          session.send([{ text: "I am now sharing my screen with you. Please watch what I am doing and guide me." }]);
        } catch (err) {
          console.warn('[ScreenShare] Error notifying:', err);
        }
      }

      videoFrameIntervalRef.current = window.setInterval(async () => {
        const currentSession = sessionObjectRef.current;
        if (!ctx || !currentSession || !isSessionActiveRef.current) return;

        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        try {
          currentSession.sendRealtimeInput({
            media: { mimeType: 'image/jpeg', data: base64 }
          });
        } catch (err) {
          // Ignore closed socket errors during cleanup
        }
      }, 1000);
    }

    return () => {
      if (videoFrameIntervalRef.current) clearInterval(videoFrameIntervalRef.current);
    };
  }, [visualContext, isSessionActive]);

  // Track previous visual context to detect changes
  const prevVisualContextRef = useRef<VisualContext | null>(null);

  // Notify AI when visual context changes during active session
  useEffect(() => {
    // Skip if no session or if this is the initial render
    if (!isSessionActive || !sessionObjectRef.current) return;

    // Skip if context hasn't actually changed
    const prevType = prevVisualContextRef.current?.type;
    const prevData = prevVisualContextRef.current?.data;
    if (prevType === visualContext.type &&
        JSON.stringify(prevData) === JSON.stringify(visualContext.data)) {
      return;
    }

    // Skip sending "closed" message if there was no previous visual context
    // This prevents hallucination on fresh session start where initial state is 'none'
    const hadPreviousVisual = prevVisualContextRef.current !== null && prevVisualContextRef.current.type !== 'none';

    // Update the ref
    prevVisualContextRef.current = visualContext;

    // Build notification message about what's now on screen
    let contextUpdate = "[VISUAL CONTEXT UPDATE] ";
    if (visualContext.type === 'none') {
      // Only notify about closing if there was actually a visual open before
      if (!hadPreviousVisual) {
        return; // Don't send anything - nothing was actually closed
      }
      contextUpdate += "The learner closed the visual module. Now showing the dashboard.";
    } else if (visualContext.type === 'diagram') {
      const title = visualContext.data?.title || 'Unknown';
      const type = visualContext.data?.type || 'Unknown';
      contextUpdate += `Now displaying interactive module: "${title}" (type: ${type}). The learner can see this module on their screen.`;
    } else if (visualContext.type === 'youtube') {
      contextUpdate += `Now playing YouTube video: ${visualContext.data?.videoId || 'Unknown'}.`;
    } else if (visualContext.type === 'podcast') {
      contextUpdate += `Now playing podcast: "${visualContext.data?.title || 'Unknown'}".`;
    } else if (visualContext.type === 'whiteboard') {
      contextUpdate += "Now showing whiteboard for drawing/notes.";
    } else if (visualContext.type === 'document') {
      contextUpdate += `Now displaying document: "${visualContext.data?.title || 'Unknown'}".`;
    } else if (visualContext.type === 'briefing') {
      contextUpdate += `Now showing briefing: "${visualContext.data?.title || 'Unknown'}".`;
    } else if (visualContext.type === 'assessment') {
      contextUpdate += "Now showing assessment/quiz.";
    }

    contextUpdate += " Remember: If the user refers to 'this' or the content on screen, they mean what is currently displayed. Do NOT open new modules if they're asking about what's already shown.";

    // Send the context update using safe send (prevents duplicate/closed socket errors)
    safeSend(contextUpdate, true);
  }, [visualContext, isSessionActive, safeSend]);

  const handleSendMessage = useCallback(async (text: string) => {
    setTranscriptions(prev => [...prev, { role: 'user', text, isStreaming: false }]);

    if (!isSessionActive) {
      await startTutorSession();
    }

    // Build context-aware message when game is active
    let contextualMessage = text;
    if (isGameActive) {
      let context = `[CONTEXT] User is in "${currentGameTitle}", currently on the "${currentGamePhase}" phase. `;

      // Add phase-specific context
      if (currentGamePhase === 'test') {
        context += `They're on question ${currentTestQuestion} of 10 in the knowledge test. `;
        // Include the FULL question content so AI knows exactly what's on screen
        if (currentQuestionContent.scenario) {
          context += `\n[CURRENT QUESTION ON SCREEN]\nScenario: "${currentQuestionContent.scenario}"\nQuestion: "${currentQuestionContent.question}"\nAnswer Options: ${currentQuestionContent.options}\n`;
        }
      } else if (currentGamePhase === 'transfer') {
        context += `They're viewing real-world application ${currentTransferApp.num}/4: "${currentTransferApp.title}". `;
      }

      // Add last guide message context if recent
      if (lastGuideMessage) {
        context += `\n[PREVIOUS ASSISTANT MESSAGE] I (Atlas) just said: "${lastGuideMessage}"\n`;
      }

      context += `[USER MESSAGE] ${text}`;
      contextualMessage = context;
    }

    // Send user message - use session directly (user messages bypass throttle)
    const session = sessionObjectRef.current;
    if (session) {
      try {
        if (typeof session.send === 'function') {
          session.send([{ text: contextualMessage }], true);
        } else if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: contextualMessage }] }], turnComplete: true });
        }
      } catch (err) {
        console.warn('[handleSendMessage] Error sending:', err);
      }
    }
  }, [isSessionActive, isGameActive, currentGameTitle, currentGamePhase, currentTestQuestion, currentQuestionContent, currentTransferApp, lastGuideMessage]);

  const handleImageUpload = useCallback(async (base64Data: string, mimeType: string) => {
    setTranscriptions(prev => [...prev, { role: 'user', text: '[Uploaded an Image]', isStreaming: false }]);

    if (!isSessionActive) {
      await startTutorSession();
    }

    setVisualContext({ type: 'document', data: { title: 'Uploaded Artifact', content: <img src={`data:${mimeType};base64,${base64Data}`} className="max-w-full rounded-lg shadow-md" /> } });

    // Use session directly with error handling
    const session = sessionObjectRef.current;
    if (session) {
      try {
        session.sendRealtimeInput({
          media: { mimeType: mimeType, data: base64Data }
        });
        session.send([{ text: "I just shared an image. Please analyze this according to our pedagogical rules." }], true);
      } catch (err) {
        console.warn('[handleImageUpload] Error sending:', err);
      }
    }
  }, [isSessionActive]);

  // Helper to add atlas message only if not a duplicate (prevents spam)
  const addAtlasMessage = useCallback((text: string, forceAdd: boolean = false) => {
    const now = Date.now();
    const timeSinceLast = now - lastAtlasMessageTimeRef.current;

    // Prevent duplicate messages within 2 seconds, unless forced
    if (!forceAdd && text === lastAtlasMessageRef.current && timeSinceLast < 2000) {
      return false;
    }

    lastAtlasMessageRef.current = text;
    lastAtlasMessageTimeRef.current = now;
    setTranscriptions(prev => [...prev, { role: 'atlas', text }]);
    setLastGuideMessage(text);
    return true;
  }, []);

  // Helper to make AI SPEAK a message (triggers voice output via Gemini)
  // Auto-starts session if not active and voice is enabled
  // Interrupts any current speech and debounces rapid calls
  // priority: 'high' for phase changes (faster, bypasses more throttling), 'normal' for other speech
  const speakGuidance = useCallback(async (prompt: string, immediate: boolean = false, priority: 'high' | 'normal' = 'normal') => {
    // If voice output is disabled, don't speak
    if (!isVoiceOutputEnabled) {
      return;
    }

    // Clear any pending debounced speech
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }

    // ALWAYS interrupt current audio when new speech is requested
    stopAllAudio();

    // Debounce rapid phase changes - high priority gets faster response
    const delay = immediate ? 0 : (priority === 'high' ? 150 : 300);

    speechDebounceRef.current = setTimeout(async () => {
      // Auto-start session if not active
      if (!isSessionActive) {
        await startTutorSession();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      isSpeakingRef.current = true;

      // Send the voice prompt using safeSend with priority
      safeSend(prompt, true, priority);
    }, delay);
  }, [isSessionActive, isVoiceOutputEnabled, stopAllAudio, safeSend]);

  // Handler for game events from interactive graphics - enables AI voice coach to see and respond to gameplay
  const handleGameEvent = useCallback(async (event: GameEvent) => {
    // Phase order for screen number calculation
    const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

    // Update visual state tracking for accurate AI context
    if (event.eventType === 'visual_state_update') {
      gameVisualStateRef.current = {
        electronCount: event.details.electronCount || 0,
        pattern: event.details.pattern || 'none',
        observerMode: event.details.observerMode || false,
        slitConfig: event.details.slitConfig || 'both_open'
      };
      return; // Don't trigger any messages for state updates
    }

    // Track game state for UI
    if (event.eventType === 'game_started') {
      const gameId = event.gameTitle.toLowerCase().replace(/\s+/g, '_');
      setCurrentGameId(gameId);
      setIsGameActive(true);
      setCurrentGameTitle(event.gameTitle);

      // Check for saved progress from a PREVIOUS browser session (not current session)
      const savedProgress = loadGameProgress(gameId);
      // KEY FIX: Only show resume if progress is from a DIFFERENT session
      // This prevents the bug where clicking "Let's find out" saves progress, then game_started fires again and shows resume
      const isFromPreviousSession = savedProgress?.sessionId !== pageLoadSessionId;

      if (savedProgress && savedProgress.phase !== 'hook' && !savedProgress.completed && isFromPreviousSession) {
        // Guard: Only show resume prompt once per game session
        if (resumePromptShownRef.current === gameId) {
          return;
        }
        resumePromptShownRef.current = gameId;

        // Show resume prompt instead of starting fresh
        setShowResumePrompt({ gameId, phase: savedProgress.phase });
        setLastPrediction(savedProgress.prediction || '');
        setCurrentTestQuestion(savedProgress.testQuestion || 1);
        setCurrentTransferApp(prev => ({ ...prev, num: savedProgress.transferAppNum || 1 }));
        addAtlasMessage(`📚 Welcome back! You were on the "${savedProgress.phase}" section. Would you like to resume where you left off?`);
        return; // Wait for user to choose resume or start over
      }

      // Guard: Prevent duplicate welcome message if game_started fires multiple times
      if (resumePromptShownRef.current === `fresh_${gameId}`) {
        return;
      }
      resumePromptShownRef.current = `fresh_${gameId}`;

      // Starting fresh
      setCurrentGamePhase('hook');
      lastSpokenPhaseRef.current = '';
      setCurrentTestQuestion(1);
      setLastPrediction('');
      gameVisualStateRef.current = { electronCount: 0, pattern: 'none', observerMode: false, slitConfig: 'both_open' };

      // Save initial progress
      saveGameProgress({
        gameId,
        phase: 'hook',
        completed: false,
        lastUpdated: Date.now()
      });

      // Show welcome message and speak it
      if (guidedModeEnabled) {
        const welcomeMessage = `🎓 Welcome to ${event.gameTitle}! I'm here to guide you through one of physics' most mind-bending experiments.`;
        addAtlasMessage(welcomeMessage);

        // Start voice session and speak welcome
        if (isVoiceOutputEnabled) {
          if (!isSessionActive) {
            await startTutorSession();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          // Speak welcome - single, clear message (no duplication)
          speakGuidance(`[SAY EXACTLY THIS in a warm, friendly voice]: "Welcome to Wave-Particle Duality! This is going to be fascinating. Take a moment to read the intro, then click Make a Prediction when you're ready!"`, true, 'high');
        }
      }

    } else if (event.eventType === 'phase_changed') {
      const newPhase = event.details.phase || '';
      const screenNum = event.details.currentScreen || (phaseOrder.indexOf(newPhase) + 1);
      setCurrentGamePhase(newPhase);

      // CRITICAL: Immediately sync location with AI and interrupt any stale audio
      // This ensures AI always knows CURRENT page even during rapid navigation
      syncCurrentLocation(newPhase, screenNum, true);

      // Save progress to localStorage
      if (currentGameId) {
        saveGameProgress({
          gameId: currentGameId,
          phase: newPhase,
          prediction: lastPrediction,
          testQuestion: currentTestQuestion,
          transferAppNum: currentTransferApp.num,
          completed: newPhase === 'mastery',
          lastUpdated: Date.now()
        });
      }

      // Reset test question when entering test phase
      if (newPhase === 'test') {
        setCurrentTestQuestion(1);
        setShownHalfwayMessage(false);
      }

      // Skip voice if this phase was already announced (prevents duplicate on rapid navigation)
      // But still allow location sync above to keep AI in sync
      if (lastSpokenPhaseRef.current === newPhase) {
        return;
      }
      lastSpokenPhaseRef.current = newPhase;

      // Show guidance in chat AND speak it when guided mode is on
      if (guidedModeEnabled && newPhase) {
        // Phase messages for chat (text only)
        const phaseMessages: Record<string, string> = {
          'hook': "📖 You're seeing the experimental setup. Read the intro and click 'Make a Prediction' when ready.",
          'predict': "🤔 Prediction time! Will electrons act like particles or waves?",
          'play': "🎯 Click to fire electrons! Watch the pattern emerge.",
          'twist_predict': "👁️ Now we're adding a detector. What will happen?",
          'twist_play': "🔬 Toggle the observer and compare RED vs CYAN patterns!",
          'twist_review': "🤯 Observation changes reality at the quantum level!",
          'transfer': "🌍 See quantum physics in real-world applications!",
          'test': "📝 Final test! 10 scenarios. Take your time!",
          'mastery': "🏆 You've mastered wave-particle duality!"
        };

        // Voice prompts - EXACT SCRIPTS to prevent AI improvising/duplicating
        // Using [SAY EXACTLY] to make the AI speak these exact words
        const getVoiceScript = (phase: string): string => {
          switch (phase) {
            case 'hook':
              return `[SAY EXACTLY THIS]: "Alright! On your screen you can see the setup - electron gun on the left, two slits in the middle, and the detection screen on the right. Read through the intro and hit Make a Prediction when you're ready!"`;
            case 'predict':
              return `[SAY EXACTLY THIS]: "Okay, prediction time! What's your gut telling you - will the electrons land in two stripes like little bullets, or will they create a wavy interference pattern? Lock in your answer!"`;
            case 'play':
              return `[SAY EXACTLY THIS]: "Time to experiment! Click anywhere to fire electrons. Watch the dots appear on the detection screen - the RIGHT side. Fire at least 30 and see what pattern forms!"`;
            case 'twist_predict':
              return `[SAY EXACTLY THIS]: "Plot twist! Now we're adding a detector to actually WATCH which slit each electron goes through. Do you think knowing the path will change the pattern?"`;
            case 'twist_play':
              return `[SAY EXACTLY THIS]: "Here's where it gets wild! Toggle between WATCHING and NOT WATCHING. The RED dots are watched electrons, CYAN are unwatched. Compare them - they're totally different!"`;
            case 'twist_review':
              return `[SAY EXACTLY THIS]: "This is mind-blowing - the mere act of OBSERVING changes what happens! This isn't philosophy, it's real physics that powers actual technology."`;
            case 'transfer':
              return `[SAY EXACTLY THIS]: "Now let's see where this quantum weirdness shows up in the real world! Starting with quantum computing - that spinning coin represents a qubit in superposition!"`;
            case 'test':
              return `[SAY EXACTLY THIS]: "Final test time! You've got 10 scenarios based on real quantum applications. Take your time, think it through, and click Get Hint if you need help!"`;
            case 'mastery':
              return `[SAY EXACTLY THIS]: "Congratulations! You've officially mastered wave-particle duality. Einstein would be proud! Feel free to explore more or try Free Mode!"`;
            default:
              return '';
          }
        };

        const msg = phaseMessages[newPhase];
        if (msg) {
          addAtlasMessage(msg);
          // Speak the exact script with HIGH priority for phase changes
          const voiceScript = getVoiceScript(newPhase);
          if (voiceScript && isVoiceOutputEnabled) {
            speakGuidance(voiceScript, false, 'high');
          }
        }
      }
    } else if (event.eventType === 'prediction_made') {
      // Track the prediction for hint context
      const prediction = event.details.prediction || '';
      setLastPrediction(prediction);

      // Save progress with prediction
      if (currentGameId) {
        saveGameProgress({
          gameId: currentGameId,
          phase: currentGamePhase,
          prediction,
          testQuestion: currentTestQuestion,
          transferAppNum: currentTransferApp.num,
          completed: false,
          lastUpdated: Date.now()
        });
      }

      // React to prediction with BOTH text and voice (voice says what text shows)
      if (guidedModeEnabled) {
        // Text and voice both acknowledge - voice speaks the text
        addAtlasMessage("🎯 Prediction locked in! Let's see what happens...");

        // Use EXACT scripts based on prediction type
        let voiceScript = '';
        if (prediction === 'interference' || prediction === 'waves') {
          voiceScript = `[SAY EXACTLY THIS]: "Prediction locked in! You're thinking like a wave physicist - let's see if the electrons agree!"`;
        } else if (prediction === 'two' || prediction === 'particles') {
          voiceScript = `[SAY EXACTLY THIS]: "Prediction locked in! That's the intuitive answer - like bullets through doors. Let's see what actually happens!"`;
        } else if (prediction === 'disappear') {
          voiceScript = `[SAY EXACTLY THIS]: "Prediction locked in! Interesting - you think observation might change things. Let's find out!"`;
        } else if (prediction === 'same') {
          voiceScript = `[SAY EXACTLY THIS]: "Prediction locked in! You think watching shouldn't matter - classical physics agrees. Let's see if quantum physics does too!"`;
        } else {
          voiceScript = `[SAY EXACTLY THIS]: "Prediction locked in! Now let's run the experiment and see what happens!"`;
        }
        if (isVoiceOutputEnabled) {
          speakGuidance(voiceScript);
        }
      }
    } else if (event.eventType === 'app_changed') {
      // Track current transfer application
      const appNum = event.details.appNumber || 1;
      const appTitle = event.details.appTitle || '';
      setCurrentTransferApp({
        num: appNum,
        title: appTitle,
        description: event.details.appDescription || ''
      });

      // Show guidance for each real-world application
      if (guidedModeEnabled) {
        const appMessages: Record<number, string> = {
          1: `🖥️ **Quantum Computing** - See how superposition powers the next computing revolution! Just like electrons going through BOTH slits, qubits exist as 0 AND 1 simultaneously. Look at the spinning coin - that's a qubit in superposition! Google's quantum computer solved in 200 seconds what would take a supercomputer 10,000 years.`,
          2: `🔐 **Quantum Encryption** - The Observer Effect becomes a security feature! Remember how watching electrons destroyed the interference pattern? QKD uses this - any eavesdropper who measures the quantum key DISTURBS it, instantly exposing the spy. China's Micius satellite uses this for unhackable communication!`,
          3: `🔬 **Electron Microscopy** - The wave nature of electrons enables atomic-scale imaging! Electron wavelengths are 100,000× shorter than light, so we can resolve individual atoms. This technology imaged the COVID-19 spike protein and won the 2017 Nobel Prize!`,
          4: `🏥 **MRI Imaging** - Quantum spin states power medical diagnostics! Radio pulses flip hydrogen atom spins (like observing electrons), and different relaxation times create tissue contrast. 40+ million MRI scans per year - all thanks to quantum physics inside your body!`
        };

        // Voice prompts for each application
        const appVoicePrompts: Record<number, string> = {
          1: `[VOICE] Application 1: Quantum Computing. Explain how qubits in superposition (like electrons through both slits) enable parallel computation. The spinning coin represents 0 AND 1 simultaneously. Be excited about the 10,000 year problem solved in 200 seconds! 12-15 seconds.`,
          2: `[VOICE] Application 2: Quantum Encryption. Explain how the Observer Effect becomes a security feature - measuring the quantum key disturbs it, exposing eavesdroppers instantly. Mention China's Micius satellite. This is the spy-proof communication! 12-15 seconds.`,
          3: `[VOICE] Application 3: Electron Microscopy. Explain how electron WAVES with their tiny wavelengths let us see atoms! 100,000 times better than light microscopes. Mention imaging COVID-19 and the 2017 Nobel Prize. 12-15 seconds.`,
          4: `[VOICE] Application 4: MRI Imaging. Explain how quantum spin states in hydrogen atoms create medical images. Radio pulses flip spins like observing electrons. 40+ million scans per year - quantum physics in hospitals! 12-15 seconds.`
        };

        const msg = appMessages[appNum];
        if (msg) {
          addAtlasMessage(msg);
          // Also speak the guidance
          const voicePrompt = appVoicePrompts[appNum];
          if (voicePrompt) {
            speakGuidance(voicePrompt);
          }
        }
      }
    } else if (event.eventType === 'app_completed') {
      // Track and celebrate completion
      const appNum = event.details.appNumber || 1;
      const appTitle = event.details.appTitle || '';
      setCurrentTransferApp({
        num: appNum,
        title: appTitle,
        description: event.details.appDescription || ''
      });

      if (guidedModeEnabled && appNum < 4) {
        addAtlasMessage(`✅ Great job exploring ${appTitle}! ${4 - appNum} more application${4 - appNum > 1 ? 's' : ''} to go. Each one shows quantum physics in a different real-world context.`);
        speakGuidance(`[VOICE] The learner completed application ${appNum} (${appTitle})! Celebrate briefly and encourage them - ${4 - appNum} more applications to explore. Keep the momentum! 6-8 seconds.`, false, 'normal');
      } else if (guidedModeEnabled && appNum === 4) {
        addAtlasMessage(`🎉 You've explored all 4 real-world applications! Now you can see how quantum weirdness powers actual technology. Ready to test your knowledge? Click 'Take Test' when you're ready!`);
        speakGuidance(`[VOICE] The learner completed ALL 4 applications! Big celebration! They've seen quantum physics in computing, encryption, microscopy, and medicine. Encourage them to take the test - they're ready! Be excited and proud! 10-12 seconds.`, false, 'high');
      }
    } else if (event.eventType === 'game_completed') {
      setIsGameActive(false);
      setCurrentGamePhase('');
      const score = event.details.score;
      const total = event.details.totalQuestions || 10;
      const congrats = score >= 7
        ? `🏆 Excellent! You scored ${score}/${total}! You've truly mastered wave-particle duality. Einstein would be impressed!`
        : `📚 You scored ${score}/${total}. Review the explanations and try again - quantum mechanics takes time to sink in!`;
      addAtlasMessage(congrats);

      // Voice celebration/encouragement based on score - HIGH priority for completion
      if (score >= 7) {
        speakGuidance(`[VOICE] CELEBRATION! The learner scored ${score} out of ${total}! They've mastered wave-particle duality! Be genuinely excited and proud. Mention Einstein would be impressed. Encourage them to explore more or try free mode. 12-15 seconds.`, false, 'high');
      } else {
        speakGuidance(`[VOICE] The learner scored ${score} out of ${total}. Be encouraging - quantum mechanics is hard! Suggest reviewing the explanations and trying again. The concepts will click with more practice. Be supportive and positive. 10-12 seconds.`, false, 'high');
      }
    } else if (event.eventType === 'answer_selected') {
      // Track current test question with full content for hints
      const qNum = event.details.questionNumber || 1;
      setCurrentTestQuestion(qNum);
      // Store full question content for AI context
      setCurrentQuestionContent({
        scenario: event.details.questionScenario || '',
        question: event.details.questionText || '',
        options: event.details.allOptions || ''
      });

      // Give occasional encouragement (halfway point) - only once
      if (guidedModeEnabled && !shownHalfwayMessage) {
        const total = event.details.totalQuestions || 10;
        if (qNum === Math.ceil(total / 2)) {
          addAtlasMessage(`📝 Halfway there! ${total - qNum} questions to go. You're doing great!`);
          setShownHalfwayMessage(true);
        }
      }
    } else if (event.eventType === 'question_changed') {
      // Update current test question tracking with full content
      const qNum = event.details.questionNumber || 1;
      setCurrentTestQuestion(qNum);
      // Store full question content for AI context
      const scenario = event.details.questionScenario || '';
      const questionText = event.details.questionText || '';
      const options = event.details.allOptions || '';
      setCurrentQuestionContent({ scenario, question: questionText, options });

      // PROACTIVE VOICE GUIDANCE: Send to Gemini to trigger spoken guidance for each question
      if (isSessionActive && guidedModeEnabled) {
        const proactiveGuidance = `[PROACTIVE COACHING - QUESTION ${qNum}]
You are the AI voice coach. The learner just moved to Question ${qNum} of 10 in the knowledge test.

HERE IS THE ACTUAL QUESTION ON SCREEN:
SCENARIO: "${scenario}"
QUESTION: "${questionText}"
OPTIONS: ${options}

Please SPEAK a brief (15-25 seconds) coaching message that:
1. Reads the scenario briefly in your own words
2. Gives a helpful thinking prompt WITHOUT giving away the answer
3. Relates it back to what they learned in the experiment (wave-particle duality, observer effect, superposition)
4. Be warm, encouraging, and conversational

DO NOT say the answer. Guide them to think through it themselves.`;

        safeSend(proactiveGuidance, true, 'normal');
      }
    }

    if (!isSessionActive) return;

    // Format event for AI comprehension
    const eventMessage = formatGameEventForAI(event);

    // Add guided mode context
    const guidedContext = guidedModeEnabled
      ? ' [GUIDED MODE ON: Proactively offer brief encouragement, questions, and guidance as the learner progresses. Be positive and enthusiastic but not overwhelming.]'
      : ' [GUIDED MODE OFF: Only respond when directly asked. Let the learner explore independently.]';

    // Determine priority based on event type
    // High priority: phase changes, game start/complete (need immediate AI awareness)
    // Normal priority: predictions, selections
    // Low priority: slider changes, value updates (can be dropped if too frequent)
    const eventPriority: 'high' | 'normal' | 'low' =
      ['phase_changed', 'game_started', 'game_completed'].includes(event.eventType) ? 'high' :
      ['slider_changed', 'value_changed', 'visual_state_update'].includes(event.eventType) ? 'low' : 'normal';

    // Use safeSend with appropriate priority to ensure AI stays in sync
    safeSend(eventMessage + guidedContext, true, eventPriority);
  }, [isSessionActive, isVoiceOutputEnabled, guidedModeEnabled, currentGameId, currentGamePhase, lastPrediction, currentTestQuestion, currentTransferApp, addAtlasMessage, shownHalfwayMessage, speakGuidance, saveGameProgress, loadGameProgress, safeSend, syncCurrentLocation]);

  // Resume game from saved progress
  const handleResumeGame = useCallback((gameId: string, phase: string) => {
    console.log('[Resume] Resuming game:', gameId, 'at phase:', phase);
    setShowResumePrompt(null);
    resumePromptShownRef.current = null; // Clear so it can show for other games
    setCurrentGamePhase(phase);
    lastSpokenPhaseRef.current = ''; // Allow phase to be announced

    // Announce resumption with high priority
    addAtlasMessage(`▶️ Resuming from "${phase}" phase...`);
    if (isVoiceOutputEnabled) {
      speakGuidance(`[SAY EXACTLY THIS]: "Welcome back! Let's pick up right where you left off."`, true, 'high');
    }
  }, [isVoiceOutputEnabled, addAtlasMessage, speakGuidance]);

  // Start game over from beginning
  const handleStartOver = useCallback((gameId: string) => {
    console.log('[StartOver] Clearing progress for:', gameId);
    setShowResumePrompt(null);
    resumePromptShownRef.current = null; // Clear so it can show for other games
    clearGameProgress(gameId);
    setCurrentGamePhase('hook');
    setCurrentTestQuestion(1);
    setLastPrediction('');
    lastSpokenPhaseRef.current = '';
    gameVisualStateRef.current = { electronCount: 0, pattern: 'none', observerMode: false, slitConfig: 'both_open' };

    // Save fresh progress
    saveGameProgress({
      gameId,
      phase: 'hook',
      completed: false,
      lastUpdated: Date.now()
    });

    addAtlasMessage(`🔄 Starting fresh! Let's begin from the introduction.`);
    if (isVoiceOutputEnabled) {
      speakGuidance(`[SAY EXACTLY THIS]: "Starting fresh! Take your time reading the intro and click Make a Prediction when ready."`, true, 'high');
    }
  }, [isVoiceOutputEnabled, addAtlasMessage, speakGuidance, clearGameProgress, saveGameProgress]);

  // Rich, contextual hints that describe EXACTLY what's on screen and guide appropriately
  const getPhaseHint = useCallback((phase: string): string => {
    // Test phase - dynamic based on current question
    if (phase === 'test') {
      const testHints: Record<number, string> = {
        1: "💡 Q1: Think about the double-slit experiment. When electrons pass through TWO slits without observation, what pattern did you see? The answer relates to wave behavior.",
        2: "💡 Q2: This question is about what happens to interference when we DON'T observe. Remember what the cyan (unobserved) pattern looked like?",
        3: "💡 Q3: Quantum computing uses 'qubits'. Think about how electrons can be in superposition - existing in multiple states at once, like going through both slits.",
        4: "💡 Q4: Think about the red (observed) vs cyan (unobserved) patterns. Which state preserves quantum information? What happens to superposition when we measure?",
        5: "💡 Q5: Quantum encryption uses the observer effect for security. Remember: measuring a quantum system CHANGES it. How could this detect eavesdroppers?",
        6: "💡 Q6: The electron microscope uses electron WAVES. Think about why shorter wavelengths (like electrons) can see smaller things than light waves.",
        7: "💡 Q7: This is about the observer effect again. In the double-slit experiment, what happened when we turned ON the detector to watch the electrons?",
        8: "💡 Q8: MRI uses quantum spin states. Think about how measuring quantum properties (like which slit) affects the system - same principle applies to medical imaging.",
        9: "💡 Q9: What did the double-slit experiment prove about the nature of electrons? They showed properties of BOTH particles AND waves!",
        10: "💡 Q10: Final question! Think about what makes quantum computers powerful - it's the same thing that let one electron 'explore' both slits simultaneously."
      };
      return testHints[currentTestQuestion] || "💡 Think about the principles from the double-slit experiment. Interference requires superposition; observation collapses it!";
    }

    // Play phase - contextualize based on their prediction
    if (phase === 'play' && lastPrediction) {
      if (lastPrediction === 'interference') {
        return "💡 You predicted wave-like interference! Fire electrons one at a time and watch. See if alternating bright/dark bands emerge - you might be onto something! Click the electron gun on the left.";
      } else if (lastPrediction === 'two') {
        return "💡 You predicted two separate bands (particle behavior). Fire electrons and watch carefully - will they just pile up behind each slit like bullets? Click the electron gun and find out!";
      } else {
        return "💡 You predicted random scattering. Fire electrons one at a time and watch what pattern actually forms. Does it look random, or is there structure? Click the electron gun!";
      }
    }

    // Twist play - contextualize based on twist prediction
    if (phase === 'twist_play' && lastPrediction) {
      if (lastPrediction === 'disappear') {
        return "💡 You think observation destroys the pattern - let's test it! Toggle between WATCHING (ON) and NOT WATCHING (OFF) modes. Compare the red dots vs cyan dots. Your intuition may be right...";
      } else if (lastPrediction === 'same') {
        return "💡 You think observing shouldn't matter? That's what classical physics says! Toggle the detector ON and OFF, fire electrons, and compare the patterns. Prepare to be surprised...";
      }
    }

    // Transfer phase - dynamic based on current application
    if (phase === 'transfer') {
      const transferHints: Record<number, string> = {
        1: "💡 You're exploring QUANTUM COMPUTING! See how qubits in superposition (like electrons going through both slits) can compute multiple solutions at once. The spinning coin shows how a qubit is both 0 AND 1 until measured. Click '✓ Complete' when ready!",
        2: "💡 Now viewing QUANTUM ENCRYPTION! This uses the Observer Effect you discovered - any eavesdropper who measures the quantum key changes it and gets detected. Look at how the secure vs intercepted scenarios differ!",
        3: "💡 ELECTRON MICROSCOPY uses the wave nature of electrons! Because electron wavelengths are 100,000× shorter than light, we can image at atomic scale. Compare the resolution differences in the graphic!",
        4: "💡 MRI (Magnetic Resonance Imaging) exploits quantum spin states! Radio pulses flip hydrogen spins, and different relaxation times create tissue contrast. See how the 3-step process works - Align, Flip, Relax!"
      };
      return transferHints[currentTransferApp.num] || "💡 Explore each application to see quantum physics powering real technology!";
    }

    const hints: Record<string, string> = {
      'hook': "💡 You're looking at the Double-Slit Experiment setup. See the electron gun on the left, the barrier with two slits in the middle, and the detection screen on the right. This simple setup revealed one of nature's deepest secrets! Read the intro, then click 'Start Experiment' when ready.",
      'predict': "💡 Time to make your prediction! You'll fire electrons ONE at a time with gaps between them. Will they act like tiny balls (making 2 stripes behind each slit) or like waves (making an interference pattern)? Select an option - there's no wrong answer!",
      'play': "💡 Click the electron gun to fire electrons! Watch each dot appear on the screen. Fire at least 30 electrons and watch the pattern emerge. Notice anything surprising?",
      'review': "💡 You just saw single particles create a wave interference pattern! Each electron, fired alone, somehow 'knew' about both slits. This is the heart of quantum mechanics - wave-particle duality.",
      'twist_predict': "💡 Now the twist! We're adding a detector to WATCH which slit each electron uses. Will the interference pattern change if we know which path the electron took? Make your prediction!",
      'twist_play': "💡 Toggle the detector ON (watching) and OFF (not watching). Fire electrons in each mode. Compare the RED dots (observed) vs CYAN dots (unobserved). This is quantum weirdness in action!",
      'twist_review': "💡 You witnessed the Observer Effect! Observing which slit the electron uses DESTROYS the interference pattern. The act of measurement changes reality. Mind-blowing, right?",
      'mastery': "💡 You've completed the Wave-Particle Duality lesson! Review your achievements or try Free Exploration Mode to experiment more with the double-slit setup.",
      'started': "💡 Welcome! You're about to discover why Einstein called this 'the only mystery' in physics. Let's explore together!"
    };
    return hints[phase] || "💡 Explore and observe! What patterns do you notice?";
  }, [currentTestQuestion, lastPrediction, currentTransferApp]);

  // Handler for hint request from chat
  const handleRequestHint = useCallback(async () => {
    const hint = getPhaseHint(currentGamePhase);

    // Always show hint (force add to bypass dedup since user explicitly requested)
    addAtlasMessage(hint, true);

    console.log('[HintRequest]', currentGamePhase, hint);

    // Send to AI for voice if voice mode is enabled
    if (isVoiceOutputEnabled) {
      // Auto-start session if not active
      if (!isSessionActive) {
        console.log('[HintRequest] No active session, starting one for voice hint...');
        await startTutorSession();
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      let hintRequest = `[HINT REQUEST] The learner clicked "Get Hint" in "${currentGameTitle}" during the "${currentGamePhase}" phase.`;

      // For test phase, include the FULL question content so AI knows exactly what's on screen
      if (currentGamePhase === 'test' && currentQuestionContent.scenario) {
        hintRequest = `[HINT REQUEST - QUESTION ${currentTestQuestion}]
The learner is asking for help with this SPECIFIC question:

SCENARIO ON SCREEN: "${currentQuestionContent.scenario}"
QUESTION: "${currentQuestionContent.question}"
ANSWER OPTIONS: ${currentQuestionContent.options}

Please SPEAK a helpful hint that:
1. Summarizes what this scenario is asking about
2. Connects it to what they learned (double-slit experiment, observer effect, wave-particle duality)
3. Guides them toward the right thinking WITHOUT saying the answer
4. Be warm, encouraging, and conversational (15-20 seconds)`;
      } else {
        hintRequest += ` I showed them this hint: "${hint}". Please add to this with a brief, encouraging follow-up that's warm and supportive!`;
      }

      safeSend(hintRequest, true);
    }
  }, [isSessionActive, isVoiceOutputEnabled, currentGameTitle, currentGamePhase, currentTestQuestion, currentQuestionContent, getPhaseHint, addAtlasMessage, safeSend]);

  // Handler for toggling guided mode
  const handleToggleGuidedMode = useCallback(async () => {
    const newMode = !guidedModeEnabled;
    setGuidedModeEnabled(newMode);

    // Show feedback in transcriptions (force add since user explicitly toggled)
    const feedbackMessage = newMode
      ? "🎓 Guide Mode ON - I'll help you through each step!"
      : "🔇 Guide Mode OFF - Explore on your own. Click 'Get Hint' if you need help.";
    addAtlasMessage(feedbackMessage, true);

    // Send to AI session if voice mode enabled
    if (isVoiceOutputEnabled) {
      // Auto-start session if not active
      if (!isSessionActive) {
        console.log('[ToggleGuidedMode] No active session, starting one...');
        await startTutorSession();
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const modeMessage = newMode
        ? `[SYSTEM] Guided mode has been ENABLED. Please proactively offer encouragement, ask questions about what the learner is seeing, and provide gentle guidance as they progress through "${currentGameTitle}". Be positive, fun, and enthusiastic - like an amazing tutor!`
        : `[SYSTEM] Guided mode has been DISABLED. The learner wants to explore independently. Only respond when they directly ask for help. Stay available but let them discover on their own.`;

      safeSend(modeMessage, true);
    }
  }, [isSessionActive, isVoiceOutputEnabled, guidedModeEnabled, currentGameTitle, addAtlasMessage, safeSend]);

  const handleAssessmentComplete = useCallback(async (result: { success: boolean, value: any, attemptCount: number, details?: string }) => {
    // 1. Calculate Performance Rating for SM-2
    // 5 = Success on 1st try
    // 4 = Success on 2nd try
    // 3 = Success on 3rd+ try
    // 2 = Failure but close (not implemented yet, assuming failure is 1)
    // 1 = Failure
    let performanceRating = 1;
    if (result.success) {
      if (result.attemptCount === 1) performanceRating = 5;
      else if (result.attemptCount === 2) performanceRating = 4;
      else performanceRating = 3;
    }

    // 2. Update Learning Science Engine
    // Find the active concept - for now, we assume the assessment relates to the 'activeTopic' or a generic placeholder if not found
    // In a real app, the assessment data would carry the concept ID.
    // We'll try to find a concept that matches the active topic, or create a temporary one.
    const conceptId = activeTopic ? activeTopic.toLowerCase().replace(/\s+/g, '_') : 'general_concept';

    setUserState(prev => {
      const currentConcept = prev.concepts[conceptId] || {
        id: conceptId,
        name: activeTopic || "Current Topic",
        mastery: 0,
        exposure: 'explained',
        lastReviewed: Date.now(),
        nextReview: Date.now(),
        prerequisites: []
      };

      const updatedConcept = LearningScienceEngine.calculateNextReview(currentConcept, performanceRating);

      return {
        ...prev,
        concepts: {
          ...prev.concepts,
          [conceptId]: updatedConcept
        }
      };
    });

    // 3. Send the result to Atlas so it can react verbally (if voice mode enabled)
    if (isVoiceOutputEnabled) {
      // Auto-start session if not active
      if (!isSessionActive) {
        console.log('[AssessmentComplete] No active session, starting one for voice feedback...');
        await startTutorSession();
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const msg = `[SYSTEM: Assessment User Input]
      Result: ${result.success ? 'SUCCESS' : 'FAILURE'}
      Performance Rating (0-5): ${performanceRating}
      User submitted value: ${JSON.stringify(result.value)}
      Attempts taken: ${result.attemptCount}
      Details: ${result.details || 'N/A'}

      Instructions for Atlas:
      1. Acknowledge the result enthusiastically if correct, or constructively if wrong.
      2. Explain WHY the answer is what it is (Level 4/5 Feedback).
      3. If correct, offer to increase difficulty or move to next concept.
      `;

      safeSend(msg, true);
    }
  }, [isSessionActive, isVoiceOutputEnabled, activeTopic, safeSend]);

  const toggleRecording = useCallback(async () => {
    console.log('[toggleRecording] Called, isRecording:', isRecording);

    if (isRecording) {
      console.log('[toggleRecording] Stopping recording...');
      setIsRecording(false);
      streamRef.current?.getTracks().forEach(t => t.stop());
      workletNodeRef.current?.disconnect();
      inputAudioContextRef.current?.close();
      workletNodeRef.current = null;
      inputAudioContextRef.current = null;
      addAtlasMessage("🎤 Voice input stopped.");
    } else {
      console.log('[toggleRecording] Starting recording...');
      stopAllAudio();

      // Show immediate feedback
      addAtlasMessage("🎤 Starting voice input...", true);

      try {
        // Start session first if needed
        if (!isSessionActive) {
          console.log('[toggleRecording] Starting tutor session...');
          await startTutorSession();
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('[toggleRecording] Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[toggleRecording] Microphone access granted');

        streamRef.current = stream;
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx;

        console.log('[toggleRecording] Loading audio processor...');
        await inputCtx.audioWorklet.addModule('/audio-processor.js');
        console.log('[toggleRecording] Audio processor loaded');

        const source = inputCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(inputCtx, 'audio-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e) => {
          if (!isSessionActiveRef.current) return;

          const int16Buffer = e.data;

          // Use sessionObjectRef directly for audio streaming (no throttle needed for real-time audio)
          const session = sessionObjectRef.current;
          if (!isSessionActiveRef.current || !session) return;
          try {
            session.sendRealtimeInput({ media: { data: GeminiService.encode(new Uint8Array(int16Buffer)), mimeType: 'audio/pcm;rate=16000' } });
          } catch (e) {
            // Ignore closed socket errors during cleanup
          }
        };

        source.connect(workletNode);
        workletNode.connect(inputCtx.destination);

        setIsRecording(true);
        addAtlasMessage("🎙️ Listening! Speak now and I'll respond.", true);
        console.log('[toggleRecording] Recording started successfully');

      } catch (err: any) {
        setIsRecording(false);
        console.error("[toggleRecording] Error:", err);

        // Show user-friendly error message
        if (err.name === 'NotAllowedError') {
          addAtlasMessage("⚠️ Microphone access denied. Please allow microphone access in your browser settings.", true);
        } else if (err.name === 'NotFoundError') {
          addAtlasMessage("⚠️ No microphone found. Please connect a microphone and try again.", true);
        } else {
          addAtlasMessage(`⚠️ Could not start voice input: ${err.message || 'Unknown error'}`, true);
        }
      }
    }
  }, [isRecording, isSessionActive, stopAllAudio, addAtlasMessage]);

  // Auto-start voice session when app opens
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      // Only auto-start if voice output is enabled (not Chat Only mode)
      if (isVoiceOutputEnabled) {
        console.log('[Auto-Start] Starting voice session...');
        toggleRecording();
      } else {
        // If in Chat Only mode, just start the session without voice
        console.log('[Auto-Start] Chat Only mode - starting text session...');
        startTutorSession();
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleTakeNote = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();
    const noteContent = `[${timestamp}] Applied Insight on ${activeTopic || 'Applied Course'}. Visual context logged.`;
    setNotes(prev => [noteContent, ...prev]);
    alert("Saved to Study Journal.");
  }, [activeTopic]);

  const handleScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setVisualContext({ type: 'screen', data: { stream } });
      if (!isSessionActive) await startTutorSession();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the screen share picker
        console.debug("Screen share cancelled by user");
        return;
      }
      console.error("Screen share failed", err);
    }
  }, [isSessionActive]);

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden" style={{ touchAction: 'pan-y' }}>
      {/* Sidebar: Hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block w-20 min-w-[80px] h-full shrink-0">
        <Sidebar userState={userState} activeTopic={activeTopic} notesCount={notes.length} />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ touchAction: 'pan-y' }}>
        {/* Chat Panel: Modal on mobile, side panel on lg+ */}
        <div className={`
          ${isChatOpen ? 'fixed inset-0 z-50' : 'hidden'}
          lg:relative lg:inset-auto lg:flex lg:z-auto
          w-full lg:w-[360px] lg:shrink-0 flex flex-col bg-white lg:border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]
        `}>
          {/* Mobile modal header with close button */}
          <div className="p-4 sm:p-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-serif font-bold text-slate-900">Communication</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Voice & Chat Stream</p>
            </div>
            {/* Close button - visible on mobile only */}
            <button
              onClick={() => setIsChatOpen(false)}
              className="lg:hidden w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <ConversationInterface
            isSessionActive={isSessionActive}
            isRecording={isRecording}
            isVoiceOutputEnabled={isVoiceOutputEnabled}
            onToggleVoiceOutput={() => {
              const newValue = !isVoiceOutputEnabled;
              setIsVoiceOutputEnabled(newValue);
              // If switching to Chat Only mode, stop recording and audio
              if (!newValue) {
                // Stop recording if active
                if (isRecording) {
                  setIsRecording(false);
                  streamRef.current?.getTracks().forEach(t => t.stop());
                  workletNodeRef.current?.disconnect();
                  inputAudioContextRef.current?.close();
                  workletNodeRef.current = null;
                  inputAudioContextRef.current = null;
                }
                // Stop any playing audio
                stopAllAudio();
                addAtlasMessage("💬 Switched to Chat Only mode. Voice input and output disabled.", true);
              }
            }}
            onToggleRecording={toggleRecording}
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageUpload}
            onShareScreen={handleScreenShare}
            transcriptions={transcriptions}
            isGameActive={isGameActive}
            guidedModeEnabled={guidedModeEnabled}
            onToggleGuidedMode={handleToggleGuidedMode}
            onRequestHint={handleRequestHint}
            currentGamePhase={currentGamePhase}
            showResumePrompt={showResumePrompt}
            onResumeGame={handleResumeGame}
            onStartOver={handleStartOver}
          />
        </div>

        {/* Visual Panel: Full screen on mobile */}
        <div className="flex-1 relative flex flex-col">
          <VisualPanel
            context={visualContext}
            activeTopic={activeTopic}
            history={archive}
            onRestore={(index) => {
              const restored = archive[index];
              setArchive(prev => prev.filter((_, i) => i !== index));
              setVisualContext(prev => {
                if (prev.type !== 'none') setArchive(a => [...a, prev]);
                return restored;
              });
            }}
            onClose={() => {
              if (visualContext.type !== 'none') setArchive(prev => [...prev, visualContext]);
              setVisualContext({ type: 'none', data: null });
              // Reset game state when closing diagram
              setIsGameActive(false);
              setCurrentGamePhase('');
              setCurrentGameTitle('');
            }}
            onTakeNote={handleTakeNote}
            onViewArchive={() => setShowArchive(!showArchive)}
            onShareWorkspace={handleScreenShare}
            onShareWorkspaceUrl={() => {
              const url = window.location.href;
              if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).then(() => alert("Live link copied.")).catch(() => prompt("Copy this link:", url));
              } else {
                prompt("Copy this link:", url);
              }
            }}
            onAssessmentComplete={handleAssessmentComplete}
            onGameEvent={handleGameEvent}
            gamePhase={currentGamePhase}
            onLaunchDiagram={(type) => {
              setVisualContext({
                type: 'diagram',
                data: { type, data: '{}', title: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
              });
            }}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            dashboardKeyPoints={dashboardKeyPoints}
          />
          {showArchive && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[60] p-16 animate-in fade-in duration-300 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-serif font-bold text-slate-900">Archive Lab</h2>
                  <button onClick={() => setShowArchive(false)} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {archive.map((item, i) => (
                    <div key={i} onClick={() => { setVisualContext(item); setShowArchive(false); }} className="p-8 bg-white rounded-3xl border border-slate-100 cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all shadow-sm group">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition mb-4">
                        <i className={`fa-solid ${item.type === 'youtube' ? 'fa-video' : 'fa-chart-pie'}`}></i>
                      </div>
                      <h4 className="font-serif font-bold text-xl text-slate-800">Archived {item.type} Entry</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Hide coach avatar when lesson/diagram content is active to avoid overlapping UI */}
        {visualContext.type === 'none' && (
          <CoachAvatar isSpeaking={isSpeaking} isRecording={isRecording} onClick={toggleRecording} onStopSpeech={stopAllAudio} />
        )}

        {/* Floating Chat Button - Mobile only, visible when chat is closed and there's visual content */}
        {!isChatOpen && visualContext.type !== 'none' && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 transition-transform"
          >
            <i className="fa-solid fa-comment-dots text-xl"></i>
            {/* Notification dot if there are new messages */}
            {transcriptions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        )}
      </main>
    </div>
  );
};

export default App;