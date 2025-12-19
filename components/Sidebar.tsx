
import React, { useState } from 'react';
import { UserState } from '../types';

interface SidebarProps {
  userState: UserState;
  activeTopic: string | null;
  notesCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ userState, activeTopic, notesCount }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <aside className="w-16 lg:w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 z-30 transition-all duration-300">
      {/* Brand Icon */}
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-900/50 mb-8">
        <span className="font-serif text-lg">A</span>
      </div>

      {/* Navigation Icons */}
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        
        {/* Focus / Active Topic */}
        <div className="relative group">
          <button 
            onClick={() => toggleSection('focus')}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${activeTopic ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-crosshairs text-lg mb-1"></i>
            <span className="text-[8px] font-bold uppercase">Focus</span>
          </button>
          
          {/* Popover for Focus */}
          {expandedSection === 'focus' && (
            <div className="absolute left-full top-0 ml-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in slide-in-from-left-2 duration-200 z-50">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Current Focus</h3>
              {activeTopic ? (
                <div>
                   <div className="text-lg font-serif font-bold text-slate-900 leading-tight mb-2">{activeTopic}</div>
                   <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                     Live Context Active
                   </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No specific topic selected. Start chatting to define a goal.</p>
              )}
            </div>
          )}
        </div>

        {/* Notes / Insights */}
        <div className="relative group">
          <button 
             onClick={() => toggleSection('notes')}
             className="w-full aspect-square rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-amber-400 transition-all"
          >
            <i className="fa-regular fa-note-sticky text-lg mb-1"></i>
            <span className="text-[8px] font-bold uppercase">Notes</span>
          </button>

          {expandedSection === 'notes' && (
            <div className="absolute left-full top-0 ml-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in slide-in-from-left-2 duration-200 z-50">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Session Journal</h3>
                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">{notesCount}</span>
               </div>
               <p className="text-xs text-slate-500 mb-3">Insights are automatically captured during key learning moments.</p>
               <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition">View All Notes</button>
            </div>
          )}
        </div>

        {/* Mastery */}
        <div className="relative group">
          <button 
             onClick={() => toggleSection('mastery')}
             className="w-full aspect-square rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-emerald-400 transition-all"
          >
            <i className="fa-solid fa-chart-pie text-lg mb-1"></i>
            <span className="text-[8px] font-bold uppercase">Stats</span>
          </button>

          {expandedSection === 'mastery' && (
             <div className="absolute left-full top-0 ml-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 animate-in slide-in-from-left-2 duration-200 z-50">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mastery Map</h3>
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                         <span>Compound Interest</span>
                         <span>45%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                         <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                         <span>Applied Finance</span>
                         <span>10%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                         <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] text-slate-400 text-center">
                   Updated in real-time based on responses.
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="mb-4">
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700" alt="Profile" />
      </div>
    </aside>
  );
};

export default Sidebar;
