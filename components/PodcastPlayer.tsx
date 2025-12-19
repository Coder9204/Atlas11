
import React from 'react';

interface PodcastPlayerProps {
  title: string;
  artist?: string;
  coverUrl?: string;
  url?: string;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ title, artist = "Expert Voice", coverUrl, url }) => {
  // Convert standard Spotify URL or URI to Embed URL
  const getEmbedUrl = (inputUrl: string) => {
    if (!inputUrl) return null;

    // Handle spotify: URI scheme (e.g. spotify:episode:123)
    if (inputUrl.startsWith('spotify:')) {
      const parts = inputUrl.split(':');
      const type = parts[1];
      const id = parts[2];
      return `https://open.spotify.com/embed/${type}/${id}`;
    }

    // Handle standard URLs
    if (inputUrl.includes('open.spotify.com/embed')) return inputUrl;
    return inputUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
  };

  const embedUrl = url ? getEmbedUrl(url) : null;

  if (embedUrl) {
    return (
      <div className="h-full w-full bg-[#0F172A] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
          <iframe
            style={{ borderRadius: '12px' }}
            src={embedUrl}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Now Playing</p>
          <h2 className="text-white font-serif text-xl">{title}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F172A] flex flex-col items-center justify-center p-16">
      <div className="max-w-xl w-full flex flex-col items-center">
        {/* Album Art */}
        <div className="w-80 h-80 rounded-[3rem] bg-indigo-600 mb-12 shadow-[0_50px_100px_rgba(79,70,229,0.3)] overflow-hidden border-[12px] border-white/5 relative group">
          <img
            src={coverUrl || "https://images.unsplash.com/photo-1478737270239-2fccd2cdee0c?w=600&h=600&fit=crop"}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
            alt="Podcast Cover"
          />
          <div className="absolute inset-0 bg-indigo-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white text-4xl border border-white/20 animate-pulse">
              <i className="fa-solid fa-play translate-x-1"></i>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4 mb-16">
          <span className="px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Co-Listening Lab
          </span>
          <h2 className="text-4xl font-serif font-bold text-white tracking-tight">{title}</h2>
          <p className="text-lg text-slate-400 font-medium">with {artist}</p>
        </div>

        {/* Waveform Visualizer */}
        <div className="w-full flex items-end justify-between h-20 gap-1.5 mb-16">
          {[...Array(32)].map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div
                key={i}
                className="flex-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                style={{ height: `${height}%`, animationDelay: `${i * 0.05}s` }}
              ></div>
            );
          })}
        </div>

        <div className="w-full space-y-8 p-10 bg-slate-800/40 rounded-[3rem] border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl">
              <i className="fa-solid fa-quote-left"></i>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed italic font-medium">
              "We're listening to this specific segment because the guest explains the 'First Principles' of this topic in a way that few others can. Focus on the transition at 4:20."
            </p>
          </div>

          <div className="h-px bg-white/5"></div>

          <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
            <span>Segment Mastery</span>
            <span className="text-indigo-400">4:20 / 12:45</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastPlayer;
