import React, { useState, useEffect } from 'react'
import Dashboard from './Dashboard'
import MindScan from './MindScan'
import MindGuard from './MindGuard'
import Workout from './Workout'
import FocusTracker from './FocusTracker'
import InstagramFeed from './InstagramFeed'
import Login from './Login'
import Timetable from './Timetable'

function App() {
  const [page, setPage] = useState('dashboard')
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('wellbeing_auth')
    return saved ? JSON.parse(saved) : null
  })
  const [workflowMode, setWorkflowMode] = useState(false);

  // Fatigue Workflow Controller
  const triggerFatigueDiagnostic = React.useCallback(() => {
    console.log("APP: TRIGGERING FATIGUE DIAGNOSTIC...");
    alert("APP LEVEL: STARTING BIO-DIAGNOSTIC FLOW");
    setWorkflowMode(true);
    setPage('mindscan');
  }, []);

  useEffect(() => {
    window.startFatigueWorkflow = triggerFatigueDiagnostic;
  }, [triggerFatigueDiagnostic]);

  const onLoginSuccess = (userData) => {
    setAuth(userData)
    localStorage.setItem('wellbeing_auth', JSON.stringify(userData))
    setPage('dashboard')
  }

  const onLogout = () => {
    setAuth(null)
    localStorage.removeItem('wellbeing_auth')
    setPage('dashboard')
  }

  if (!auth) {
    return <Login onLoginSuccess={onLoginSuccess} />
  }
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#030712' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'rgba(3,7,18,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 1.5rem',
        zIndex: 1000
      }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '3rem', padding: '0 0.5rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🧠</div>
          <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>NeuroSense</span>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊', color: '#10b981' },
            { id: 'mindscan', label: 'MindScan AI', icon: '🧠', color: '#7c3aed' },
            { id: 'mindguard', label: 'MindGuard', icon: '🛡️', color: '#3b82f6' },
            { id: 'workout', label: 'NeuroFit', icon: '💪', color: '#ea580c' },
            { id: 'focus', label: 'Eye Tracker', icon: '👁️', color: '#c026d3' },
            { id: 'feed', label: 'NeuroGram', icon: '📸', color: '#e1306c' },
            { id: 'timetable', label: 'Timetable', icon: '📅', color: '#3b82f6' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.8rem 1.2rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
                textAlign: 'left',
                background: page === item.id ? `${item.color}15` : 'transparent',
                color: page === item.id ? item.color : '#9ca3af',
              }}>
              <span style={{ fontSize: '1.1rem', filter: page === item.id ? 'none' : 'grayscale(1)' }}>{item.icon}</span>
              {item.label}
              {page === item.id && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: item.color }} />}
            </button>
          ))}
        </div>

        {/* User Profile / Logout footer */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '1.5rem 0 0', 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 0.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>👤</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.name}</p>
              <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0 }}>Active Session</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '0.7rem',
              borderRadius: '10px',
              border: '1px solid rgba(252,165,165,0.1)',
              background: 'rgba(239,68,68,0.05)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem' }}>
        {page === 'dashboard' && <Dashboard onStartFatigue={triggerFatigueDiagnostic} />}
        {page === 'mindscan' && <MindScan autoStart={workflowMode} onComplete={(score) => {
            const data = JSON.parse(localStorage.getItem('fatigue_data') || '{"score":null,"mindscan":null,"focus":null}');
            data.mindscan = score;
            localStorage.setItem('fatigue_data', JSON.stringify(data));
            if(workflowMode) setPage('focus');
        }} />}
        {page === 'mindguard' && <MindGuard />}
        {page === 'workout' && <Workout userEmail={auth.email} />}
        {page === 'focus' && <FocusTracker autoStart={workflowMode} onComplete={(score) => {
            const data = JSON.parse(localStorage.getItem('fatigue_data') || '{"score":null,"mindscan":null,"focus":null}');
            data.focus = score;
            if (data.mindscan !== null) {
                data.score = Math.round((data.mindscan + data.focus) / 2);
            } else {
                data.score = data.focus; 
            }
            localStorage.setItem('fatigue_data', JSON.stringify(data));
            if(workflowMode) {
                setPage('dashboard');
                setWorkflowMode(false);
            }
        }} />}
        {page === 'feed' && <InstagramFeed />}
        {page === 'timetable' && <Timetable userEmail={auth.email} />}
      </main>
    </div>
  )
}

export default App
