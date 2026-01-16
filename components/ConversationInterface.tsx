
import React, { useRef, useEffect, useState } from 'react';

interface ConversationInterfaceProps {
  isSessionActive: boolean;
  isRecording: boolean;
  isVoiceOutputEnabled: boolean;
  onToggleVoiceOutput: () => void;
  onToggleRecording: () => void;
  onSendMessage: (text: string) => void;
  onImageUpload: (base64: string, mime: string) => void;
  onShareScreen: () => void;
  transcriptions: { role: 'user' | 'atlas', text: string }[];
  // Game coaching props
  isGameActive?: boolean;
  guidedModeEnabled?: boolean;
  onToggleGuidedMode?: () => void;
  onRequestHint?: () => void;
  currentGamePhase?: string;
  // Resume prompt
  showResumePrompt?: { gameId: string; phase: string } | null;
  onResumeGame?: (gameId: string, phase: string) => void;
  onStartOver?: (gameId: string) => void;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  isSessionActive,
  isRecording,
  isVoiceOutputEnabled,
  onToggleVoiceOutput,
  onToggleRecording,
  onSendMessage,
  onImageUpload,
  onShareScreen,
  transcriptions,
  isGameActive = false,
  guidedModeEnabled = true,
  onToggleGuidedMode,
  onRequestHint,
  currentGamePhase,
  showResumePrompt,
  onResumeGame,
  onStartOver
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatValue, setChatValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Auto-scroll to bottom when messages change or when focused
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcriptions, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatValue.trim()) return;
    onSendMessage(chatValue);
    setChatValue("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mime = result.split(',')[0].split(':')[1].split(';')[0];
      onImageUpload(base64, mime);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white relative">
      {/* Header / Connection Status */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-white z-10 shrink-0">
        {/* Top row: Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isSessionActive ? 'Live' : 'Ready'}</span>
          </div>
        </div>

        {/* Voice Mode Toggle - Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { if (!isVoiceOutputEnabled) onToggleVoiceOutput(); }}
            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
              isVoiceOutputEnabled
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-volume-high"></i>
            Voice + Chat
          </button>
          <button
            onClick={() => { if (isVoiceOutputEnabled) onToggleVoiceOutput(); }}
            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
              !isVoiceOutputEnabled
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-comment-dots"></i>
            Chat Only
          </button>
        </div>

      </div>

      {/* Chat History / Stream - Grows/shrinks to fill available space */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth custom-scrollbar bg-slate-50/30 transition-all duration-300`}
        style={{ paddingBottom: isFocused ? '16px' : '20px' }}
      >
        {transcriptions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">Atlas is Listening</h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">Speak, type, or share your screen. Context is preserved across all modes.</p>
          </div>
        ) : (
          transcriptions
            // Filter out empty, placeholder, or spam messages
            .filter(msg => {
              const text = msg.text?.trim() || '';
              // Skip empty messages
              if (!text || text.length < 2) return false;
              // Skip "[No spoken response]" and similar placeholders
              if (text.toLowerCase().includes('no spoken') || text === '[No spoken' || text.startsWith('[No spoken')) return false;
              // Skip very short meaningless messages
              if (text.length < 5 && !text.match(/^[🎓🎯📚✅🏆📝💡🎤⚠️🔄▶️]/)) return false;
              return true;
            })
            .map((msg, i) => (
            <div key={i} className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                }`}>
                {msg.text}
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1.5 px-1">
                {msg.role === 'user' ? 'You' : 'Atlas'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Resume Game Prompt */}
      {showResumePrompt && onResumeGame && onStartOver && (
        <div className="shrink-0 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 px-4 py-4">
          <p className="text-sm font-bold text-amber-800 mb-3">
            <i className="fa-solid fa-bookmark mr-2"></i>
            Continue where you left off?
          </p>
          <p className="text-xs text-amber-700 mb-3">
            You were on the "{showResumePrompt.phase}" phase
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onResumeGame(showResumePrompt.gameId, showResumePrompt.phase)}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-play"></i>
              Resume
            </button>
            <button
              onClick={() => onStartOver(showResumePrompt.gameId)}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-rotate-left"></i>
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Voice Input Prompt - Show when voice mode is on but not recording */}
      {isVoiceOutputEnabled && !isRecording && !isFocused && transcriptions.length > 0 && (
        <div className="shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-600">
              <i className="fa-solid fa-microphone"></i>
              <span className="font-medium">Click the mic button to talk to Atlas</span>
            </div>
            <button
              onClick={onToggleRecording}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-microphone"></i>
              Start Speaking
            </button>
          </div>
        </div>
      )}

      {/* Game Coaching Controls - Always visible when game is active, compact when typing */}
      {isGameActive && (
        <div className={`shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 transition-all duration-300 ${isFocused ? 'px-3 py-2' : 'px-4 py-3'}`}>
          {!isFocused && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <i className="fa-solid fa-gamepad"></i>
                Game Coach
                {currentGamePhase && (
                  <span className="px-2 py-0.5 bg-indigo-100 rounded-full text-indigo-500 text-[9px]">
                    {currentGamePhase}
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            {/* Guided Mode Toggle */}
            <button
              onClick={onToggleGuidedMode}
              className={`flex-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isFocused ? 'px-2 py-1.5' : 'px-3 py-2.5'
              } ${
                guidedModeEnabled
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              <i className={`fa-solid ${guidedModeEnabled ? 'fa-user-graduate' : 'fa-user'}`}></i>
              {isFocused ? (guidedModeEnabled ? 'ON' : 'OFF') : (guidedModeEnabled ? 'Guide ON' : 'Guide OFF')}
            </button>

            {/* Hint Button */}
            <button
              onClick={onRequestHint}
              className={`flex-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200 ${
                isFocused ? 'px-2 py-1.5' : 'px-3 py-2.5'
              }`}
            >
              <i className="fa-solid fa-lightbulb"></i>
              {isFocused ? 'Hint' : 'Get Hint'}
            </button>
          </div>
        </div>
      )}

      {/* Input Area - Never absolute, always in normal flow */}
      <div className={`shrink-0 p-4 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] w-full transition-all duration-300 ${isFocused ? 'p-5 shadow-xl border-t-2 border-indigo-100' : ''}`}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end w-full relative">
          {/* Voice Button - Only visible in Voice + Chat mode */}
          {isVoiceOutputEnabled && (
            <button
              type="button"
              onClick={onToggleRecording}
              title={isRecording ? "Click to stop speaking" : "Click to speak to Atlas"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-300 ring-4 ring-red-200'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg'
              }`}
            >
              <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-lg`}></i>
            </button>
          )}

          {!isFocused && isVoiceOutputEnabled && <div className="h-8 w-px bg-slate-200 mx-1 mb-1"></div>}

          {/* Media Tools - Hide on Focus */}
          {!isFocused && (
            <div className="flex gap-1 shrink-0 mb-1">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Analyze Image/Doc"
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>

              <button
                type="button"
                onClick={onShareScreen}
                title="Share Screen Context"
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <i className="fa-solid fa-display"></i>
              </button>
            </div>
          )}

          {/* Text Input */}
          <textarea
            value={chatValue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              if (!chatValue.trim()) setIsFocused(false);
            }}
            onChange={(e) => {
              setChatValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
                setIsFocused(false);
              }
            }}
            placeholder={isFocused ? "Type your message..." : "Message..."}
            rows={1}
            className={`flex-1 min-w-0 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 border rounded-xl px-4 py-3 text-sm text-slate-800 font-medium placeholder-slate-400 outline-none transition-all resize-none custom-scrollbar ${isFocused ? 'min-h-[60px] text-base shadow-inner' : 'min-h-[44px]'}`}
            style={{ maxHeight: '150px' }}
          />

          {/* Cancel Button - Shows when focused */}
          {isFocused && (
            <button
              type="button"
              onClick={() => { setIsFocused(false); setChatValue(''); }}
              className="shrink-0 text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={(e) => { handleSubmit(e); setIsFocused(false); }}
            disabled={!chatValue.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-transparent shrink-0 ${isFocused ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationInterface;
