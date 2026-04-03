import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Stats.css';
import StatsBackground from './StatsBackground';

// ── Data Constants ──
const chartData = {
  all: [
    {day:'Mon', completed:80, partial:10, missed:10},
    {day:'Tue', completed:60, partial:25, missed:15},
    {day:'Wed', completed:90, partial:5,  missed:5},
    {day:'Thu', completed:50, partial:30, missed:20},
    {day:'Fri', completed:70, partial:20, missed:10},
    {day:'Sat', completed:40, partial:10, missed:50},
    {day:'Sun', completed:33, partial:10, missed:57},
  ],
  study: [
    {day:'Mon',completed:90,partial:5,missed:5},
    {day:'Tue',completed:70,partial:20,missed:10},
    {day:'Wed',completed:100,partial:0,missed:0},
    {day:'Thu',completed:60,partial:30,missed:10},
    {day:'Fri',completed:80,partial:10,missed:10},
    {day:'Sat',completed:50,partial:20,missed:30},
    {day:'Sun',completed:40,partial:20,missed:40},
  ],
  health: [
    {day:'Mon',completed:70,partial:15,missed:15},
    {day:'Tue',completed:50,partial:30,missed:20},
    {day:'Wed',completed:80,partial:10,missed:10},
    {day:'Thu',completed:40,partial:30,missed:30},
    {day:'Fri',completed:60,partial:25,missed:15},
    {day:'Sat',completed:30,partial:10,missed:60},
    {day:'Sun',completed:25,partial:15,missed:60},
  ],
  leisure: [
    {day:'Mon',completed:100,partial:0,missed:0},
    {day:'Tue',completed:80,partial:20,missed:0},
    {day:'Wed',completed:90,partial:10,missed:0},
    {day:'Thu',completed:70,partial:20,missed:10},
    {day:'Fri',completed:100,partial:0,missed:0},
    {day:'Sat',completed:60,partial:30,missed:10},
    {day:'Sun',completed:50,partial:30,missed:20},
  ],
};

const tasksRingsData = [
  {name:'Study',    pct:75, color:'var(--teal)'},
  {name:'Sleep',    pct:88, color:'var(--purple)'},
  {name:'Exercise', pct:60, color:'var(--orange)'},
  {name:'Coding',   pct:90, color:'#00d4ff'},
  {name:'Leisure',  pct:50, color:'#f7706a'},
  {name:'Hydration',pct:70, color:'#3dffc0'},
];

const taskColors = {
  Study: 'var(--purple)',
  Coding: 'var(--teal)',
  Exercise: 'var(--orange)',
  Leisure: '#f7706a'
};

const hmData = [
  1,0,2,3,4,2,1,
  0,1,3,4,3,1,0,
  2,3,4,3,2,1,0,
  1,2,3,4,3,2,1,
];

const initialSessionLog = [
  { task: 'Coding', dur: '48m 20s', time: '9:00 AM', color: 'var(--teal)' },
  { task: 'Study', dur: '32m 10s', time: '10:15 AM', color: 'var(--purple)' },
  { task: 'Exercise', dur: '25m 00s', time: '12:30 PM', color: 'var(--orange)' },
  { task: 'Study', dur: '28m 44s', time: '2:00 PM', color: 'var(--teal)' },
];

