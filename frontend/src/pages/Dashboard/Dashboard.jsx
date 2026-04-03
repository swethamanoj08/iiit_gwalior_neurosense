import React, { useState, useEffect } from 'react';
import { Search, Bell, Activity, Flame, Dumbbell, ChevronRight, CalendarClock, Clock, BrainCircuit } from 'lucide-react';
import './Dashboard.css';
import Timetable from './Timetable';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    stress: 0, fatigue: 0, focus: 0, posture: "UNKNOWN", task: "Free", score: 0
  });

  const [userProfile, setUserProfile] = useState({
    name: "Loading...",
    username: "Loading...",
    avatar_url: ""
  });

  useEffect(() => {
    const authUser = localStorage.getItem('auth_user') || 'guest';
    
    // Fetch Metrics
    fetch('/api/get_metrics')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMetrics(data);
      })
      .catch(err => console.error(err));

    // Fetch Secure User Info
    fetch(`/api/user_profile?username=${authUser}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setUserProfile(data);
        } else {
          setUserProfile({ name: "Student", username: authUser, avatar_url: "" });
        }
      })
      .catch(err => {
        console.error(err);
        setUserProfile({ name: "Student", username: authUser, avatar_url: "" });
      });
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header flex justify-between items-center mb-6">
        <div className="user-profile flex items-center gap-3">
          {userProfile.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt="User"
              className="avatar"
            />
          ) : (
            <div className="avatar bg-slate-800 animate-pulse"></div>
          )}
          <div className="user-info">
            <p className="text-xs text-secondary mb-1">Welcome back,</p>
            <h2 className="text-lg font-semibold">{userProfile.name || userProfile.username || 'Student'}</h2>
          </div>
        </div>
        <div className="header-actions flex gap-3">
          <button className="icon-btn"><Search size={20} /></button>
          <button className="icon-btn notification-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>
        </div>
      </header>

      {/* Today Section */}
      <section className="mb-6 animate-slide-up delay-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="section-title">Today</h3>
          <button className="view-all text-xs text-secondary flex items-center gap-1">
            Activity <ChevronRight size={14} />
          </button>
        </div>

        <div className="stats-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card card">
            <div className="stat-icon-wrapper steps mb-3">
              <Activity size={20} color="#b388ff" />
            </div>
            <h4 className="text-xl font-bold">{metrics.score}</h4>
            <p className="text-xs text-secondary">wellness score</p>
          </div>

          <div className="stat-card card">
            <div className="stat-icon-wrapper energy mb-3 relative">
              <svg className="progress-ring" width="40" height="40">
                <circle className="progress-ring__circle bg" stroke="var(--border-color)" strokeWidth="3" fill="transparent" r="16" cx="20" cy="20" />
                <circle className="progress-ring__circle fg" stroke="#ffb74d" strokeWidth="3" fill="transparent" strokeDasharray="100.5" strokeDashoffset={100.5 - (100.5 * metrics.focus) / 100} strokeLinecap="round" r="16" cx="20" cy="20" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit size={18} color="#ffb74d" />
              </div>
            </div>
            <h4 className="text-xl font-bold">{metrics.focus}%</h4>
            <p className="text-xs text-secondary">focus</p>
          </div>

          <div className="stat-card card">
            <div className="stat-icon-wrapper activity mb-3 bg-[#ef5350]/10">
              <Flame size={20} color="#ef5350" />
            </div>
            <h4 className="text-xl font-bold">{metrics.stress}%</h4>
            <p className="text-xs text-secondary">stress level</p>
          </div>
        </div>
      </section>



      {/* Customized Timetable (Admin) Section */}
      <Timetable />

    </div>
  );
};

export default Dashboard;
