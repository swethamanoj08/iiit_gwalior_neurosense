import React, { useState, useEffect, useRef } from 'react';
import { Eye, Activity, RefreshCw, Layers, BrainCircuit, ScanLine } from 'lucide-react';

export default function FocusTracker({ onComplete, autoStart }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [streamKey, setStreamKey] = useState(0);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setResults(null);
    setTimeLeft(20);
    setStreamKey(k => k + 1); // Forces Image to remount and trigger stream
  };

  useEffect(() => {
    let timer;
    if (isAnalyzing && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (isAnalyzing && timeLeft === 0) {
      setIsAnalyzing(false);
      // Wait a tiny bit for the backend to finish the loop and save the dictionary
      setTimeout(() => {
        fetch('http://localhost:8000/api/focus_results')
          .then(res => res.json())
          .then(data => {
              setResults(data);
              if (onComplete) onComplete(data.fatigue);
          })
          .catch(console.error);
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [isAnalyzing, timeLeft]);

  useEffect(() => {
    if (autoStart && !isAnalyzing && !results) {
      startAnalysis();
    }
  }, [autoStart, isAnalyzing, results]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 text-white font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl">
            <Eye className="text-fuchsia-400" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              Neural Precision Focus
            </h2>
            <p className="text-gray-400 text-sm mt-1">Computer-Vision Blink & Fatigue Telemetry</p>
          </div>
        </div>
        
        <button
          onClick={startAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-fuchsia-500/20 transition-all hover:scale-105 active:scale-95"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Analyzing... {timeLeft}s
            </>
          ) : (
            <>
              <ScanLine size={18} />
              Start 20s Scan
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Viewport (Video OR Results) */}
        <div className="lg:col-span-2 relative bg-[#0B0C10] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl flex items-center justify-center min-h-[450px]">
          
          {/* Default / Loading State */}
          {!isAnalyzing && !results && (
             <div className="text-center space-y-4 opacity-50">
               <ScanLine size={48} className="mx-auto text-fuchsia-400 mb-2" />
               <p className="text-lg">Ready for visual telemetry.</p>
               <p className="text-sm text-gray-400">Click "Start 20s Scan" to begin tracking.</p>
             </div>
          )}

          {/* Live Video Stream */}
          {isAnalyzing && (
            <img 
              key={streamKey}
              src={`http://localhost:8000/api/focus_stream?k=${streamKey}`} 
              alt="AI Wellness Monitor Stream" 
              className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity"
            />
          )}

          {/* Render Premium Results */}
          {!isAnalyzing && results && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0B0C10] to-fuchsia-900/20 p-10 flex flex-col justify-center animate-in fade-in duration-700">
              <div className="absolute top-0 right-0 p-6 opacity-30">
                 <BrainCircuit size={120} />
              </div>
              <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Scan Complete
              </h3>
              
              <div className="grid grid-cols-2 gap-8 z-10">
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm font-medium">Focus Level</p>
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">
                    {results.focus} <span className="text-2xl text-pink-500/50">/100</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm font-medium">Total Micro-Blinks</p>
                  <p className="text-5xl font-black text-white">{results.total_blinks}</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-gray-400 text-sm font-medium border-l-2 border-emerald-500 pl-3">Blinks per Minute</p>
                  <p className="text-3xl font-bold text-gray-200 pl-3">{results.blink_rate}</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-gray-400 text-sm font-medium border-l-2 border-yellow-500 pl-3">Fatigue Accumulation</p>
                  <p className="text-3xl font-bold text-gray-200 pl-3">{results.fatigue}%</p>
                </div>
                <div className="col-span-2 space-y-1 mt-4">
                  <p className="text-gray-400 text-sm font-medium border-l-2 border-purple-500 pl-3">Visual Stress Score</p>
                  <p className="text-3xl font-bold text-gray-200 pl-3">{results.stress}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel side */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl group-hover:bg-fuchsia-500/20 transition-all duration-700" />
          
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Layers className="text-fuchsia-400" size={20} />
            <h3 className="text-white font-semibold">How it works</h3>
          </div>
          
          <p className="text-gray-400 text-sm leading-relaxed z-10">
            This module uses a sophisticated 468-point <strong>FaceMesh</strong> model via MediaPipe to track exact eye landmarks. By calculating the <span className="text-fuchsia-300">Eye Aspect Ratio (EAR)</span>, the AI detects micro-blinks and prolonged eye closures in real-time.
          </p>
          
          <ul className="text-sm text-gray-400 space-y-4 mt-2 z-10">
            <li className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-green-500/10"><span className="block w-2 h-2 rounded-full bg-green-500"></span></div>
              <span className="font-medium text-gray-300">Blink tracking isolates fatigue.</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-yellow-500/10"><span className="block w-2 h-2 rounded-full bg-yellow-500"></span></div>
              <span className="font-medium text-gray-300">Fast rate determines elevated stress.</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-orange-500/10"><span className="block w-2 h-2 rounded-full bg-orange-500"></span></div>
              <span className="font-medium text-gray-300">Pro-longed closure tags exhaustion.</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-red-500/10"><span className="block w-2 h-2 rounded-full bg-red-500"></span></div>
              <span className="font-medium text-gray-300">Heatmap targets raw eye activity.</span>
            </li>
          </ul>
          
          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-bold">
               <Activity size={14} className="text-fuchsia-500" />
               AI Vision Pipeline
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
