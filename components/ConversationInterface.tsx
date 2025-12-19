
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
  transcriptions
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatValue, setChatValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcriptions]);

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
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header / Mode Toggle */}
      <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isSessionActive ? 'Live Connection' : 'Ready'}</span>
        </div>
        <button
          onClick={onToggleVoiceOutput}
          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${isVoiceOutputEnabled ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
        >
          <i className={`fa-solid ${isVoiceOutputEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
          {isVoiceOutputEnabled ? 'Audio On' : 'Muted'}
        </button>
      </div>

      {/* Chat History / Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth pb-20 custom-scrollbar bg-slate-50/30">
        {transcriptions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">Atlas is Listening</h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">Speak, type, or share your screen. Context is preserved across all modes.</p>
          </div>
        ) : (
          transcriptions.map((msg, i) => (
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

      {/* Input Area */}
      <div className={`p-4 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] w-full max-w-full transition-all duration-300 ${isFocused ? 'absolute bottom-0 left-0 right-0 z-50 p-6 shadow-2xl border-t-2 border-indigo-100' : 'relative'}`}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end w-full relative">
          {/* Voice Button - Hide on Focus */}
          {!isFocused && (
            <button
              type="button"
              onClick={onToggleRecording}
              title={isRecording ? "Stop Voice" : "Start Voice"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
          )}

          {!isFocused && <div className="h-8 w-px bg-slate-200 mx-1 mb-1"></div>}

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
              e.target.style.height = e.target.scrollHeight + 'px';
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
            className={`flex-1 min-w-0 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 border rounded-xl px-4 py-3 text-sm text-slate-800 font-medium placeholder-slate-400 outline-none transition-all resize-none custom-scrollbar ${isFocused ? 'min-h-[80px] text-base shadow-inner' : 'min-h-[44px]'}`}
            style={{ maxHeight: isFocused ? '200px' : '120px' }}
          />

          {/* Close Focus Button */}
          {isFocused && (
            <button
              type="button"
              onClick={() => setIsFocused(false)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm"
            >
              Cancel
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={(e) => { handleSubmit(e); setIsFocused(false); }}
            disabled={!chatValue.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-transparent mb-1 ${isFocused ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationInterface;
