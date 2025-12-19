
import React from 'react';

interface CoachAvatarProps {
  isSpeaking: boolean;
  isRecording: boolean;
  onClick: () => void;
  onStopSpeech: () => void;
}

const CoachAvatar: React.FC<CoachAvatarProps> = ({ isSpeaking, isRecording, onClick, onStopSpeech }) => {
  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-center">
      {/* Speaking Halo Indicator */}
      {isSpeaking && (
        <div className="absolute inset-0 w-28 h-28 -m-2">
          <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-indigo-400/20 animate-pulse"></div>
        </div>
      )}

      <div className="relative group flex items-center justify-center">
        {/* Pause/Stop Control Overlay */}
        {isSpeaking && !isRecording && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStopSpeech(); }}
            className="absolute -top-12 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-lg text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 transition-all z-20 flex items-center gap-2"
          >
            <i className="fa-solid fa-hand"></i> Stop Voice
          </button>
        )}

        {/* The "Talking Head" Circle */}
        <div 
          onClick={onClick}
          className={`relative w-24 h-24 rounded-full border-4 shadow-2xl cursor-pointer overflow-hidden transition-all duration-500 transform hover:scale-110 active:scale-95 group ${
            isRecording ? 'border-red-500 shadow-red-200' : 'border-white shadow-indigo-100'
          }`}
        >
          <img 
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop" 
            className={`w-full h-full object-cover transition-all duration-700 ${isSpeaking ? 'scale-110 brightness-110' : 'grayscale-[20%] brightness-90'}`}
            alt="AI Coach"
          />
          
          {/* Animated Waveform Overlay (Stylized) */}
          {isSpeaking && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-1 items-end h-6 z-10">
               <div className="w-1 bg-white rounded-full animate-[bounce_0.6s_infinite] h-3 shadow-sm"></div>
               <div className="w-1 bg-white rounded-full animate-[bounce_0.4s_infinite] h-5 shadow-sm"></div>
               <div className="w-1 bg-white rounded-full animate-[bounce_0.5s_infinite] h-2 shadow-sm"></div>
            </div>
          )}

          {/* Mic/Input Status Indicator */}
          <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
             <i className={`fa-solid ${isRecording ? 'fa-square' : 'fa-microphone'} text-2xl text-white mb-1`}></i>
             <span className="text-[8px] text-white font-bold uppercase">{isRecording ? 'Stop' : 'Speak'}</span>
          </div>
        </div>
      </div>

      {/* Label and Status */}
      <div className="mt-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 shadow-xl flex items-center space-x-3 transition-all">
        <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : isSpeaking ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
           {isRecording ? 'Learner Talking' : isSpeaking ? 'Coach Speaking' : 'Atlas Ready'}
        </span>
      </div>
    </div>
  );
};

export default CoachAvatar;
