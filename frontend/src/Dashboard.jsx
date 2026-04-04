import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Activity, Flame, Footprints, RefreshCw,
  AlertCircle, Brain, TrendingUp, Clock, Eye, Mic, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const API = 'http://localhost:8000';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}{p.name === 'Wellness' ? '/100' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ onStartFatigue }) {
  const [liveData, setLiveData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [error, setError] = useState(null);
  
  // Fatigue Logic (averaging MindScan and Eye Tracker)
  const [fatigueData, setFatigueData] = useState(() => {
    const saved = localStorage.getItem('fatigue_data');
    return saved ? JSON.parse(saved) : { score: null, mindscan: null, focus: null };
  });

  const fetchLive = useCallback(async () => {
    setLoadingLive(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/api/live_wellness?t=${Date.now()}`);
      setLiveData(res.data);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch live data. Is the backend running?');
    }
    setLoadingLive(false);
  }, []);

  const fetchWeekly = useCallback(async () => {
    setLoadingWeekly(true);
    try {
      const res = await axios.get(`${API}/api/weekly_wellness?t=${Date.now()}`);
      setWeeklyData(res.data.weekly_data || []);
    } catch (_) {}
    setLoadingWeekly(false);
  }, []);

  useEffect(() => {
    fetchLive();
    fetchWeekly();
  }, [fetchLive, fetchWeekly]);

  const score = liveData?.wellness_score ?? null;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const chartData = weeklyData.map(d => ({
    day: d.day,
    Wellness: d.wellness_score,
    Steps: Math.round(d.steps / 100) / 10,  // in thousands for scale
  }));

  return (
    <div className="min-h-screen w-full bg-[#080810] text-white font-sans">

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Only show big error if we have NO data at all */}
        {error && !liveData && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}
        {/* Removed stale data warning per user request */}

        {/* Spotlight Row: AI Wellness (75%) + Fatigue (25%) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

          {/* Live Score Circle (MAIN SPOTLIGHT) */}
          <div className="md:col-span-3 relative rounded-3xl p-12 flex flex-col items-center justify-center overflow-hidden border border-white/5 bg-white/[0.02] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-[100px]" style={{ background: scoreColor + '20' }} />

            <p className="text-gray-500 uppercase text-sm tracking-[0.2em] font-bold mb-6 z-10 opacity-50">Neural Wellness Spotlight</p>

            {loadingLive ? (
              <div className="text-8xl font-black text-gray-700 animate-pulse z-10">--</div>
            ) : score !== null ? (
              <div className="z-10 flex flex-col items-center">
                <div className="relative">
                    <span className="text-9xl font-black tracking-tighter" style={{ color: scoreColor, filter: `drop-shadow(0 0 40px ${scoreColor}40)` }}>{score}</span>
                </div>
                <div className="mt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: scoreColor }} />
                    <p className="text-gray-400 font-medium tracking-wide">Real-time Biometric Analysis Active</p>
                </div>
              </div>
            ) : (
              <div className="text-8xl font-black text-gray-800 z-10">--</div>
            )}
            <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />

            <div className="mt-8 z-10 flex gap-3">
              {score >= 80 && <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 shadow-lg shadow-emerald-500/10">Optimum State</span>}
              {score >= 60 && score < 80 && <span className="px-5 py-2 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20 border-dotted">Maintenance Required</span>}
              {score < 60 && score !== null && <span className="px-5 py-2 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20 animate-pulse">Critical Recovery Phase</span>}
            </div>
          </div>

          {/* Fatigue / Cognitive Analysis Card (COMPACT) */}
          <div className="md:col-span-1 relative rounded-3xl p-6 flex flex-col items-center justify-between border border-white/5 bg-white/[0.02] shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="text-center w-full relative z-10">
                <p className="text-gray-500 uppercase text-[10px] tracking-widest font-bold mb-4 opacity-50">Fatigue Diagnostic</p>
                {fatigueData.score !== null ? (
                <div className="z-10 flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-4xl font-black text-cyan-400">{fatigueData.score}%</span>
                        <Zap size={20} className="text-yellow-400 animate-pulse" />
                    </div>
                    <div className="flex gap-4 mt-2">
                        <div className="text-center">
                            <p className="text-[8px] text-gray-500 uppercase">Voice AI</p>
                            <p className="text-xs font-bold text-emerald-400">{fatigueData.mindscan}%</p>
                        </div>
                        <div className="text-center border-l border-white/10 pl-4">
                            <p className="text-[8px] text-gray-500 uppercase">Eye Cam</p>
                            <p className="text-xs font-bold text-emerald-400">{fatigueData.focus}%</p>
                        </div>
                    </div>
                </div>
                ) : (
                    <div className="z-10 py-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                            <Zap size={22} className="text-cyan-400" />
                        </div>
                        <p className="text-gray-500 text-[10px] max-w-[140px] mx-auto text-center leading-relaxed">
                            Requires Voice + Eye calibration
                        </p>
                    </div>
                )}
            </div>
            
            <button 
                onMouseOver={() => console.log("MOUSE HOVER: FATIGUE BUTTON")}
                onClick={() => {
                    console.log("DASHBOARD: FATIGUE TRIGGERED");
                    if(typeof onStartFatigue === 'function') {
                        onStartFatigue();
                    } else if (window.startFatigueWorkflow) {
                        window.startFatigueWorkflow();
                    }
                }}
                style={{ position: 'relative', zIndex: 9999 }}
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white py-3 rounded-2xl text-xs font-bold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all cursor-pointer active:scale-95"
            >
                {fatigueData.score !== null ? "Recalibrate AI" : "Calculate Fatigue"}
            </button>
          </div>
        </div>

        {/* Supporting Metrics Row: Biometrics (75%) + Verdict (25%) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="md:col-span-3 grid grid-cols-3 gap-4">
            {[
              { label: 'Daily Steps', icon: <Footprints size={18} />, color: 'emerald', value: liveData ? Math.round(liveData.raw_metrics.TotalSteps).toLocaleString() : '--', unit: '' },
              { label: 'Calories', icon: <Flame size={18} />, color: 'orange', value: liveData ? Math.round(liveData.raw_metrics.Calories) : '--', unit: 'kcal' },
              { label: 'Active Min', icon: <Activity size={18} />, color: 'cyan', value: liveData ? Math.round(liveData.raw_metrics.VeryActiveMinutes + liveData.raw_metrics.FairlyActiveMinutes + liveData.raw_metrics.LightlyActiveMinutes) : '--', unit: 'min' },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 group hover:border-white/10 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${m.color}-500/10 text-${m.color}-400 group-hover:scale-110 transition-transform`}>
                  {m.icon}
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tight">{m.label}</p>
                  <p className="text-2xl font-black text-white mt-0.5">
                    {loadingLive ? <span className="text-gray-600 animate-pulse">--</span> : m.value}
                    {m.unit && <span className="text-gray-500 text-xs font-normal ml-1">{m.unit}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Verdict Card (Small Spotlight Alignment) */}
          <div className="md:col-span-1 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
                <Brain className="text-emerald-400" size={16} />
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.1em]">Neural Verdict</p>
            </div>
            <p className="text-gray-200 text-[11px] leading-relaxed font-medium">
                {loadingLive ? 'Calibrating...' : liveData?.feedback ?? 'System ready for telemetry.'}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
                {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500/30" />)}
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-cyan-400" size={20} />
              <div>
                <h2 className="text-white font-semibold">7-Day Wellness Trend</h2>
                <p className="text-gray-500 text-xs mt-0.5">AI score derived from daily Google Fit telemetry</p>
              </div>
            </div>
            {loadingWeekly && <RefreshCw size={15} className="text-gray-500 animate-spin" />}
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Wellness"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#wellnessGrad)"
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              {loadingWeekly ? 'Fetching 7-day history from Google Fit...' : 'Click Sync Watch to load weekly trend data.'}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
