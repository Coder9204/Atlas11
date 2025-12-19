
import React from 'react';

const VoiceVisualizer: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-1.5 h-12">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="w-1 bg-indigo-500 rounded-full animate-pulse"
          style={{ 
            height: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        ></div>
      ))}
    </div>
  );
};

export default VoiceVisualizer;
