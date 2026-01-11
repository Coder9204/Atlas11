import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiService } from './services/gemini';
import { LearningScienceEngine } from './services/LearningScienceEngine';
import { VisualContext, UserState, Concept } from './types';
import Sidebar from './components/Sidebar';
import ConversationInterface from './components/ConversationInterface';
import VisualPanel from './components/VisualPanel';
import CoachAvatar from './components/CoachAvatar';
import { GameEvent } from './components/GeneratedDiagram';

// Format game events for AI voice coach comprehension
const formatGameEventForAI = (event: GameEvent): string => {
  const { eventType, gameType, gameTitle, details } = event;

  // Build contextual message based on event type
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
};

interface ChatTurn {
  role: 'user' | 'atlas';
  text: string;
  isStreaming?: boolean;
}

const App: React.FC = () => {
  const [visualContext, setVisualContext] = useState<VisualContext>({ type: 'none', data: null });
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

  const pendingAtlasTextRef = useRef<string>("");
  const pendingUserTextRef = useRef<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoFrameIntervalRef = useRef<number | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const handleFunctionCall = async (fc: any) => {
    let result: any = { status: "success" };
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
      case 'showDiagram': setVisualContext({ type: 'diagram', data: fc.args }); break;
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
    }
    sessionPromiseRef.current?.then(session => {
      session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: result }] });
    });
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
    const contextString = `
    [CURRENT USER STATE]
    Name: ${userState.name}
    Interests: ${userState.profile.interests.join(', ')}
    
    [DUE FOR REVIEW (SPACED REPETITION)]
    ${dueReviews.length > 0 ? dueReviews.map(c => `- ${c.name} (Mastery: ${c.mastery}%)`).join('\n') : "No specific reviews due."}
    
    [ACTIVE CONTEXT]
    Topic: ${activeTopic || "General"}
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
          if (audioData && audioContextRef.current && isVoiceOutputEnabled) {
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
        },
        onclose: () => {
          setIsSessionActive(false);
          sessionPromiseRef.current = null;
        }
      }, historyString + "\n\n" + contextString);
      sessionPromiseRef.current = promise;
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
      sessionPromiseRef.current?.then(session => {
        session.send([{ text: "I am now sharing my screen with you. Please watch what I am doing and guide me." }]);
      });

      videoFrameIntervalRef.current = window.setInterval(async () => {
        if (!ctx || !sessionPromiseRef.current) return;

        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        sessionPromiseRef.current.then(session => {
          session.sendRealtimeInput({
            media: { mimeType: 'image/jpeg', data: base64 }
          });
        });
      }, 1000);
    }

    return () => {
      if (videoFrameIntervalRef.current) clearInterval(videoFrameIntervalRef.current);
    };
  }, [visualContext, isSessionActive]);

  const handleSendMessage = useCallback(async (text: string) => {
    setTranscriptions(prev => [...prev, { role: 'user', text, isStreaming: false }]);

    if (!isSessionActive) {
      await startTutorSession();
    }

    sessionPromiseRef.current?.then(session => {
      if (session) {
        if (typeof session.send === 'function') {
          session.send([{ text: text }], true);
        } else if (typeof session.sendClientContent === 'function') {
          // Fallback for newer SDK versions where 'send' might be renamed or removed
          // Trying likely signature: { turns: [...], turnComplete: true }
          session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
        } else {
          console.error("Session is not ready or invalid. Missing 'send' method.", session);
        }
      }
    });
  }, [isSessionActive, transcriptions]);

  const handleImageUpload = useCallback(async (base64Data: string, mimeType: string) => {
    setTranscriptions(prev => [...prev, { role: 'user', text: '[Uploaded an Image]', isStreaming: false }]);

    if (!isSessionActive) {
      await startTutorSession();
    }

    setVisualContext({ type: 'document', data: { title: 'Uploaded Artifact', content: <img src={`data:${mimeType};base64,${base64Data}`} className="max-w-full rounded-lg shadow-md" /> } });

    sessionPromiseRef.current?.then(session => {
      session.sendRealtimeInput({
        media: { mimeType: mimeType, data: base64Data }
      });
      session.send([{ text: "I just shared an image. Please analyze this according to our pedagogical rules." }], true);
    });
  }, [isSessionActive]);

  // Handler for game events from interactive graphics - enables AI voice coach to see and respond to gameplay
  const handleGameEvent = useCallback((event: GameEvent) => {
    if (!isSessionActive) return;

    // Format event for AI comprehension
    const eventMessage = formatGameEventForAI(event);

    console.log('[GameEvent]', event.eventType, event.details);

    sessionPromiseRef.current?.then(session => {
      if (session && typeof session.send === 'function') {
        // Send as a system-like message that doesn't show in chat but AI receives
        session.send([{ text: eventMessage }], true);
      } else if (session && typeof session.sendClientContent === 'function') {
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: eventMessage }] }], turnComplete: true });
      }
    });
  }, [isSessionActive]);

  const handleAssessmentComplete = useCallback(async (result: { success: boolean, value: any, attemptCount: number, details?: string }) => {
    if (!isSessionActive) return;

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

    // 3. Send the result to Atlas so it can react verbally
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

    sessionPromiseRef.current?.then(session => {
      if (session && typeof session.send === 'function') {
        session.send([{ text: msg }], true);
      } else if (session && typeof session.sendClientContent === 'function') {
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: msg }] }], turnComplete: true });
      }
    });
  }, [isSessionActive, activeTopic]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      streamRef.current?.getTracks().forEach(t => t.stop());
      workletNodeRef.current?.disconnect();
      inputAudioContextRef.current?.close();
      workletNodeRef.current = null;
      inputAudioContextRef.current = null;
    } else {
      stopAllAudio();
      setIsRecording(true);
      if (!isSessionActive) await startTutorSession();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx;

        await inputCtx.audioWorklet.addModule('/audio-processor.js');

        const source = inputCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(inputCtx, 'audio-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e) => {
          if (!isSessionActiveRef.current) return;

          const int16Buffer = e.data;

          sessionPromiseRef.current?.then((session) => {
            if (!isSessionActiveRef.current) return;
            try {
              session.sendRealtimeInput({ media: { data: GeminiService.encode(new Uint8Array(int16Buffer)), mimeType: 'audio/pcm;rate=16000' } });
            } catch (e) {
              // Ignore closed socket errors during cleanup
            }
          });
        };

        source.connect(workletNode);
        workletNode.connect(inputCtx.destination);
      } catch (err) {
        setIsRecording(false);
        console.error("Mic Error:", err);
      }
    }
  }, [isRecording, isSessionActive, stopAllAudio]);

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
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden">
      <Sidebar userState={userState} activeTopic={activeTopic} notesCount={notes.length} />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-[360px] shrink-0 flex flex-col bg-white border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-20 relative">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-serif font-bold text-slate-900">Communication</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Voice & Chat Stream</p>
            </div>
          </div>
          <ConversationInterface
            isSessionActive={isSessionActive}
            isRecording={isRecording}
            isVoiceOutputEnabled={isVoiceOutputEnabled}
            onToggleVoiceOutput={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}
            onToggleRecording={toggleRecording}
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageUpload}
            onShareScreen={handleScreenShare}
            transcriptions={transcriptions}
          />
        </div>
        <div className="flex-1 relative flex flex-col overflow-hidden">
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
      </main>
    </div>
  );
};

export default App;