
import React, { useRef, useEffect } from 'react';

interface WhiteboardProps {
  initialDrawing?: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ initialDrawing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    // High quality background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid pattern for "Technical" feel
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Drawing Style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '700 32px Fraunces, serif';
    ctx.fillStyle = '#1e293b';

    const drawTopic = initialDrawing || "Applied Concept Derivation";
    ctx.fillText(drawTopic.length > 35 ? drawTopic.substring(0, 35) + '...' : drawTopic, 60, 80);
    
    // Underline with "Marker" feel
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(60, 95); ctx.lineTo(400, 95); ctx.stroke();

    // Sketch some "Logical Components"
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e293b';
    
    // Core Engine Block
    ctx.strokeRect(100, 200, 250, 180);
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText("CORE MECHANISM", 130, 240);
    
    // Detailed inner lines for "Depth"
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(120, 260, 210, 100);
    
    // Outward arrows
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(350, 290); ctx.lineTo(500, 290); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(500, 290); ctx.lineTo(485, 280); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(500, 290); ctx.lineTo(485, 300); ctx.stroke();
    
    // Application Block
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(600, 290, 100, 60, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillText("APPLIED", 560, 285);
    ctx.fillText("DOMAIN", 560, 310);

    // Annotations
    ctx.font = 'italic 14px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText("Note: Feedback loops trigger here", 400, 330);
    
    // Red accent for "Critical Point"
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(500, 290, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillText("! Critical Transition", 515, 295);

  }, [initialDrawing]);

  return (
    <div className="w-full h-full bg-slate-50 relative flex items-center justify-center p-12 overflow-hidden">
      {/* Floating UI Elements for high-end feel */}
      <div className="absolute top-8 left-8 flex flex-col space-y-4 bg-white/80 backdrop-blur-md p-3 rounded-[2rem] border border-slate-200 shadow-2xl z-20">
         <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-200"><i className="fa-solid fa-pen-nib text-lg"></i></div>
         <div className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"><i className="fa-solid fa-shapes text-lg"></i></div>
         <div className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"><i className="fa-solid fa-palette text-lg"></i></div>
         <div className="h-px bg-slate-100 mx-2 my-1"></div>
         <div className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"><i className="fa-solid fa-eraser text-lg"></i></div>
      </div>

      <div className="relative w-full h-full max-w-6xl max-h-[90%] group">
        <canvas ref={canvasRef} className="bg-white border-[12px] border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] rounded-[3rem] w-full h-full" />
        
        {/* Layered Post-it Notes */}
        <div className="absolute -top-6 -right-6 w-56 h-56 bg-[#fef9c3] shadow-2xl transform -rotate-2 p-8 font-serif text-sm text-yellow-900 border-b-[6px] border-yellow-200/50 flex flex-col justify-between hover:rotate-0 transition duration-500">
           <div className="w-8 h-1 bg-yellow-400/30 rounded-full mb-4"></div>
           <p className="leading-relaxed italic">"Mastery isn't about rote learning; it's about seeing the architecture of the idea."</p>
           <div className="text-[10px] font-bold text-yellow-600/50 uppercase text-right">Coach Atlas</div>
        </div>

        <div className="absolute bottom-12 -left-6 w-48 h-16 bg-white shadow-xl rounded-2xl border border-slate-100 p-4 flex items-center gap-3 animate-bounce">
           <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
              <i className="fa-solid fa-check"></i>
           </div>
           <span className="text-[10px] font-bold text-slate-500 uppercase">Live Sync Enabled</span>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
