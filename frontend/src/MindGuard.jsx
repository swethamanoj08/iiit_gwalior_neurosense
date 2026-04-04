import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, AlertTriangle, Activity, Coffee, Brain, Heart, Phone, Clipboard, X, ChevronRight } from 'lucide-react';

const MindGuard = () => {
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Hello! I'm MindGuard, your mental wellness companion. How are you feeling today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState(null); // 'fatigue' | 'phq' | 'crisis'
    const scrollRef = useRef(null);

    // Fatigue Form State
    const [fatigueData, setFatigueData] = useState({ sleep: 6, work: 8, stress: 5, activity: 1 });
    const [fatigueResult, setFatigueResult] = useState(null);

    // PHQ Quiz State
    const [phqIndex, setPhqIndex] = useState(0);
    const [phqAnswers, setPhqAnswers] = useState([]);
    const [phqResult, setPhqResult] = useState(null);

    const phqQuestions = [
        "Little interest or pleasure in doing things?",
        "Feeling down, depressed, or hopeless?",
        "Trouble falling or staying asleep, or sleeping too much?",
        "Feeling tired or having little energy?",
        "Poor appetite or overeating?",
        "Feeling bad about yourself — or that you are a failure?",
        "Trouble concentrating on things, such as reading or watching TV?",
        "Moving or speaking so slowly that others could have noticed?",
        "Thoughts that you would be better off dead, or of hurting yourself?"
    ];

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (msgText = input) => {
        if (!msgText.trim()) return;
        
        const userMsg = { role: 'user', text: msgText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8003/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msgText, user_name: 'admin' })
            });
            const data = await res.json();
            
            setMessages(prev => [...prev, { 
                role: 'bot', 
                text: data.response, 
                replies: data.quick_replies,
                intent: data.intent 
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble connecting to my brain. Please check if the backend is running." }]);
        } finally {
            setLoading(false);
        }
    };

    const runFatigueCalc = async () => {
        try {
            const res = await fetch('http://localhost:8003/fatigue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sleep_hours: fatigueData.sleep,
                    work_hours: fatigueData.work,
                    stress_level: fatigueData.stress,
                    activity_level: fatigueData.activity,
                    user_name: 'admin'
                })
            });
            const data = await res.json();
            setFatigueResult(data);
            setMessages(prev => [...prev, { role: 'bot', text: data.message }]);
        } catch (err) { console.error(err); }
    };

    const handlePhqAnswer = (val) => {
        const nextAnswers = [...phqAnswers, val];
        setPhqAnswers(nextAnswers);
        if (phqIndex < phqQuestions.length - 1) {
            setPhqIndex(phqIndex + 1);
        } else {
            finalizePhq(nextAnswers);
        }
    };

    const finalizePhq = async (answers) => {
        try {
            const res = await fetch('http://localhost:8003/phq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            const data = await res.json();
            setPhqResult(data);
            setMessages(prev => [...prev, { role: 'bot', text: `PHQ-9 Result: ${data.level}. ${data.advice}` }]);
        } catch (err) { console.error(err); }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'white', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px', height: 'calc(100vh - 100px)' }}>
            
            {/* Chat Section */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '20px', background: 'rgba(124,58,237,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain color="white" size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>MindGuard AI</h2>
                        <p style={{ fontSize: '12px', color: '#a78bfa' }}>Online • Mental Wellness Companion</p>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{ 
                                padding: '12px 16px', 
                                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                background: m.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '15px',
                                lineHeight: '1.5'
                            }}>
                                {m.text}
                            </div>
                            
                            {m.replies && m.replies.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                    {m.replies.map(r => (
                                        <button 
                                            key={r} 
                                            onClick={() => handleSend(r)}
                                            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && <div style={{ color: '#9ca3af', fontSize: '13px' }}>MindGuard is thinking...</div>}
                    <div ref={scrollRef} />
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Describe how you feel..."
                        style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', outline: 'none' }}
                    />
                    <button 
                        onClick={() => handleSend()}
                        style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#7c3aed', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>

            {/* Sidebar Tools */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Fatigue Calculator */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <Activity color="#f59e0b" size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Fatigue Expert</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Sleep Hours: {fatigueData.sleep}h</label>
                            <input type="range" min="0" max="12" value={fatigueData.sleep} onChange={e => setFatigueData({...fatigueData, sleep: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Work Hours: {fatigueData.work}h</label>
                            <input type="range" min="0" max="16" value={fatigueData.work} onChange={e => setFatigueData({...fatigueData, work: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <button 
                            onClick={runFatigueCalc}
                            style={{ marginTop: '10px', width: '100%', padding: '10px', borderRadius: '12px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Analyze Fatigue
                        </button>
                    </div>
                </div>

                {/* PHQ-9 Assessment */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <Clipboard color="#10b981" size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>PHQ-9 Quiz</h3>
                    </div>
                    {phqResult ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{phqResult.total}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{phqResult.level}</div>
                            <button onClick={() => {setPhqResult(null); setPhqIndex(0); setPhqAnswers([])}} style={{ marginTop: '10px', fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Retake Quiz</button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '12px', color: '#e5e7eb', marginBottom: '10px' }}>Q{phqIndex+1}: {phqQuestions[phqIndex]}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[0,1,2,3].map(v => (
                                    <button key={v} onClick={() => handlePhqAnswer(v)} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', cursor: 'pointer' }}>
                                        {['None','Some','Half','Daily'][v]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Emergency Resources */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid #ef4444', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Phone color="#ef4444" size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>Crisis Support</h3>
                    </div>
                    <p style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '10px' }}>If you are in danger, please contact these helplines immediately:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>iCall: 9152987821</div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>AASRA: 9820466627</div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MindGuard;
