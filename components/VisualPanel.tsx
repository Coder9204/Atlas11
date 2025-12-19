
import React, { useState } from 'react';
import { VisualContext } from '../types';
import YouTubePlayer from './YouTubePlayer';
import GeneratedDiagram from './GeneratedDiagram';
import Whiteboard from './Whiteboard';
import ScreenShareView from './ScreenShareView';
import SmartDashboard from './SmartDashboard';
import PodcastPlayer from './PodcastPlayer';
import BriefingView from './BriefingView';
import AssessmentEngine from './AssessmentEngine';

interface VisualPanelProps {
  context: VisualContext;
  activeTopic: string | null;
  onClose: () => void;
  onTakeNote: () => void;
  onViewArchive: () => void;
  onShareWorkspace: () => void;
  onShareWorkspaceUrl: () => void;
  onAssessmentComplete?: (result: any) => void;
  history?: VisualContext[];
  onRestore?: (index: number) => void;
}

const VisualPanel: React.FC<VisualPanelProps> = ({
  context, activeTopic, onClose, onTakeNote, onViewArchive, onShareWorkspace, onShareWorkspaceUrl, onAssessmentComplete, history = [], onRestore
}) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleAction = (action: () => void, tooltip: string) => {
    action();
    setShowTooltip(tooltip);
    setTimeout(() => setShowTooltip(null), 2000);
  };

  // Render content based on type
  const renderContent = () => {
    switch (context.type) {
      case 'none':
        return <SmartDashboard
          topic={activeTopic || "Discovery Engine"}
          keyPoints={activeTopic ? ["Curating applied syllabus...", "Scanning mastery gaps", "Voice pipeline synchronized"] : ["Identify a learning goal", "Verify existing knowledge", "Open interactive modules"]}
        />;
      case 'youtube':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-black">
              <YouTubePlayer
                videoId={context.data.videoId}
                startTime={context.data.startTime}
                command={context.command}
              />
            </div>
          </div>
        );
      case 'podcast': return <PodcastPlayer title={context.data.title} artist={context.data.artist} coverUrl={context.data.coverUrl} url={context.data.url} />;
      case 'briefing': return <BriefingView title={context.data.title} items={context.data.items} />;
      case 'assessment': return <AssessmentEngine data={context.data} onComplete={(res) => onAssessmentComplete && onAssessmentComplete(res)} />;
      case 'diagram': return <GeneratedDiagram type={context.data.type} data={context.data.data} title={context.data.title} />;
      case 'whiteboard': return <Whiteboard initialDrawing={context.data.initialDrawing} />;
      case 'screen': return <ScreenShareView stream={context.data.stream} />;
      case 'document': return (
        <div className="h-full bg-[#FCFCFC] overflow-y-auto p-8 md:p-16">
          <div className="max-w-3xl mx-auto bg-white p-12 shadow-[0_20px_80px_rgba(0,0,0,0.03)] border border-slate-100 rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <i className={`fa-solid ${context.data.type === 'session_summary' ? 'fa-list-check' : 'fa-file-lines'}`}></i>
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">{context.data.title}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{context.data.type?.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap font-serif leading-relaxed text-slate-600">
              {context.data.content}
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-700 bg-white relative">
      {/* Header Toolbar - Actions moved here for visibility */}
      <header className="px-6 py-3 flex justify-between items-center bg-white border-b border-slate-100 z-30 shadow-sm min-h-[64px]">

        {/* Left: Context Label */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <i className={`fa-solid ${getIconForType(context.type)} text-sm`}></i>
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xs font-serif font-bold text-slate-900 tracking-tight leading-none mb-1">
              {getLabelForType(context.type)}
            </h2>
            <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">
              {activeTopic || 'Atlas Workspace'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">

          {/* History / Archive */}
          <button
            onClick={onViewArchive}
            className="h-8 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition"
            title="View Session History"
          >
            <i className="fa-solid fa-clock-rotate-left"></i> History
          </button>

          {/* Share Screen */}
          <button
            onClick={onShareWorkspace}
            className="h-8 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition"
            title="Share your screen with Atlas"
          >
            <i className="fa-solid fa-display"></i> Share Screen
          </button>

          {/* Copy Link */}
          <button
            onClick={() => handleAction(onShareWorkspaceUrl, "Link Copied!")}
            className="h-8 w-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
            title="Copy link to this session"
          >
            <i className="fa-solid fa-link"></i>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          {/* Close / Minimize */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition"
            title="Minimize Module"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </header>

      {/* Navigation Tabs (History) */}
      {history.length > 0 && (
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {history.map((item, i) => (
            <button
              key={i}
              onClick={() => onRestore && onRestore(i)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition whitespace-nowrap"
            >
              <i className={`fa-solid ${getIconForType(item.type)}`}></i>
              {getLabelForType(item.type)}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 whitespace-nowrap">
            <i className={`fa-solid ${getIconForType(context.type)}`}></i>
            Current: {getLabelForType(context.type)}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-[#FBFBFB]">
        {renderContent()}

        {/* Floating Tooltip/Toast */}
        {showTooltip && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 z-50">
            {showTooltip}
          </div>
        )}
      </div>

      {/* Footer Status - Minimal */}
      <footer className="h-8 bg-white border-t border-slate-100 flex items-center justify-end px-4">
        <span className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Synced
        </span>
      </footer>
    </div>
  );
};

function getIconForType(type: string) {
  switch (type) {
    case 'youtube': return 'fa-brands fa-youtube';
    case 'podcast': return 'fa-solid fa-podcast';
    case 'briefing': return 'fa-brands fa-twitter';
    case 'assessment': return 'fa-solid fa-gamepad';
    case 'diagram': return 'fa-solid fa-chart-network';
    case 'whiteboard': return 'fa-solid fa-person-chalkboard';
    case 'document': return 'fa-solid fa-scroll';
    case 'screen': return 'fa-solid fa-display';
    case 'none': return 'fa-solid fa-grid-2';
    default: return 'fa-solid fa-circle-info';
  }
}

function getLabelForType(type: string) {
  switch (type) {
    case 'youtube': return 'Video Player';
    case 'podcast': return 'Audio Player';
    case 'briefing': return 'Briefing Feed';
    case 'assessment': return 'Game Challenge';
    case 'diagram': return 'Visual Artifact';
    case 'whiteboard': return 'Whiteboard';
    case 'document': return 'Document Viewer';
    case 'screen': return 'Screen Share';
    case 'none': return 'Dashboard';
    default: return 'Module';
  }
}

export default VisualPanel;
