
import React from 'react';

interface BriefingItem {
  author: string;
  handle: string;
  content: string;
  timestamp: string;
}

interface BriefingViewProps {
  title: string;
  items: BriefingItem[];
}

const BriefingView: React.FC<BriefingViewProps> = ({ title, items }) => {
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-xl w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-200">
             <i className="fa-brands fa-twitter text-xl"></i>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Synthesis</div>
            <h2 className="text-2xl font-serif font-bold text-slate-800 leading-none">{title}</h2>
          </div>
        </div>

        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-8">
          {items.map((item, i) => (
            <div key={i} className="relative pl-8 group animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
              {/* Connector Dot */}
              <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-slate-200 group-hover:border-sky-500 transition-colors"></div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                         {item.author.charAt(0)}
                      </div>
                      <div>
                         <div className="font-bold text-slate-900 text-sm">{item.author}</div>
                         <div className="text-xs text-slate-400 font-medium">{item.handle}</div>
                      </div>
                   </div>
                   <div className="text-[10px] font-medium text-slate-300">{item.timestamp}</div>
                </div>
                <p className="text-slate-700 leading-relaxed text-sm">
                   {item.content}
                </p>
              </div>
            </div>
          ))}
          
          <div className="pl-8 pt-4">
             <div className="text-xs font-bold text-slate-400 italic flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Atlas Monitoring Feed
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefingView;
