
import React from 'react';

interface SmartDashboardProps {
  topic: string;
  keyPoints: string[];
  level?: string;
}

const SmartDashboard: React.FC<SmartDashboardProps> = ({ topic, keyPoints, level = "Analyzing..." }) => {
  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      <div className="flex-1 p-12 max-w-5xl mx-auto w-full flex flex-col justify-center">
        <div className="flex items-center space-x-3 mb-12">
          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
             Current Focus
          </div>
          <div className="h-[1px] flex-1 bg-slate-100"></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
             <i className="fa-solid fa-signal text-indigo-400"></i> Mastery: {level}
          </div>
        </div>

        <h1 className="text-5xl font-serif font-bold text-slate-900 mb-8 leading-tight tracking-tight">
          {topic}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {keyPoints.map((point, i) => (
             <div key={i} className="group p-8 bg-slate-50/50 rounded-3xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm text-indigo-600 font-serif font-bold italic">
                   {i + 1}
                </div>
                <p className="text-lg text-slate-700 leading-relaxed font-medium">
                  {point}
                </p>
             </div>
           ))}

           {/* AI Insight Card */}
           <div className="md:col-span-2 p-8 bg-indigo-600 rounded-3xl text-white shadow-2xl shadow-indigo-100 flex items-start space-x-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                 <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold mb-2">Coaching Insight</h3>
                <p className="text-indigo-100 leading-relaxed text-sm">
                   Atlas is currently analyzing your speech patterns and response accuracy to build a customized applied learning pathway.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SmartDashboard;
