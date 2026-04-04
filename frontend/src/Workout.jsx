import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Dumbbell, Flame, Timer, Play, Pause, RotateCcw, ChevronRight,
  CheckCircle2, Zap, Heart, Wind, Trophy, TrendingUp, X, SkipForward,
  BookOpen, Code, Share2, Download, Award
} from 'lucide-react';

const API = 'http://localhost:8000';
const SOCIAL_API = 'http://localhost:8002';

// ── Data ────────────────────────────────────────────────────────────────────
const WORKOUT_PLANS = {
  strength: { label: 'Strength', emoji: '🏋️', color: '#f97316', gradient: 'linear-gradient(135deg,#ea580c,#f97316)', description: 'Build muscle & functional power', exercises: [{ name: 'Push-Ups', duration: 40, rest: 20, sets: 3, muscle: 'Chest' }, { name: 'Squats', duration: 45, rest: 15, sets: 3, muscle: 'Legs' }] },
  cardio: { label: 'Cardio', emoji: '🏃', color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)', description: 'Elevate heart rate & burn fat', exercises: [{ name: 'Jumping Jacks', duration: 45, rest: 15, sets: 3, muscle: 'Full Body' }] },
};

const STUDY_PLANS = {
  coding: { label: 'Coding Sprint', emoji: '💻', color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', description: 'Deep focus coding & logic', exercises: [{ name: 'Algorithm Grind', duration: 1500, rest: 300, sets: 2, muscle: 'Brain' }] },
  theory: { label: 'Theory Session', emoji: '📚', color: '#a78bfa', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)', description: 'Lecture review & memory', exercises: [{ name: 'Active Recall', duration: 1200, rest: 300, sets: 3, muscle: 'Memory' }] },
};

// ── Components ─────────────────────────────────────────────────────────────

const Certificate = ({ type, streak, name, onClose, onShare }) => {
    return (
        <div style={cs.overlay}>
            <div style={cs.modal}>
                <button onClick={onClose} style={cs.close}><X size={20}/></button>
                <div style={cs.content}>
                    <div style={cs.badge}><Trophy size={48} color="#fbbf24"/></div>
                    <h2 style={cs.certTitle}>Certificate of Appreciation</h2>
                    <p style={cs.certSubtitle}>Awarded to</p>
                    <h1 style={cs.userName}>{name || "NeuroSense User"}</h1>
                    <div style={cs.divider}></div>
                    <p style={cs.certText}>
                        For maintaining a remarkable **{streak} Day {type.charAt(0).toUpperCase() + type.slice(1)} Streak**. 
                        Your dedication to personal growth and neural excellence is an inspiration to the community.
                    </p>
                    <div style={cs.footer}>
                        <div style={cs.sig}>
                            <p style={cs.sigLine}>NeuroSense AI</p>
                            <p style={cs.sigLabel}>Lead Neural Architect</p>
                        </div>
                        <div style={cs.date}>{new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                <div style={cs.actions}>
                    <button style={cs.shareBtn} onClick={onShare}>
                        <Share2 size={18}/> Post to NeuroGram
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Workout({ userEmail }) {
  const [screen, setScreen] = useState('select'); // select | session | done
  const [sessionType, setSessionType] = useState('workout'); // workout | study
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [streaks, setStreaks] = useState({ workout_streak: 0, study_streak: 0 });
  const [showCert, setShowCert] = useState(false);
  const [certType, setCertType] = useState('workout');

  // Fetch Streaks
  useEffect(() => {
    const fetchStreaks = async () => {
      try {
        const res = await axios.get(`${API}/api/streaks?email=${userEmail}`);
        setStreaks(res.data);
      } catch (err) {}
    };
    if (userEmail) fetchStreaks();
  }, [userEmail]);

  const markDone = async (type) => {
    try {
      const res = await axios.post(`${API}/api/mark_activity`, { email: userEmail, activity_type: type });
      const newStreak = res.data.new_streak;
      setStreaks(prev => ({ ...prev, [`${type}_streak`]: newStreak }));
      
      if (newStreak >= 7) {
        setCertType(type);
        setShowCert(true);
      }
    } catch (err) {}
  };

  const startSession = (plan, type) => {
    setSelectedPlan(plan);
    setSessionType(type);
    setTimeLeft(plan.exercises[0].duration);
    setScreen('session');
    setRunning(false);
  };

  const handleShare = async () => {
      try {
          const text = `🏆 Just hit a ${streaks[`${certType}_streak`]} day ${certType} streak on NeuroSense! Dedication pays off. #NeuroFit #Consistency`;
          await axios.post(`${SOCIAL_API}/posts`, {
              username: userEmail.split('@')[0],
              content: text,
              image_url: certType === 'workout' 
                ? "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800" 
                : "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800",
              timestamp: new Date().toISOString()
          });
          alert("Posted to NeuroGram! 🎉");
          setShowCert(false);
      } catch (err) {
          alert("Failed to share.");
      }
  };

  if (screen === 'select') {
    return (
      <div style={s.root}>
        <div style={s.header}>
            <h1 style={s.title}>NeuroFit Dashboard</h1>
            <div style={s.streakRow}>
                <div style={{...s.streakCard, borderColor: '#f9731633'}}>
                    <Dumbbell size={20} color="#f97316"/>
                    <div>
                        <p style={s.streakValue}>{streaks.workout_streak} Days</p>
                        <p style={s.streakLabel}>Workout Streak</p>
                    </div>
                    {streaks.workout_streak >= 7 && <Award color="#fbbf24" onClick={() => {setCertType('workout'); setShowCert(true)}} style={{cursor:'pointer'}}/>}
                </div>
                <div style={{...s.streakCard, borderColor: '#3b82f633'}}>
                    <Code size={20} color="#3b82f6"/>
                    <div>
                        <p style={s.streakValue}>{streaks.study_streak} Days</p>
                        <p style={s.streakLabel}>Coding Streak</p>
                    </div>
                    {streaks.study_streak >= 7 && <Award color="#fbbf24" onClick={() => {setCertType('study'); setShowCert(true)}} style={{cursor:'pointer'}}/>}
                </div>
            </div>
        </div>

        <div style={s.grid}>
            <div style={s.col}>
                <h3 style={s.colTitle}>Physical Excellence</h3>
                {Object.entries(WORKOUT_PLANS).map(([k, p]) => (
                    <div key={k} style={s.planCard} onClick={() => startSession(p, 'workout')}>
                        <div style={s.planEmoji}>{p.emoji}</div>
                        <div style={s.planInfo}>
                            <h4 style={s.planLabel}>{p.label}</h4>
                            <p style={s.planDesc}>{p.description}</p>
                        </div>
                        <ChevronRight size={20} color="#475569"/>
                    </div>
                ))}
            </div>
            <div style={s.col}>
                <h3 style={s.colTitle}>Cognitive Mastery</h3>
                {Object.entries(STUDY_PLANS).map(([k, p]) => (
                    <div key={k} style={s.planCard} onClick={() => startSession(p, 'study')}>
                        <div style={s.planEmoji}>{p.emoji}</div>
                        <div style={s.planInfo}>
                            <h4 style={s.planLabel}>{p.label}</h4>
                            <p style={s.planDesc}>{p.description}</p>
                        </div>
                        <ChevronRight size={20} color="#475569"/>
                    </div>
                ))}
            </div>
        </div>

        {showCert && (
            <Certificate 
                type={certType} 
                streak={streaks[`${certType}_streak`]} 
                name={userEmail.split('@')[0]}
                onClose={() => setShowCert(false)}
                onShare={handleShare}
            />
        )}
      </div>
    );
  }

  return (
    <div style={s.root}>
        <div style={s.sessionContainer}>
            <button onClick={() => setScreen('select')} style={s.backBtn}><X size={20}/></button>
            <div style={s.sessionCard}>
                <p style={{color: selectedPlan.color, fontWeight: 700, textTransform:'uppercase', fontSize:'12px', letterSpacing:'0.1em'}}>{sessionType} session</p>
                <h2 style={s.sessionTitle}>{selectedPlan.label} underway</h2>
                
                <div style={s.timerDisplay}>
                    <p style={s.timerTime}>{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</p>
                </div>

                <div style={s.controls}>
                    <button style={s.playBtn} onClick={() => setRunning(!running)}>
                        {running ? <Pause size={24}/> : <Play size={24}/>}
                    </button>
                    {!running && timeLeft < selectedPlan.exercises[0].duration && (
                        <button style={s.finishBtn} onClick={() => { markDone(sessionType); setScreen('select'); }}>
                            Mark Finished early
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

const s = {
    root: { minHeight: '100vh', background: '#080810', padding: '40px', color: '#fff', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '48px' },
    title: { fontSize: '32px', fontWeight: 800, marginBottom: '24px' },
    streakRow: { display: 'flex', gap: '20px' },
    streakCard: { flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' },
    streakValue: { fontSize: '20px', fontWeight: 800, color: '#fff' },
    streakLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' },
    colTitle: { fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' },
    planCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s' },
    planEmoji: { fontSize: '32px' },
    planInfo: { flex: 1 },
    planLabel: { fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' },
    planDesc: { fontSize: '13px', color: '#64748b' },
    sessionContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
    sessionCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '32px', padding: '60px', textAlign: 'center', maxWidth: '500px', width: '100%' },
    sessionTitle: { fontSize: '28px', fontWeight: 800, margin: '12px 0 40px' },
    timerTime: { fontSize: '72px', fontWeight: 900, fontFamily: 'monospace' },
    controls: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
    playBtn: { width: '80px', height: '80px', borderRadius: '50%', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    finishBtn: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', position: 'absolute', top: '40px', left: '40px' }
};

const cs = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    modal: { background: '#111', border: '2px solid #222', borderRadius: '40px', padding: '60px', width: '100%', maxWidth: '800px', position: 'relative', boxShadow: '0 0 100px rgba(251,191,36,0.1)' },
    close: { position: 'absolute', top: '30px', right: '30px', background: 'none', border: 'none', cursor: 'pointer', color: '#444' },
    content: { textAlign: 'center', border: '8px double #222', padding: '40px', borderRadius: '24px' },
    badge: { marginBottom: '24px' },
    certTitle: { fontFamily: "'Fraunces', serif", fontSize: '36px', color: '#fbbf24', marginBottom: '8px' },
    certSubtitle: { fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' },
    userName: { fontSize: '48px', fontWeight: 900, margin: '16px 0', fontFamily: "'Fraunces', serif" },
    divider: { width: '80px', height: '2px', background: '#fbbf24', margin: '24px auto' },
    certText: { fontSize: '18px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' },
    sigLine: { fontSize: '20px', fontWeight: 800, fontFamily: "'Fraunces', serif", color: '#fff', borderBottom: '1px solid #444', paddingBottom: '4px' },
    sigLabel: { fontSize: '11px', color: '#64748b', marginTop: '4px' },
    date: { fontSize: '13px', color: '#444' },
    actions: { marginTop: '40px', display: 'flex', justifyContent: 'center' },
    shareBtn: { background: 'linear-gradient(135deg, #e1306c, #f56040)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }
};
