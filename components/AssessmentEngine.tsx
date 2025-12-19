
import React, { useState, useEffect } from 'react';
import { AssessmentData } from '../types';

interface AssessmentEngineProps {
  data: AssessmentData;
  onComplete: (result: { success: boolean, value: any, attemptCount: number, details?: string }) => void;
}

const AssessmentEngine: React.FC<AssessmentEngineProps> = ({ data, onComplete }) => {
  // Common State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [feedback, setFeedback] = useState<'success' | 'failure' | null>(null);
  
  // Target Challenge State
  const [sliderValue, setSliderValue] = useState<number>(data.min || 0);
  
  // Selection State (Multiple Choice / Prediction / Diagnosis)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  // Sorting State
  const [sortItems, setSortItems] = useState<{id: string, label: string}[]>([]);

  // Diagnosis State
  const [inspectedItems, setInspectedItems] = useState<Set<string>>(new Set());
  const [cluesFound, setCluesFound] = useState<string[]>([]);

  // Initialize/Reset
  useEffect(() => {
    setIsSubmitted(false);
    setAttemptCount(0);
    setFeedback(null);
    setSelectedOptionId(null);
    
    // Target Init
    setSliderValue((data.min || 0) + ((data.max || 100) - (data.min || 0)) / 2);
    
    // Sorting Init - Randomize or take default
    if (data.type === 'sorting_challenge' && data.items) {
       const shuffled = [...data.items].sort(() => Math.random() - 0.5);
       setSortItems(shuffled);
    }

    // Diagnosis Init
    setInspectedItems(new Set());
    setCluesFound([]);
  }, [data]);

  // --- SUBMIT HANDLERS ---

  const handleTargetSubmit = () => {
    setAttemptCount(prev => prev + 1);
    setIsSubmitted(true);
    const tolerance = ((data.max || 100) - (data.min || 0)) * 0.05;
    const target = Number(data.correctValue);
    const success = Math.abs(sliderValue - target) <= tolerance;
    setFeedback(success ? 'success' : 'failure');
    setTimeout(() => onComplete({ success, value: sliderValue, attemptCount: attemptCount + 1 }), 1500);
  };

  const handleSelectionSubmit = () => {
    setAttemptCount(prev => prev + 1);
    setIsSubmitted(true);
    let success = false;
    let details = "";

    if (data.type === 'diagnosis_detective') {
        success = selectedOptionId === data.correctDiagnosisId;
        details = `Inspected: ${Array.from(inspectedItems).join(', ')}`;
    } else {
        const option = data.options?.find(o => o.id === selectedOptionId);
        success = !!option?.isCorrect;
        details = option?.feedback || "";
    }

    setFeedback(success ? 'success' : 'failure');
    setTimeout(() => onComplete({ success, value: selectedOptionId, attemptCount: attemptCount + 1, details }), 1500);
  };

  const handleSortSubmit = () => {
      setAttemptCount(prev => prev + 1);
      setIsSubmitted(true);
      
      const currentOrderIds = sortItems.map(i => i.id);
      const correctOrderIds = data.correctOrder || [];
      
      // Check if arrays match
      const success = JSON.stringify(currentOrderIds) === JSON.stringify(correctOrderIds);
      
      setFeedback(success ? 'success' : 'failure');
      setTimeout(() => onComplete({ success, value: currentOrderIds, attemptCount: attemptCount + 1 }), 1500);
  };

  // --- SUB-COMPONENTS ---

  const renderTargetChallenge = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
          <div className="text-4xl font-mono font-bold text-indigo-600">
             {sliderValue.toLocaleString()} <span className="text-lg text-slate-400 font-sans">{data.unit || ''}</span>
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Target Goal</div>
       </div>

       <div className="relative h-16 bg-slate-100 rounded-2xl p-2 flex items-center">
          <input 
            type="range" 
            min={data.min || 0} 
            max={data.max || 100} 
            value={sliderValue} 
            disabled={isSubmitted && feedback === 'success'}
            onChange={(e) => {
               setSliderValue(Number(e.target.value));
               setIsSubmitted(false);
               setFeedback(null);
            }}
            className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-20"
          />
          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10 pointer-events-none">
             <div 
               className="h-full bg-indigo-500 transition-all duration-100 ease-out" 
               style={{ width: `${((sliderValue - (data.min || 0)) / ((data.max || 100) - (data.min || 0))) * 100}%` }}
             ></div>
          </div>
          <div 
             className="absolute h-12 w-12 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-indigo-500 pointer-events-none z-10 transition-all duration-100 ease-out"
             style={{ 
               left: `calc(${((sliderValue - (data.min || 0)) / ((data.max || 100) - (data.min || 0))) * 100}% - 24px)` 
             }}
          >
             <i className="fa-solid fa-grip-lines-vertical"></i>
          </div>
       </div>
       <div className="flex justify-center">
            <button 
                onClick={handleTargetSubmit}
                disabled={isSubmitted && feedback === 'success'}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
            >
                {isSubmitted ? (feedback === 'success' ? 'Target Hit!' : 'Try Again') : 'Commit Value'}
            </button>
       </div>
    </div>
  );

  const renderDiagnosisDetective = () => (
     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inspection Tools</h4>
                {data.investigationItems?.map((item) => {
                    const isInspected = inspectedItems.has(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                const next = new Set(inspectedItems);
                                next.add(item.id);
                                setInspectedItems(next);
                                if (!cluesFound.includes(item.clue)) {
                                    setCluesFound(prev => [...prev, item.clue]);
                                }
                            }}
                            disabled={isInspected}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center ${
                                isInspected ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-indigo-100 bg-white hover:border-indigo-300 text-slate-700 shadow-sm'
                            }`}
                        >
                            <span className="font-bold text-sm">{item.label}</span>
                            {isInspected ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                        </button>
                    )
                })}
            </div>
            
            <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-xs overflow-y-auto h-64 border border-slate-800">
                <div className="text-slate-500 mb-2">// INVESTIGATION LOG</div>
                {cluesFound.length === 0 ? (
                    <div className="text-slate-600 italic">No components inspected yet. Select a tool to gather data.</div>
                ) : (
                    cluesFound.map((clue, i) => (
                        <div key={i} className="mb-2 pb-2 border-b border-slate-800 animate-in fade-in slide-in-from-left-2">
                            <span className="text-emerald-500">{`>`}</span> {clue}
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Final Diagnosis</h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {data.options?.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`px-5 py-3 rounded-xl border-2 font-bold text-sm whitespace-nowrap transition-all ${
                            selectedOptionId === opt.id 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div className="mt-6 flex justify-center">
                <button 
                    onClick={handleSelectionSubmit}
                    disabled={!selectedOptionId || (isSubmitted && feedback === 'success')}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    Submit Diagnosis
                </button>
            </div>
        </div>
     </div>
  );

  const renderSortingChallenge = () => {
    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (isSubmitted && feedback === 'success') return;
        const newItems = [...sortItems];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index-1]] = [newItems[index-1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index+1]] = [newItems[index+1], newItems[index]];
        }
        setSortItems(newItems);
        setIsSubmitted(false);
        setFeedback(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
                {sortItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-1 text-slate-400">
                            <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="hover:text-indigo-600 disabled:opacity-30"><i className="fa-solid fa-caret-up"></i></button>
                            <button onClick={() => moveItem(index, 'down')} disabled={index === sortItems.length - 1} className="hover:text-indigo-600 disabled:opacity-30"><i className="fa-solid fa-caret-down"></i></button>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                            {index + 1}
                        </div>
                        <div className="font-bold text-slate-700">{item.label}</div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center">
                <button 
                    onClick={handleSortSubmit}
                    disabled={isSubmitted && feedback === 'success'}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
                >
                    {isSubmitted ? (feedback === 'success' ? 'Sequence Correct!' : 'Try Again') : 'Verify Order'}
                </button>
            </div>
        </div>
    );
  };

  const renderSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
       {data.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => {
               setSelectedOptionId(option.id);
               setIsSubmitted(false);
               setFeedback(null);
            }}
            disabled={isSubmitted && feedback === 'success'}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group ${
               selectedOptionId === option.id 
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                  : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'
            }`}
          >
             <div className="relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3 transition-colors ${
                   selectedOptionId === option.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                }`}>
                   {option.id}
                </div>
                <div className="font-bold text-slate-800 text-lg">{option.label}</div>
             </div>
          </button>
       ))}
       <div className="md:col-span-2 flex justify-center mt-6">
          <button
            onClick={handleSelectionSubmit}
            disabled={!selectedOptionId || (isSubmitted && feedback === 'success')}
            className={`relative overflow-hidden px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                 isSubmitted 
                    ? feedback === 'success' 
                       ? 'bg-green-500 text-white shadow-green-200 scale-105 cursor-default'
                       : 'bg-red-500 text-white shadow-red-200'
                    : 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
             <span className="relative z-10 flex items-center gap-2">
                 {isSubmitted 
                    ? feedback === 'success' ? <><i className="fa-solid fa-check"></i> Correct!</> : <><i className="fa-solid fa-xmark"></i> Try Again</>
                    : <>{data.type === 'prediction_commit' ? 'Lock In Bet' : 'Commit Answer'} <i className="fa-solid fa-arrow-right"></i></>
                 }
             </span>
          </button>
       </div>
    </div>
  );

  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
         <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-indigo-500 blur-3xl"></div>
         <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
      </div>

      <div className="max-w-3xl w-full relative z-10">
         {/* Header */}
         <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 bg-white shadow-sm text-slate-500`}>
               <i className={`fa-solid ${
                  data.type === 'target_challenge' ? 'fa-bullseye' :
                  data.type === 'prediction_commit' ? 'fa-crystal-ball' :
                  data.type === 'diagnosis_detective' ? 'fa-user-doctor' :
                  data.type === 'sorting_challenge' ? 'fa-arrow-down-1-9' :
                  'fa-magnifying-glass'
               }`}></i>
               {data.type.replace('_', ' ')}
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">{data.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">{data.scenario}</p>
         </div>

         {/* Question Area */}
         <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-8 text-center">{data.question}</h3>
            
            {/* Engine Switcher */}
            {data.type === 'target_challenge' && renderTargetChallenge()}
            {data.type === 'diagnosis_detective' && renderDiagnosisDetective()}
            {data.type === 'sorting_challenge' && renderSortingChallenge()}
            {(data.type === 'multiple_choice' || data.type === 'prediction_commit') && renderSelection()}

            {/* Feedback Reveal */}
            {isSubmitted && feedback === 'success' && data.explanation && (
               <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-3">
                     <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <i className="fa-solid fa-lightbulb"></i>
                     </div>
                     <p className="text-sm text-green-800 leading-relaxed font-medium">
                        {data.explanation}
                     </p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default AssessmentEngine;
