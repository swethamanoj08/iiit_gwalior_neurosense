import React from 'react';
import { ChevronLeft, Maximize, Activity, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import './StressCam.css';

const StressCam = () => {
  return (
    <div className="stresscam-container">
      {/* Real-time backend AI Video Stream */}
      <img 
        src="http://127.0.0.1:8000/video_feed" 
        alt="AI Camera Feed" 
        className="camera-feed"
      />
      
      {/* Scanner Overlay UI */}
      <div className="scanner-overlay">
         <div className="scan-line"></div>
         <div className="corner top-left"></div>
         <div className="corner top-right"></div>
         <div className="corner bottom-left"></div>
         <div className="corner bottom-right"></div>
      </div>

      {/* Top Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <Link to="/" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
          <ChevronLeft size={24} />
        </Link>
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
           <BrainCircuit size={16} className="text-[#00e5ff]" />
           <span className="text-white text-sm font-medium tracking-wide">AI STRESS ANALYSIS</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
          <Maximize size={20} />
        </button>
      </header>

      {/* Floating Metrics */}
      <div className="absolute top-1/3 left-6 z-10">
         <div className="metric-badge mb-4">
            <span className="text-[10px] text-white/70 uppercase block mb-1">Heart Variability</span>
            <div className="flex items-baseline gap-1">
               <span className="text-xl font-bold text-white">45</span>
               <span className="text-xs text-white/50">ms</span>
            </div>
         </div>
      </div>

      <div className="absolute top-1/2 right-6 z-10">
         <div className="metric-badge">
            <span className="text-[10px] text-white/70 uppercase block mb-1">Micro-expressions</span>
            <div className="flex items-baseline gap-1">
               <span className="text-xl font-bold text-[#00e676]">Calm</span>
            </div>
         </div>
      </div>

      {/* Bottom Status Panel */}
      <div className="absolute bottom-0 left-0 w-full p-6 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 w-full">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-bold">Current Stress Level</h3>
              <div className="flex items-center gap-1 text-[#00e676]">
                 <Activity size={16} />
                 <span className="text-sm font-bold">Low</span>
              </div>
           </div>
           
           <div className="w-full bg-white/10 h-2 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00e676] to-[#00e5ff] w-1/4 rounded-full relative">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_#00e5ff]"></div>
              </div>
           </div>
           
           <p className="text-white/70 text-xs">
             Your vitals are stable. You are exhibiting signs of relaxation. Great time for a focus session!
           </p>
        </div>
      </div>
    </div>
  );
};

export default StressCam;
