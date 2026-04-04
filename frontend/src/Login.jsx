import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Mail, Lock, LogIn, Shield, ArrowRight, Check, X, ShieldAlert, Heart, Activity } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('user'); // 'user' | 'admin'
    const [showPassword, setShowPassword] = useState(false);
    
    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [adminCode, setAdminCode] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        
        if (!email || !password) {
            triggerShake();
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const res = await axios.post('http://localhost:8000/api/login', { 
                    email, 
                    password, 
                    role 
                });
                onLoginSuccess(res.data);
            } else {
                const res = await axios.post('http://localhost:8000/api/signup', { 
                    email, 
                    password, 
                    name,
                    role: 'user' // Only registration for standard users
                });
                alert("Account created! Please sign in.");
                setIsLogin(true);
            }
        } catch (err) {
            triggerShake();
            setError(err.response?.data?.detail || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    return (
        <div style={styles.container}>
            {/* Background blobs */}
            <div style={styles.bg}>
                <div style={{...styles.blob, ...styles.blob1}}></div>
                <div style={{...styles.blob, ...styles.blob2}}></div>
                <div style={{...styles.blob, ...styles.blob3}}></div>
                <div style={{...styles.blob, ...styles.blob4}}></div>
                <div style={styles.dotGrid}></div>
            </div>

            <div style={styles.page}>
                {/* Left Panel */}
                <div style={styles.left}>
                    <div style={styles.brand}>
                        <div style={styles.brandIcon}>
                            <Heart fill="white" size={28} />
                        </div>
                        <div style={styles.brandText}>
                            <h2 style={styles.brandName}>WellBeing360</h2>
                            <p style={styles.brandSub}>BY NEUROSENSE</p>
                        </div>
                    </div>

                    <div style={styles.hero}>
                        <div style={styles.heroTag}>
                            <span style={styles.heroTagDot}></span>
                            AI-Powered Wellbeing Platform
                        </div>
                        <h1 style={styles.heroH1}>
                            Your mind<br />
                            <em style={{fontStyle: 'italic', color: '#6b8c66'}}>deserves</em> to be<br />
                            <span style={styles.highlight}>understood</span>.
                        </h1>
                        <p style={styles.heroP}>WellBeing360 listens to how you feel — not just what you say. Voice-powered stress and fatigue insights, built with care by Team NeuroSense.</p>
                    </div>

                    <div style={styles.stats}>
                        <div style={styles.stat}>
                            <div style={styles.statNum}>10</div>
                            <div style={styles.statLabel}>Assessment domains</div>
                        </div>
                        <div style={styles.stat}>
                            <div style={styles.statNum}>92%</div>
                            <div style={styles.statLabel}>Detection accuracy</div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div style={styles.right}>
                    <div style={{...styles.card, transform: shake ? 'translateX(0)' : 'none', animation: shake ? 'shake 0.4s ease' : 'none'}}>
                        
                        <div style={styles.cardHeader}>
                            <p style={styles.cardGreeting}>{isLogin ? "Welcome back 👋" : "Create Account ✨"}</p>
                            <h2 style={styles.cardTitle}>{isLogin ? (role === 'admin' ? "Administrator Login" : "Sign in to continue") : "Join WellBeing360"}</h2>
                        </div>

                        {isLogin && (
                            <div style={styles.roleToggle}>
                                <button 
                                    style={{...styles.roleBtn, ...(role === 'user' ? styles.activeUser : {})}} 
                                    onClick={() => setRole('user')}
                                >
                                    <span style={{...styles.roleIcon, background: role === 'user' ? '#ccdde8' : 'transparent'}}>🙂</span>
                                    Student
                                </button>
                                <button 
                                    style={{...styles.roleBtn, ...(role === 'admin' ? styles.activeAdmin : {})}} 
                                    onClick={() => setRole('admin')}
                                >
                                    <span style={{...styles.roleIcon, background: role === 'admin' ? '#f0d0cc' : 'transparent'}}>🔐</span>
                                    Admin
                                </button>
                            </div>
                        )}

                        <div style={styles.roleLabel}>
                            {isLogin ? `Signing in as ${role === 'user' ? 'Student' : 'Administrator'}` : 'New Member Registration'}
                        </div>

                        {error && <div style={styles.errorBanner}><ShieldAlert size={16}/> {error}</div>}

                        <form onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div style={styles.field}>
                                    <label style={styles.fieldLabel}>Full Name</label>
                                    <div style={styles.fieldWrap}>
                                        <Lock style={styles.fieldSideIcon} size={16}/>
                                        <input 
                                            style={styles.input} 
                                            placeholder="John Doe" 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={styles.field}>
                                <label style={styles.fieldLabel}>{role === 'admin' ? "Admin Email" : "Email Address"}</label>
                                <div style={styles.fieldWrap}>
                                    <Mail style={styles.fieldSideIcon} size={16}/>
                                    <input 
                                        type="email" 
                                        style={styles.input} 
                                        placeholder="you@example.com" 
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.fieldLabel}>Password</label>
                                <div style={styles.fieldWrap}>
                                    <Lock style={styles.fieldSideIcon} size={16}/>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        style={styles.input} 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button 
                                        type="button" 
                                        style={styles.pwdToggle} 
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                            </div>

                            {role === 'admin' && isLogin && (
                                <div style={styles.field}>
                                    <label style={styles.fieldLabel}>Admin Access Code <span style={styles.badge}>RESTRICTED</span></label>
                                    <div style={styles.fieldWrap}>
                                        <Shield style={styles.fieldSideIcon} size={16}/>
                                        <input 
                                            type="password" 
                                            style={styles.input} 
                                            placeholder="Enter access code" 
                                            value={adminCode}
                                            onChange={e => setAdminCode(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={styles.submitRow}>
                                <button type="submit" disabled={loading} style={{...styles.submitBtn, ...(role === 'admin' ? styles.adminBtn : styles.userBtn)}}>
                                    {loading ? "Authenticating..." : (isLogin ? `Continue as ${role === 'user' ? 'Student' : 'Admin'}` : 'Register Account')}
                                    <ArrowRight size={18} style={{marginLeft: '8px'}}/>
                                </button>
                            </div>
                        </form>

                        <div style={styles.cardFooter}>
                            <p style={{fontSize: '13px', color: '#9b8d82', cursor: 'pointer'}} onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <strong style={{color: '#5c4a3a', fontWeight: 600}}>{isLogin ? "Sign Up" : "Sign In"}</strong>
                            </p>
                            <div style={styles.teamCredit}>Built with ♥ by <span style={{color: '#6b8c66'}}>Team NeuroSense</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                `}
            </style>
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        width: '100vw',
        background: '#030712',
        fontFamily: "'Inter', sans-serif",
        color: '#f8fafc',
        overflow: 'hidden',
        position: 'relative'
    },
    bg: {
        position: 'absolute', inset: 0, zIndex: 0,
        background: '#030712',
        overflow: 'hidden'
    },
    blob: {
        position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.15,
    },
    blob1: { width: '500px', height: '500px', background: '#10b981', top: '-100px', left: '-120px' },
    blob2: { width: '380px', height: '380px', background: '#3b82f6', top: '40%', right: '-80px' },
    blob3: { width: '300px', height: '300px', background: '#7c3aed', bottom: '-80px', left: '20%' },
    blob4: { width: '220px', height: '220px', background: '#ec4899', top: '30%', left: '40%', opacity: 0.1 },
    dotGrid: {
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
    },
    page: {
        position: 'relative', zIndex: 1,
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr'
    },
    left: {
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 84px'
    },
    brand: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' },
    brandIcon: {
        width: '54px', height: '54px', borderRadius: '16px',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(16,185,129,0.2)'
    },
    brandName: { fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em' },
    brandSub: { fontSize: '11px', color: '#94a3b8', letterSpacing: '0.2em', marginTop: '4px', textTransform: 'uppercase' },
    heroH1: { fontSize: '56px', fontWeight: 800, lineHeight: 1.1, margin: '24px 0', letterSpacing: '-0.04em' },
    heroP: { fontSize: '17px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '440px', fontWeight: 400 },
    heroTag: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '100px',
        padding: '6px 14px', fontSize: '12px', color: '#34d399', fontWeight: 600
    },
    heroTagDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' },
    stats: { display: 'flex', gap: '40px', marginTop: '52px' },
    statNum: { fontSize: '32px', fontWeight: 700, color: '#f8fafc' },
    statLabel: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
    highlight: { color: '#10b981', textShadow: '0 0 20px rgba(16,185,129,0.3)' },
    right: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 56px'
    },
    card: {
        width: '100%', maxWidth: '420px', background: 'rgba(17,24,39,0.7)', borderRadius: '32px',
        padding: '44px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
    },
    cardHeader: { marginBottom: '32px' },
    cardGreeting: { fontSize: '14px', color: '#94a3b8', marginBottom: '6px' },
    cardTitle: { fontSize: '28px', fontWeight: 700, color: '#f8fafc' },
    roleToggle: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
        marginBottom: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '6px'
    },
    roleBtn: {
        padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
        fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', color: '#64748b', background: 'transparent',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    activeUser: { background: '#1e293b', color: '#38bdf8', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
    activeAdmin: { background: '#1e293b', color: '#f87171', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
    roleIcon: { width: '24px', height: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' },
    roleLabel: {
        fontSize: '11px', textAlign: 'center', color: '#475569', textTransform: 'uppercase',
        letterSpacing: '0.12em', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px',
        fontWeight: 700
    },
    field: { marginBottom: '20px' },
    fieldLabel: { fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', display: 'block' },
    fieldWrap: { position: 'relative' },
    fieldSideIcon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' },
    input: {
        width: '100%', padding: '14px 16px 14px 48px', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '14px', fontSize: '15px', background: 'rgba(0,0,0,0.2)', outline: 'none',
        color: '#f8fafc', transition: 'all 0.2s'
    },
    pwdToggle: { position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' },
    badge: { background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '9px', padding: '3px 8px', borderRadius: '6px', marginLeft: '8px', fontWeight: 700 },
    submitRow: { marginTop: '32px' },
    submitBtn: {
        width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
        fontSize: '16px', fontWeight: 700, cursor: 'pointer', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease'
    },
    userBtn: { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' },
    adminBtn: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.25)' },
    errorBanner: { background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(248,113,113,0.15)' },
    cardFooter: { marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' },
    teamCredit: { marginTop: '14px', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }
};

export default Login;
