
import React, { useState, useEffect, useRef } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  startTime?: number;
  command?: { action: 'pause' | 'play' | 'seek', timestamp?: number, id: string };
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, startTime = 0, command }) => {
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Improved embed parameters for better compatibility
  const origin = window.location.origin;

  // Robust ID extraction
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : (url.length === 11 ? url : null);
  };

  const cleanVideoId = getYouTubeId(videoId);
  const isValidId = !!cleanVideoId;

  const embedUrl = isValidId
    ? `https://www.youtube.com/embed/${cleanVideoId}?start=${startTime}&autoplay=1&mute=0&modestbranding=1&rel=0&origin=${origin}&enablejsapi=1&widget_referrer=${origin}`
    : '';

  useEffect(() => {
    setHasError(!isValidId);
  }, [videoId, isValidId]);

  // Handle AI Commands
  useEffect(() => {
    if (!command || !iframeRef.current) return;

    const contentWindow = iframeRef.current.contentWindow;
    if (!contentWindow) return;

    switch (command.action) {
      case 'pause':
        contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
        break;
      case 'play':
        contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        break;
      case 'seek':
        if (command.timestamp !== undefined) {
          contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [command.timestamp, true] }), '*');
        }
        break;
    }
  }, [command]);

  return (
    <div className="w-full h-full bg-slate-950 relative group">
      {!hasError ? (
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={embedUrl}
          title="Atlas Educational Feed"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="bg-black shadow-2xl"
          onError={() => setHasError(true)}
        ></iframe>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white p-12 text-center bg-slate-900 border-4 border-dashed border-slate-800 rounded-[3rem]">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
            <i className="fa-brands fa-youtube text-4xl text-red-500"></i>
          </div>
          <h3 className="text-2xl font-serif font-bold mb-4">Content Unavailable</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
            YouTube's policies sometimes prevent direct embedding. You can view this specific segment directly on their platform.
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}&t=${startTime}s`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4 bg-indigo-600 rounded-[2rem] text-white font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-2xl shadow-indigo-500/30 active:scale-95 flex items-center gap-3"
          >
            <i className="fa-solid fa-arrow-up-right-from-square"></i> Open Segment
          </a>
        </div>
      )}

      <div className="absolute top-6 right-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-3">
          <i className="fa-brands fa-youtube text-red-500 text-base"></i> Video Artifact Sync
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;
