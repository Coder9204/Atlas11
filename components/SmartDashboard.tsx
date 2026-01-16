
import React from 'react';

interface SmartDashboardProps {
  topic: string;
  keyPoints: string[];
  level?: string;
  onTestDiagram?: (type: string) => void;
}

const SmartDashboard: React.FC<SmartDashboardProps> = ({ topic, keyPoints, level = "Analyzing...", onTestDiagram }) => {
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

           {/* Quick Launch - Interactive Lessons */}
           {onTestDiagram && (
             <div className="md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
               <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                 <i className="fa-solid fa-rocket text-indigo-500"></i>
                 Quick Launch - Interactive Lessons
               </h3>
               <div className="flex flex-wrap gap-2">
                 {/* Wave Physics Games */}
                 <button
                   onClick={() => onTestDiagram('standing_waves')}
                   className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Standing Waves
                 </button>
                 <button
                   onClick={() => onTestDiagram('resonance')}
                   className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Resonance
                 </button>
                 <button
                   onClick={() => onTestDiagram('beats')}
                   className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Beats
                 </button>
                 <button
                   onClick={() => onTestDiagram('doppler_effect')}
                   className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Doppler Effect
                 </button>
                 <button
                   onClick={() => onTestDiagram('wave_speed_tension')}
                   className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Wave Speed & Tension
                 </button>
                 <button
                   onClick={() => onTestDiagram('wave_interference')}
                   className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Wave Interference
                 </button>
                 {/* Other Physics Games */}
                 <button
                   onClick={() => onTestDiagram('wave_particle_duality')}
                   className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Wave-Particle Duality
                 </button>
                 <button
                   onClick={() => onTestDiagram('photoelectric_effect')}
                   className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Photoelectric Effect
                 </button>
                 <button
                   onClick={() => onTestDiagram('thin_film')}
                   className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Thin Film Interference
                 </button>
                 {/* New Physics Games */}
                 <button
                   onClick={() => onTestDiagram('p_waves_s_waves')}
                   className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   P-Waves vs S-Waves
                 </button>
                 <button
                   onClick={() => onTestDiagram('echo_time_of_flight')}
                   className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Echo Time of Flight
                 </button>
                 <button
                   onClick={() => onTestDiagram('diffusion_convection')}
                   className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Diffusion vs Convection
                 </button>
                 <button
                   onClick={() => onTestDiagram('inertia')}
                   className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Inertia (Coin-Card-Cup)
                 </button>
                 <button
                   onClick={() => onTestDiagram('newtons_third_law')}
                   className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all"
                 >
                   Newton's 3rd Law
                 </button>
                 {/* Premium Mechanics Games - High Quality */}
                 <button
                   onClick={() => onTestDiagram('momentum_conservation')}
                   className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold transition-all ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-50"
                 >
                   ⭐ Momentum Conservation
                 </button>
                 <button
                   onClick={() => onTestDiagram('center_of_mass')}
                   className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-all ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-50"
                 >
                   ⭐ Center of Mass
                 </button>
                 <button
                   onClick={() => onTestDiagram('torque')}
                   className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-all ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50"
                 >
                   ⭐ Torque
                 </button>
                 <button
                   onClick={() => onTestDiagram('static_kinetic_friction')}
                   className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-all ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-50"
                 >
                   ⭐ Static vs Kinetic Friction
                 </button>
                 <button
                   onClick={() => onTestDiagram('inclined_plane')}
                   className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold transition-all ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-50"
                 >
                   ⭐ Inclined Plane
                 </button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SmartDashboard;
