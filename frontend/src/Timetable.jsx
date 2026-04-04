import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Code, Gamepad2, Coffee, BookOpen, Moon, Bell, BellOff, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const Timetable = ({ userEmail }) => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState({ time: "", activity: "", type: "coding" });

    // Fetch tasks from DB
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/timetable?email=${userEmail}`);
                setTasks(res.data.tasks);
            } catch (err) {
                console.error("Failed to fetch timetable", err);
            } finally {
                setLoading(false);
            }
        };
        if (userEmail) fetchTasks();
    }, [userEmail]);

    // Handle Notifications
    useEffect(() => {
        if ("Notification" in window) {
            setNotificationsEnabled(Notification.permission === "granted");
        }

        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
            
            const upcomingTask = tasks.find(t => t.time === currentTime);
            if (upcomingTask && Notification.permission === "granted") {
                new Notification("⏳ Timetable Reminder", {
                    body: `It's time for: ${upcomingTask.activity}`,
                    icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                });
                // Play alarm sound
                try {
                    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                    audio.play();
                } catch (e) { console.error("Audio block:", e); }
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [tasks]);

    const requestPermission = () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                setNotificationsEnabled(permission === "granted");
                if (permission === "granted") {
                    new Notification("🚀 Notifications Active!", { body: "You'll receive reminders for your timetable slots." });
                }
            });
        }
    };

    const addTask = async () => {
        if (!newTask.time || !newTask.activity) return;
        const task = {
            id: Date.now().toString(),
            email: userEmail,
            ...newTask,
            color: newTask.type === 'coding' ? '#8b5cf6' : newTask.type === 'playing' ? '#ec4899' : '#10b981'
        };

        try {
            await axios.post('http://localhost:8000/api/save_task', task);
            const newList = [...tasks, task].sort((a, b) => a.time.localeCompare(b.time));
            setTasks(newList);
            setNewTask({ time: "", activity: "", type: "coding" });
        } catch (err) {
            alert("Failed to save task to database");
        }
    };

    const loadSamples = async () => {
        const samples = [
            { id: "s1", time: "07:00", activity: "Neural Calibration (Meditation)", type: "daily", color: "#10b981" },
            { id: "s2", time: "09:00", activity: "University Classes", type: "college", color: "#3b82f6" },
            { id: "s3", time: "13:00", activity: "Lunch Break", type: "daily", color: "#f59e0b" },
            { id: "s4", time: "15:00", activity: "Deep Coding Marathon", type: "coding", color: "#8b5cf6" },
            { id: "s5", time: "18:00", activity: "NeuroFit / Outdoor Sports", type: "playing", color: "#ec4899" },
            { id: "s6", time: "20:30", activity: "Dinner & Refresh", type: "daily", color: "#f97316" },
            { id: "s7", time: "22:00", activity: "Open Source / DSA Prep", type: "coding", color: "#a78bfa" },
        ];

        try {
            setLoading(true);
            for (const s of samples) {
                await axios.post('http://localhost:8000/api/save_task', { ...s, email: userEmail });
            }
            const res = await axios.get(`http://localhost:8000/api/timetable?email=${userEmail}`);
            setTasks(res.data.tasks);
        } catch (err) {
            alert("Failed to load samples");
        } finally {
            setLoading(false);
        }
    };

    const removeTask = async (id) => {
        try {
            await axios.delete(`http://localhost:8000/api/delete_task?email=${userEmail}&task_id=${id}`);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            alert("Failed to delete task");
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'coding': return <Code size={18} />;
            case 'playing': return <Gamepad2 size={18} />;
            case 'college': return <BookOpen size={18} />;
            case 'daily': return <Coffee size={18} />;
            default: return <Clock size={18} />;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Neural Timetable 📅</h1>
                    <p style={styles.subtitle}>Optimize your day for peak performance</p>
                </div>
                <div style={{display:'flex', gap:'12px'}}>
                    <button onClick={loadSamples} style={styles.sampleBtn}>
                        Load Student Samples
                    </button>
                    <button 
                        onClick={requestPermission} 
                        style={{...styles.notifBtn, backgroundColor: notificationsEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: notificationsEnabled ? '#10b981' : '#f87171'}}
                    >
                        {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                        {notificationsEnabled ? "Reminders On" : "Enable Reminders"}
                    </button>
                </div>
            </div>

            <div style={styles.layout}>
                {/* Timeline List */}
                <div style={styles.timelineCard}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                        <h3 style={{...styles.cardLabel, marginBottom:0}}>Today's Routine</h3>
                        {loading && <p style={{fontSize:'10px', color:'#10b981'}}>Syncing...</p>}
                    </div>
                    <div style={styles.taskList}>
                        {tasks.length === 0 && !loading && (
                            <div style={styles.emptyState}>
                                <p>Your schedule is empty.</p>
                                <button onClick={loadSamples} style={s_btn}>Add Sample Habits</button>
                            </div>
                        )}
                        {tasks.map((task) => (
                            <div key={task.id} style={styles.taskItem}>
                                <div style={{...styles.timeTag, backgroundColor: task.color + '20', color: task.color}}>
                                    {task.time}
                                </div>
                                <div style={styles.taskIcon}>{getIcon(task.type)}</div>
                                <div style={styles.taskInfo}>
                                    <p style={styles.taskActivity}>{task.activity}</p>
                                    <p style={styles.taskType}>{task.type.toUpperCase()}</p>
                                </div>
                                <button onClick={() => removeTask(task.id)} style={styles.deleteBtn}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Task / Customizer */}
                <div style={styles.sidePanel}>
                    <div style={styles.addCard}>
                        <h3 style={styles.cardLabel}>Add Custom Slot</h3>
                        <div style={styles.form}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Time</label>
                                <input 
                                    type="time" 
                                    style={styles.input} 
                                    value={newTask.time} 
                                    onChange={e => setNewTask({...newTask, time: e.target.value})}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Activity</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Grind LeetCode" 
                                    style={styles.input} 
                                    value={newTask.activity}
                                    onChange={e => setNewTask({...newTask, activity: e.target.value})}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Category</label>
                                <select 
                                    style={styles.input} 
                                    value={newTask.type}
                                    onChange={e => setNewTask({...newTask, type: e.target.value})}
                                >
                                    <option value="coding">Coding / Dev</option>
                                    <option value="playing">Gaming / Sports</option>
                                    <option value="college">Classes / Study</option>
                                    <option value="daily">Routine Things</option>
                                </select>
                            </div>
                            <button onClick={addTask} style={styles.addBtn}>
                                <Plus size={18} /> Add to Schedule
                            </button>
                        </div>
                    </div>

                    <div style={styles.adviceCard}>
                        <h3 style={styles.cardLabel}>AI Optimization Tip</h3>
                        <div style={styles.adviceContent}>
                            <CheckCircle2 size={24} style={{color: '#10b981', marginBottom: '12px'}} />
                            <p style={styles.adviceText}>
                                "Based on your focus data, your peak productivity window is between **15:00 and 17:00**. We've scheduled your hardest coding tasks then."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
    },
    title: { fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '4px' },
    subtitle: { fontSize: '14px', color: '#94a3b8' },
    notifBtn: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 20px', borderRadius: '12px', border: '1px solid currentColor',
        cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s'
    },
    layout: {
        display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px'
    },
    timelineCard: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '24px',
        padding: '24px'
    },
    cardLabel: { fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' },
    taskList: { display: 'flex', flexDirection: 'column', gap: '16px' },
    taskItem: {
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s'
    },
    timeTag: {
        padding: '6px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace'
    },
    taskIcon: { color: '#94a3b8' },
    taskInfo: { flex: 1 },
    taskActivity: { fontSize: '15px', fontWeight: 600, color: '#f1f5f9' },
    taskType: { fontSize: '10px', fontWeight: 800, color: '#475569', marginTop: '2px' },
    deleteBtn: {
        background: 'none', border: 'none', color: '#ef4444', opacity: 0.3, cursor: 'pointer',
        transition: 'opacity 0.2s'
    },
    sidePanel: { display: 'flex', flexDirection: 'column', gap: '24px' },
    addCard: {
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '24px', padding: '24px'
    },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '13px', fontWeight: 600, color: '#94a3b8' },
    input: {
        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '10px', padding: '10px 12px', color: '#fff', outline: 'none'
    },
    addBtn: {
        marginTop: '8px', padding: '12px', borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
    },
    adviceCard: {
        background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)',
        borderRadius: '24px', padding: '24px'
    },
    adviceContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
    adviceText: { fontSize: '14px', color: '#d1fae5', lineHeight: '1.6' },
    sampleBtn: {
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        padding: '0 16px', borderRadius: '12px', color: '#94a3b8', fontSize: '12px',
        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
    },
    emptyState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        padding: '40px', color: '#475569', textAlign: 'center'
    },
    s_btn: {
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none',
        padding: '10px 20px', borderRadius: '10px', color: '#fff', fontSize: '13px',
        fontWeight: 700, cursor: 'pointer'
    }
};
const s_btn = {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none',
    padding: '10px 20px', borderRadius: '10px', color: '#fff', fontSize: '13px',
    fontWeight: 700, cursor: 'pointer', marginTop: '12px'
};

export default Timetable;