const Stats = () => {
  const [currentTab, setCurrentTab] = useState('all');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState('Study');
  const [sessionLog, setSessionLog] = useState(initialSessionLog);
  const [toastMsg, setToastMsg] = useState(null);
  
  const [mounted, setMounted] = useState(false);
  
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRunning]);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const showToast = (msg) => setToastMsg(msg);

  const pad = (n) => String(n).padStart(2,'0');

  const getTimerDisplay = () => {
    const h = Math.floor(timerSeconds/3600);
    const m = Math.floor((timerSeconds%3600)/60);
    const s = timerSeconds%60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const getTodayTotalDisplay = () => {
    const base = 2*3600 + 14*60;
    const total = base + timerSeconds;
    const h = Math.floor(total/3600);
    const m = Math.floor((total%3600)/60);
    return `${h}h ${pad(m)}m`;
  };

  const timerProgress = Math.min(timerSeconds / 7200, 1);
  const timerCirc = 553;
  const timerOffset = timerCirc - (timerProgress * timerCirc);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (timerSeconds > 10) {
      logSession();
    }
    setIsRunning(false);
    setTimerSeconds(0);
  };

  const logSession = () => {
    const h = Math.floor(timerSeconds/3600);
    const m = Math.floor((timerSeconds%3600)/60);
    const s = timerSeconds%60;
    const dur = h>0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}m ${pad(s)}s`;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    
    setSessionLog(prev => [
      { task: selectedTask, dur, time, color: taskColors[selectedTask] || 'var(--teal)' },
      ...prev
    ]);
    showToast(`Session saved: ${dur} of ${selectedTask}`);
  };

  const downloadCert = () => showToast('📥 Certificate saved as PDF!');
  const shareCert = () => {
    if (navigator.share) {
      navigator.share({title:'My Wellness 360 Certificate', text:'I earned a Wellness 360 Certificate of Appreciation!'});
    } else {
      navigator.clipboard.writeText('Check out my Wellness 360 Certificate! 🏅');
      showToast('🔗 Link copied to clipboard!');
    }
  };

  return (
    <div className="main-stats-page" style={{position:'relative', zIndex:1, overflow:'hidden'}}>
      <StatsBackground />
      <div className="main_content" style={{position:'relative', zIndex:10}}>

        {/* Header */}
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <Link to="/" className="page-back">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
            <div>
              <div className="page-title">Stats &amp; Progress</div>
              <div className="page-subtitle">Week of Mar 24 – Mar 30, 2026</div>
            </div>
          </div>
          <div className="header-actions">
            <div className="icon-btn"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <div className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
          </div>
        </div>

        {/* Overview stat cards */}
        <div className="overview-grid">
          <div className="ov-card">
            <div className="ov-icon" style={{background:'var(--teal-dim)'}}>💓</div>
            <div className="ov-val" style={{color:'var(--teal)'}}>84</div>
            <div className="ov-label">Wellness Score</div>
            <div className="ov-trend trend-up">↑ +12 from last week</div>
          </div>
          <div className="ov-card">
            <div className="ov-icon" style={{background:'var(--purple-dim)'}}>🧠</div>
            <div className="ov-val" style={{color:'var(--purple)'}}>{getTodayTotalDisplay()}</div>
            <div className="ov-label">Total Focus Time</div>
            <div className="ov-trend trend-up">↑ +1h 10m this week</div>
          </div>
          <div className="ov-card">
            <div className="ov-icon" style={{background:'var(--orange-dim)'}}>📋</div>
            <div className="ov-val" style={{color:'var(--orange)'}}>33%</div>
            <div className="ov-label">Tasks Completed</div>
            <div className="ov-trend trend-down">↓ 2/6 tasks today</div>
          </div>
        </div>

        <div className="two-col">

          {/* ── Timetable Progress Graph ── */}
          <div className="section full-col a1">
            <div className="section-head">
              <div className="section-title"><span className="icon">📊</span> Timetable Follow Progress</div>
              <select style={{background:'var(--card2)',border:'1px solid var(--border)',color:'var(--sub)',borderRadius:'8px',padding:'5px 10px',fontSize:'12px',fontFamily:"'Outfit',sans-serif",outline:'none',cursor:'pointer'}}>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="graph-card">
              <div className="graph-tabs">
                {['all','study','health','leisure'].map(tab => (
                  <button key={tab} className={`g-tab ${currentTab===tab ? 'active':''}`} onClick={()=>setCurrentTab(tab)}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab==='all'&&'Tasks'}
                  </button>
                ))}
              </div>

              <div className="bar-chart">
                {chartData[currentTab].map((d, i) => {
                  const total = d.completed + d.partial + d.missed;
                  const cH = (d.completed / total * 100).toFixed(0);
                  const pH = (d.partial / total * 100).toFixed(0);
                  return (
                    <div className="bar-col" key={i}>
                      <div className="bar-wrap" style={{flexDirection:'column-reverse',gap:'2px'}}>
                        <div className="bar bar-completed" style={{height: mounted ? `${cH}%` : '0%'}} data-val={`${d.completed}%`}></div>
                        {d.partial > 0 && <div className="bar bar-partial" style={{height: mounted ? `${pH}%` : '0%'}} data-val={`${d.partial}%`}></div>}
                      </div>
                      <div className="bar-label">{d.day}</div>
                    </div>
                  );
                })}
              </div>

              <div className="chart-legend">
                <div className="legend-item"><div className="legend-dot" style={{background:'var(--teal)'}}></div>Completed</div>
                <div className="legend-item"><div className="legend-dot" style={{background:'var(--purple)'}}></div>Partial</div>
                <div className="legend-item"><div className="legend-dot" style={{background:'var(--border)'}}></div>Missed</div>
              </div>

              {/* Per-task rings */}
              <div className="task-rings">
                {tasksRingsData.map((t, i) => {
                  const r = 36, c = 44, circ = 2 * Math.PI * r;
                  const offset = circ - (t.pct / 100) * circ;
                  return (
                    <div className="task-ring-card" key={i}>
                      <div className="ring-svg-wrap">
                        <svg width="88" height="88" viewBox="0 0 88 88" style={{transform:'rotate(-90deg)'}}>
                          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--card2)" strokeWidth="7"/>
                          <circle cx={c} cy={c} r={r} fill="none" stroke={t.color} strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={mounted ? offset : circ}
                            style={{transition:'stroke-dashoffset 1.2s cubic-bezier(0.34,1.1,0.64,1)'}}
                          />
                        </svg>
                        <div className="ring-center-text">
                          <div className="ring-pct" style={{color:t.color}}>{t.pct}%</div>
                        </div>
                      </div>
                      <div className="ring-task-name">{t.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Focus Timer ── */}
          <div className="section a2" style={{gridColumn:'1/-1'}}>
            <div className="section-head">
              <div className="section-title"><span className="icon">⏱️</span> Focus Session</div>
              <div style={{fontSize:'12px',color:'var(--muted)'}}>Click timer to start / pause</div>
            </div>

            <div className="focus-card">
              <div className="focus-layout">

                {/* Timer circle */}
                <div className="focus-timer-side">
                  <div className="timer-display" onClick={toggleTimer}>
                    <svg width="200" height="200" viewBox="0 0 200 200" style={{transform:'rotate(-90deg)'}}>
                      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--card2)" strokeWidth="10"/>
                      <circle cx="100" cy="100" r="88" fill="none"
                        stroke={isRunning || timerSeconds>0 ? 'var(--teal)' : 'var(--teal)'} 
                        strokeWidth="10" strokeLinecap="round" strokeDasharray="553"
                        strokeDashoffset={timerOffset}
                        style={{transition:'stroke-dashoffset 1s linear'}}/>
                    </svg>
                    <div className="timer-center">
                      <div className="timer-time">{getTimerDisplay()}</div>
                      <div className="timer-label">Focus Time</div>
                      <div className={`timer-status ${isRunning ? 'status-active' : timerSeconds>0 ? 'status-paused' : 'status-idle'}`}>
                        {isRunning ? 'ACTIVE' : timerSeconds>0 ? 'PAUSED' : 'IDLE'}
                      </div>
                    </div>
                  </div>

                  <div className="timer-controls">
                    <button className={`ctrl-btn ${isRunning ? 'btn-pause' : 'btn-start'}`} onClick={toggleTimer}>
                      {isRunning ? '⏸ Pause' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> {timerSeconds>0 ? 'Resume':'Start'}</>}
                    </button>
                    <button className="ctrl-btn btn-reset" onClick={resetTimer}>↺ Reset</button>
                  </div>
                </div>

                {/* Right side */}
                <div className="focus-info-side">
                  {/* Focus stats */}
                  <div className="focus-stats" style={{marginBottom:'14px'}}>
                    <div className="fstat">
                      <div className="fstat-val" style={{color:'var(--teal)'}}>{getTodayTotalDisplay()}</div>
                      <div className="fstat-label">Today Total</div>
                    </div>
                    <div className="fstat">
                      <div className="fstat-val" style={{color:'var(--purple)'}}>{sessionLog.length}</div>
                      <div className="fstat-label">Sessions</div>
                    </div>
                    <div className="fstat">
                      <div className="fstat-val" style={{color:'var(--orange)'}}>48m</div>
                      <div className="fstat-label">Longest</div>
                    </div>
                  </div>

                  {/* Task selector */}
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontSize:'12px',color:'var(--muted)',fontWeight:600,marginBottom:'6px',letterSpacing:'0.4px'}}>FOCUS TASK</div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {['Study','Coding','Exercise','Leisure'].map(t => {
                        const isSel = selectedTask === t;
                        return (
                          <button key={t} className="ctrl-btn" 
                            style={{
                              background: isSel ? 'var(--teal-dim)' : 'var(--card2)',
                              border: `1px solid ${isSel ? 'var(--teal)' : 'var(--border)'}`,
                              color: isSel ? 'var(--teal)' : 'var(--muted)',
                              padding: '6px 12px', fontSize:'12px', borderRadius:'8px'
                            }} 
                            onClick={()=>setSelectedTask(t)}>
                            {t==='Study'?'📖':t==='Coding'?'💻':t==='Exercise'?'🏃':'🎮'} {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Session log */}
                  <div className="session-log">
                    <div className="log-title">Session History</div>
                    <div>
                      {sessionLog.map((log, i) => (
                        <div className="log-entry" key={i}>
                          <div className="log-task"><div className="log-dot" style={{background:log.color}}></div>{log.task}</div>
                          <div className="log-dur">{log.dur}</div>
                          <div className="log-time">{log.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Focus heatmap */}
              <div style={{marginTop:'20px',paddingTop:'20px',borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--sub)',marginBottom:'10px'}}>Focus Activity — Last 28 Days</div>
                <div className="hm-days">
                  {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} className="hm-day">{d}</div>)}
                </div>
                <div className="heatmap-grid">
                  {hmData.map((v,i) => <div key={i} className={`hm-cell hm-${v}`} title={`${v*30} min focus`}></div>)}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'8px',justifyContent:'flex-end'}}>
                  <span style={{fontSize:'10px',color:'var(--muted)'}}>Less</span>
                  {[0,1,2,3,4].map(v=><div key={v} style={{width:'10px',height:'10px',borderRadius:'2px'}} className={`hm-${v}`}></div>)}
                  <span style={{fontSize:'10px',color:'var(--muted)'}}>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Certificate of Appreciation ── */}
          <div className="section cert-section full-col a6">
            <div className="section-head">
              <div className="section-title"><span className="icon">🏆</span> Certificate of Appreciation</div>
              <div style={{fontSize:'12px',color:'var(--muted)'}}>Earned by completing 75% weekly goal</div>
            </div>

            <div className="unlock-bar-wrap" style={{marginBottom:'16px'}}>
              <div className="unlock-label">
                <span>Weekly goal progress</span>
                <span style={{color:'var(--teal)',fontWeight:700}}>75% / 100%</span>
              </div>
              <div className="unlock-track">
                <div className="unlock-fill" style={{width: mounted ? '75%' : '0%'}}></div>
              </div>
            </div>

            <div className="cert-card">
              <div className="cert-corner-bl"></div>
              <div className="cert-inner">
                <div className="cert-badge">🏅</div>
                <div className="cert-presents">Wellness 360 · IIIT Hackathon</div>
                <div className="cert-title-main">Certificate of <span>Appreciation</span></div>
                <div className="cert-sub">Academic Wellness &amp; Productivity Excellence</div>

                <div className="cert-divider"><span>✦ awarded to ✦</span></div>

                <div className="cert-awarded">This certificate is proudly presented to</div>
                <div className="cert-name">Student</div>
                <div className="cert-reason">
                  For outstanding commitment to personal wellness, consistent timetable adherence,
                  and exceptional focus discipline during the academic week of March 2026.
                </div>

                <div className="cert-stats-row">
                  <div className="cert-stat">
                    <div className="cert-stat-val">5h 42m</div>
                    <div className="cert-stat-label">Focus Time</div>
                  </div>
                  <div className="cert-stat">
                    <div className="cert-stat-val">12</div>
                    <div className="cert-stat-label">Sessions</div>
                  </div>
                  <div className="cert-stat">
                    <div className="cert-stat-val">84</div>
                    <div className="cert-stat-label">Wellness Score</div>
                  </div>
                  <div className="cert-stat">
                    <div className="cert-stat-val" style={{fontSize:'18px'}}>Level 12</div>
                    <div className="cert-stat-label">Achievement</div>
                  </div>
                </div>

                <div className="cert-footer">
                  <div className="cert-sig">
                    <div className="cert-sig-name">Prof. A. Kumar</div>
                    <div className="cert-sig-role">Wellness Coordinator · IIIT</div>
                  </div>
                  <div className="cert-seal">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <div className="cert-seal-text">IIIT<br/>VERIFIED</div>
                  </div>
                  <div className="cert-date">
                    <div className="cert-date-val">{new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                    <div className="cert-date-label">Date of Issue</div>
                  </div>
                </div>
              </div>

              <div className="cert-actions">
                <button className="cert-btn btn-download" onClick={downloadCert}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Certificate
                </button>
                <button className="cert-btn btn-share" onClick={shareCert}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  );
};

export default Stats;
