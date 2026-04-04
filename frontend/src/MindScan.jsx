import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8001';

// ── Helpers ──────────────────────────────────────────────────────────────────
function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  // Prefer a deep neutral voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0];
  if (preferred) utt.voice = preferred;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

const COLORS = {
  stress: { Low: '#10b981', Moderate: '#f59e0b', High: '#f97316', Severe: '#ef4444' },
  fatigue: { Low: '#10b981', Moderate: '#f59e0b', High: '#f97316', Severe: '#ef4444' },
};

function ScoreBar({ label, value, color }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }} className="font-bold">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function WaveAnimation({ active }) {
  return (
    <div className="flex items-center justify-center gap-1 h-10">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: '4px',
            background: active ? '#a78bfa' : '#374151',
            height: active ? `${16 + Math.sin(i) * 12}px` : '6px',
            animation: active ? `wave ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function MindScan({ onComplete, autoStart }) {
  // States
  const [phase, setPhase] = useState('intro');    // intro | asking | recording | analyzing | results
  const [session, setSession] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [totalQ] = useState(10);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  // ── Speech Recognition setup ─────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript + ' ';
      }
      setTranscript(text.trim());
    };
    rec.onerror = () => {};
    recognitionRef.current = rec;
    return () => rec.abort();
  }, []);

  // ── TTS voices preload ───────────────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setError(null);
    setPhase('asking');
    setStatusMsg('Starting session...');
    try {
      const res = await axios.post(`${API}/session/start`, {});
      const sid = res.data.session_id;
      const firstQ = res.data.first_question;
      setSession({ id: sid });
      setCurrentQ(firstQ);
      setQIndex(0);
      setAnswers([]);
      setTranscript('');
      // Ask first question aloud
      setIsSpeaking(true);
      setStatusMsg('AI is asking...');
      speak(`Question ${firstQ.id}: ${firstQ.text}`, () => {
        setIsSpeaking(false);
        setStatusMsg('Your turn — press the mic to answer');
        setPhase('recording-ready');
      });
    } catch (e) {
      setError('Could not connect to MindScan AI. Make sure the backend is running on port 8001.');
      setPhase('intro');
    }
  }, []);

  useEffect(() => {
    if (autoStart && phase === 'intro') {
      startSession();
    }
  }, [autoStart, phase, startSession]);

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setTranscript('');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;
      recognitionRef.current?.start();
      setIsRecording(true);
      setPhase('recording');
      setStatusMsg('Listening... speak your answer');
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.');
    }
  }, []);

  // ── Stop recording & submit ──────────────────────────────────────────────
  const stopAndSubmit = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    setIsRecording(false);
    setPhase('analyzing');
    setStatusMsg('Analyzing voice patterns...');
    recognitionRef.current?.stop();

    const mr = mediaRecorderRef.current;
    await new Promise((resolve) => {
      mr.onstop = resolve;
      mr.stop();
    });
    streamRef.current?.getTracks().forEach(t => t.stop());

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('session_id', session.id);
    formData.append('question_index', String(qIndex));
    formData.append('transcript', transcript || '(no transcript)');
    formData.append('audio', blob, 'answer.webm');

    try {
      const res = await axios.post(`${API}/session/answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;

      if (data.status === 'complete') {
        // All done → show report
        setReport(data.report);
        setPhase('results');
        setStatusMsg('');
        speak('Assessment complete. Here are your results.');
        if (onComplete) onComplete(data.report.fatigue_level);
      } else {
        // Next question
        const nextQ = data.next_question;
        setCurrentQ(nextQ);
        setQIndex(qIndex + 1);
        setTranscript('');
        setIsSpeaking(true);
        setPhase('asking');
        setStatusMsg('AI is asking...');
        speak(`Question ${nextQ.id}: ${nextQ.text}`, () => {
          setIsSpeaking(false);
          setStatusMsg('Your turn — press the mic to answer');
          setPhase('recording-ready');
        });
      }
    } catch (e) {
      setError('Failed to submit answer. Please try again.');
      setPhase('recording-ready');
      setStatusMsg('Tap the mic to try again');
    }
  }, [session, qIndex, transcript]);

  // ── Domain color ──────────────────────────────────────────────────────────
  const domainColor = (val) => val >= 70 ? '#ef4444' : val >= 45 ? '#f59e0b' : '#10b981';

  // ── Render: Intro ────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <div style={styles.logo}>🧠</div>
          <h1 style={styles.title}>MindScan Voice AI</h1>
          <p style={styles.sub}>Clinical stress & fatigue assessment through voice analysis</p>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}><span style={styles.infoIcon}>🎙️</span><span>10 spoken questions</span></div>
            <div style={styles.infoItem}><span style={styles.infoIcon}>🔬</span><span>Acoustic analysis</span></div>
            <div style={styles.infoItem}><span style={styles.infoIcon}>🤖</span><span>AI-powered insights</span></div>
            <div style={styles.infoItem}><span style={styles.infoIcon}>⏱️</span><span>~5 minutes</span></div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btnPrimary} onClick={startSession}>
            Begin Assessment →
          </button>
          <p style={styles.hint}>Ensure microphone access is allowed</p>
        </div>
      </div>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────
  if (phase === 'results' && report) {
    const stressColor = COLORS.stress[report.stress_category] || '#a78bfa';
    const fatigueColor = COLORS.fatigue[report.fatigue_category] || '#a78bfa';
    return (
      <div style={styles.root}>
        <div style={{ ...styles.card, maxWidth: 760, padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={styles.logo}>📋</div>
            <h2 style={styles.title}>Assessment Report</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Based on your voice patterns & responses</p>
          </div>

          {/* Big scores */}
          <div style={styles.scoreRow}>
            <div style={{ ...styles.scoreBox, borderColor: stressColor + '55', backgroundColor: stressColor + '11' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stress Level</p>
              <p style={{ fontSize: '2.8rem', fontWeight: 900, color: stressColor }}>{report.stress_level}</p>
              <span style={{ ...styles.badge, backgroundColor: stressColor + '22', color: stressColor, border: `1px solid ${stressColor}44` }}>
                {report.stress_category}
              </span>
            </div>
            <div style={{ ...styles.scoreBox, borderColor: fatigueColor + '55', backgroundColor: fatigueColor + '11' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fatigue Level</p>
              <p style={{ fontSize: '2.8rem', fontWeight: 900, color: fatigueColor }}>{report.fatigue_level}</p>
              <span style={{ ...styles.badge, backgroundColor: fatigueColor + '22', color: fatigueColor, border: `1px solid ${fatigueColor}44` }}>
                {report.fatigue_category}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div style={styles.summaryBox}>
            <p style={{ color: '#c4b5fd', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Clinical Summary</p>
            <p style={{ color: '#e5e7eb', fontSize: '0.9rem', lineHeight: 1.7 }}>{report.summary}</p>
          </div>

          {/* Domain Scores */}
          <div style={styles.sectionTitle}>Domain Analysis</div>
          <div style={styles.twoCol}>
            {Object.entries(report.domain_scores).map(([domain, val]) => (
              <ScoreBar key={domain} label={domain} value={val} color={domainColor(val)} />
            ))}
          </div>

          {/* Speech Indicators */}
          <div style={styles.sectionTitle}>Voice Biomarkers</div>
          <div style={styles.twoCol}>
            {Object.entries(report.speech_indicators).map(([key, val]) => (
              <ScoreBar
                key={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                value={val}
                color="#a78bfa"
              />
            ))}
          </div>

          {/* Acoustic findings */}
          <div style={styles.sectionTitle}>Key Acoustic Findings</div>
          <ul style={styles.list}>
            {report.key_acoustic_findings?.map((f, i) => <li key={i} style={styles.listItem}>🔍 {f}</li>)}
          </ul>

          {/* Recommendations */}
          <div style={styles.sectionTitle}>Recommendations</div>
          <ul style={styles.list}>
            {report.recommendations?.map((r, i) => <li key={i} style={styles.listItem}>✅ {r}</li>)}
          </ul>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button style={{ ...styles.btnPrimary, flex: 1 }} onClick={() => { setPhase('intro'); setReport(null); setSession(null); }}>
              Start New ↺
            </button>
            <button style={{ ...styles.btnPrimary, flex: 1, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 0 30px rgba(6,182,212,0.3)' }} onClick={() => { if(onComplete) onComplete(report.fatigue_level); }}>
              Diagnostic Sync →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Session (asking / recording) ─────────────────────────────────
  const progress = ((qIndex) / totalQ) * 100;

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem' }}>🧠 MindScan</span>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Question {qIndex + 1} of {totalQ}</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', background: '#1f2937', borderRadius: '999px', marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
        </div>

        {/* Domain badge */}
        {currentQ && (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <span style={styles.domainBadge}>{currentQ.domain}</span>
          </div>
        )}

        {/* Question text */}
        {currentQ && (
          <div style={styles.questionBox}>
            <p style={styles.questionText}>{currentQ.text}</p>
          </div>
        )}

        {/* AI Wave / Mic visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
          {isSpeaking ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#a78bfa', fontSize: '0.85rem', marginBottom: '0.75rem' }}>🔊 AI is speaking...</p>
              <WaveAnimation active={true} />
            </div>
          ) : isRecording ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem' }}>🔴 Recording...</p>
              <WaveAnimation active={true} />
            </div>
          ) : (
            <WaveAnimation active={false} />
          )}
        </div>

        {/* Live transcript */}
        {(isRecording || transcript) && (
          <div style={styles.transcriptBox}>
            <p style={{ color: '#6b7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Live Transcript</p>
            <p style={{ color: '#d1d5db', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {transcript || <span style={{ color: '#374151', fontStyle: 'italic' }}>Waiting for speech...</span>}
            </p>
          </div>
        )}

        {/* Status message */}
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>
          {error ? <span style={{ color: '#f87171' }}>{error}</span> : statusMsg}
        </p>

        {/* Action button */}
        {phase === 'recording-ready' && !isSpeaking && (
          <button style={styles.micBtn} onClick={startRecording}>
            🎙️ Tap to Answer
          </button>
        )}
        {phase === 'recording' && (
          <button style={{ ...styles.micBtn, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 30px rgba(239,68,68,0.4)' }} onClick={stopAndSubmit}>
            ⏹ Done — Submit Answer
          </button>
        )}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={styles.spinner} />
            <p style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: '0.75rem' }}>Analyzing voice patterns...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1.5); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#030712',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '24px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  },
  logo: {
    fontSize: '3rem',
    textAlign: 'center',
    marginBottom: '0.75rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.6rem',
    fontWeight: 800,
    textAlign: 'center',
    margin: '0 0 0.5rem',
    background: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sub: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: '0.9rem',
    marginBottom: '2rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '2rem',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '0.6rem 0.9rem',
    color: '#d1d5db',
    fontSize: '0.82rem',
  },
  infoIcon: { fontSize: '1.1rem' },
  btnPrimary: {
    width: '100%',
    padding: '0.9rem',
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(139,92,246,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  hint: {
    color: '#6b7280',
    fontSize: '0.75rem',
    textAlign: 'center',
    marginTop: '0.75rem',
  },
  error: {
    color: '#f87171',
    fontSize: '0.85rem',
    textAlign: 'center',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    marginBottom: '1rem',
  },
  domainBadge: {
    background: 'rgba(167,139,250,0.12)',
    border: '1px solid rgba(167,139,250,0.25)',
    color: '#a78bfa',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '0.3rem 0.8rem',
    borderRadius: '999px',
  },
  questionBox: {
    background: 'rgba(167,139,250,0.06)',
    border: '1px solid rgba(167,139,250,0.15)',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    marginBottom: '0.5rem',
  },
  questionText: {
    color: '#e5e7eb',
    fontSize: '1rem',
    lineHeight: 1.7,
    margin: 0,
    textAlign: 'center',
  },
  transcriptBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    minHeight: '60px',
  },
  micBtn: {
    width: '100%',
    padding: '0.9rem',
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(139,92,246,0.35)',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(167,139,250,0.2)',
    borderTop: '3px solid #a78bfa',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.9s linear infinite',
  },
  scoreRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  scoreBox: {
    border: '1px solid',
    borderRadius: '16px',
    padding: '1.25rem',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.2rem 0.7rem',
    borderRadius: '999px',
    marginTop: '0.4rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  summaryBox: {
    background: 'rgba(167,139,250,0.06)',
    border: '1px solid rgba(167,139,250,0.15)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 700,
    marginBottom: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: '1.5rem',
    marginBottom: '0.5rem',
  },
  list: { listStyle: 'none', padding: 0, margin: '0 0 0.5rem' },
  listItem: {
    color: '#d1d5db',
    fontSize: '0.85rem',
    padding: '0.4rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    lineHeight: 1.5,
  },
};
