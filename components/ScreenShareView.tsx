
import React, { useRef, useEffect } from 'react';

interface ScreenShareViewProps {
  stream: MediaStream;
}

const ScreenShareView: React.FC<ScreenShareViewProps> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center relative">
      <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
        <div className="w-2 h-2 bg-white rounded-full"></div> LIVE COACHING
      </div>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-8 px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white text-center max-w-md">
        <p className="text-sm font-medium">Atlas is watching your workflow.</p>
        <p className="text-[10px] opacity-70">"Go ahead and demonstrate the challenge you're facing. I'm following along."</p>
      </div>
    </div>
  );
};

export default ScreenShareView;
