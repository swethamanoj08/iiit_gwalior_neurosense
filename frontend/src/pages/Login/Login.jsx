import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const showToastMsg = (msg, type) => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3200);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setUserId('');
  };

  const getPlaceholder = () => {
    switch(role) {
      case 'student': return 'e.g. 2022BCS0042';
      case 'faculty': return 'e.g. FAC1042';
      case 'counsellor': return 'e.g. CNS0021';
      default: return '';
    }
  };

  const handleLogin = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) {
      showToastMsg('Please enter your ID', 'err');
      return;
    }
    if (!password) {
      showToastMsg('Please enter your password', 'err');
      return;
    }
    if (password.length < 6) {
      showToastMsg('Password must be at least 6 characters', 'err');
      return;
    }

    setLoading(true);

    try {
      // Connect to the actual backend API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedId,
          password: password,
          name: '' // Not required for login
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        showToastMsg(data.error, 'err');
        setLoading(false);
      } else {
        localStorage.setItem('auth_user', data.username || trimmedId);
        window.dispatchEvent(new Event('auth_changed'));
        
        showToastMsg(`Welcome back! Signed in as ${role} ✓`, 'ok');
        
        // Wait a small moment to let the user see the success toast before redirecting
        setTimeout(() => {
          navigate('/');
        }, 1200);
      }
    } catch (err) {
      showToastMsg('Connection failed. Please ensure the backend is running.', 'err');
      console.error(err);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-page-wrapper">
      {/* Left illustrative panel */}
      <div className="left">
        <div className="bg-cards">
          <div className="bg-card">
            <div className="bg-card-icon icon-teal">💓</div>
            <div className="bg-card-val c-teal">84</div>
            <div className="bg-card-label">wellness score</div>
          </div>
          <div className="bg-card">
            <div className="bg-card-icon icon-purple">🧠</div>
            <div className="bg-card-val c-purple">72%</div>
            <div className="bg-card-label">focus level</div>
          </div>
          <div className="bg-card">
            <div className="bg-card-icon icon-orange">🔥</div>
            <div className="bg-card-val c-orange">12%</div>
            <div className="bg-card-label">stress level</div>
          </div>
          <div className="bg-card">
            <div className="bg-card-icon icon-teal">😴</div>
            <div className="bg-card-val c-teal">7.5h</div>
            <div className="bg-card-label">sleep tonight</div>
          </div>
        </div>

        <div className="illustration">
          <div className="pulse-ring">
            <div className="ring-inner">
              <svg className="ring-svg" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 28 L14 28 L18 16 L24 38 L30 20 L34 28 L50 28" stroke="#00c9b1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="ill-title">Wellness <span>360°</span></div>
          <div className="ill-sub">Track your mental clarity, daily habits, and student wellness — all in one place.</div>

          <div className="mini-tasks">
            <div className="mini-tasks-header">
              <span>📋</span> Today's Timetable
            </div>
            <div className="mini-task">
              <div className="mini-check done"></div>
              <span className="done-text">Coding</span>
            </div>
            <div className="mini-task">
              <div className="mini-check done"></div>
              <span className="done-text">Exercise</span>
            </div>
            <div className="mini-task">
              <div className="mini-check"></div>
              <span>Sleep</span>
            </div>
            <div className="mini-task">
              <div className="mini-check"></div>
              <span>Study</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="right">
        <div className="logo">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c9b1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="logo-name">Wellness <span>360</span></div>
        </div>

        <div className="form-head">
          <div className="form-greeting">Good to see you 👋</div>
          <div className="form-title">Sign in to your account</div>
        </div>

        <div className="quick-roles">
          <button 
            className={`role-chip ${role === 'student' ? 'active' : ''}`} 
            onClick={() => handleRoleChange('student')}
          >
            🎓 Student
          </button>
          <button 
            className={`role-chip ${role === 'faculty' ? 'active' : ''}`} 
            onClick={() => handleRoleChange('faculty')}
          >
            👨‍🏫 Faculty
          </button>
          <button 
            className={`role-chip ${role === 'counsellor' ? 'active' : ''}`} 
            onClick={() => handleRoleChange('counsellor')}
          >
            🧘 Counsellor
          </button>
        </div>

        <div className="field">
          <label>ROLL / EMPLOYEE ID</label>
          <div className="input-wrap">
            <span className="input-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input 
              type="text" 
              placeholder={getPlaceholder()} 
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="field">
          <label>PASSWORD</label>
          <div className="input-wrap">
            <span className="input-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Enter your password" 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="pw-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
              {showPassword ? (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="options">
          <label className="remember">
            <input type="checkbox" />
            <span>Remember me</span>
          </label>
          <a className="forgot" href="#">Forgot password?</a>
        </div>

        <button className={`btn-submit ${loading ? 'loading' : ''}`} onClick={handleLogin}>
          <span className="btn-text">Sign In</span>
          <div className="spinner"></div>
        </button>

        <div className="divider">or</div>

        <div className="form-footer">
          New student? <a href="#">Request access from your admin</a>
        </div>
      </div>

      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
        {toast.msg}
      </div>
    </div>
  );
};

export default Login;
