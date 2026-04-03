import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Activity, Moon, Coffee, Heart, PhoneCall, X, Wind, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  
  // Modals
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showBreatheModal, setShowBreatheModal] = useState(false);
  
  // State Tracking for Questionnaires
  const [chatState, setChatState] = useState('idle');
  const [tempData, setTempData] = useState({});

  // Breathing state
  const [breathePhase, setBreathePhase] = useState({ name: 'Ready', class: '' }); 
  const [breatheRound, setBreatheRound] = useState(0);
  const breatheInterval = useRef(null);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [hasProvidedName, setHasProvidedName] = useState(false);

  // Initial greeting
  useEffect(() => {
    addBotMessage(`Hi there! I'm MindGuard, your AI mental wellness companion.\n\nBefore we begin, what should I call you?`);
    return () => stopBreathing();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, quickReplies]);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, sender: 'bot', time: new Date() }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, sender: 'user', time: new Date() }]);
  };

  const handleFatigueFlow = async (text) => {
      let val = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(val)) val = 6;
      
      const newTemp = { ...tempData };
      if (chatState === 'fatigue_sleep') {
          newTemp.sleep = val;
          setTempData(newTemp);
          setChatState('fatigue_work');
          addBotMessage("Got it. How many hours are you working or studying per day?");
          setQuickReplies(["4", "6", "8", "10+"]);
      } else if (chatState === 'fatigue_work') {
          newTemp.work = val;
          setTempData(newTemp);
          setChatState('fatigue_stress');
          addBotMessage("On a scale of 1-10, what is your current stress level?");
          setQuickReplies(["2 (Low)", "5 (Moderate)", "8 (High)", "10 (Severe)"]);
      } else if (chatState === 'fatigue_stress') {
          newTemp.stress = val > 10 ? 10 : val;
          setTempData(newTemp);
          setChatState('fatigue_activity');
          addBotMessage("Lastly, what is your activity level? (0: None, 1: Light, 2: Moderate, 3: Heavy)");
          setQuickReplies(["0 - None", "1 - Light walking", "2 - Exercise", "3 - Heavy workout"]);
      } else if (chatState === 'fatigue_activity') {
          newTemp.activity = val > 3 ? 3 : val;
          addBotMessage("Calculating your fatigue score...");
          try {
             const res = await fetch('http://127.0.0.1:5000/api/fatigue', {
                method: 'POST',
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sleep_hours: newTemp.sleep,
                    work_hours: newTemp.work,
                    stress_level: newTemp.stress,
                    activity_level: newTemp.activity,
                    user_name: username
                })
             });
             const data = await res.json();
             addBotMessage(data.message);
             setQuickReplies(["Nutrition tips", "Breathing exercise", "Start over"]);
          } catch(e) {
             addBotMessage("Failed to calculate score. Let's start over.");
          }
          setChatState('idle');
          setTempData({});
      }
  };

  const handleBurnoutFlow = async (text) => {
      let val = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(val)) val = 40;
      
      const newTemp = { ...tempData };
      if (chatState === 'burnout_work') {
          newTemp.work = val;
          setTempData(newTemp);
          setChatState('burnout_stress');
          addBotMessage("What is your average workplace stress level (1-10)?");
          setQuickReplies(["2 (Low)", "5 (Moderate)", "8 (High)", "10 (Severe)"]);
      } else if (chatState === 'burnout_stress') {
          newTemp.stress = val > 10 ? 10 : val;
          setTempData(newTemp);
          setChatState('burnout_fatigue');
          addBotMessage("What is your current fatigue score out of 100? (If unsure, just guess 50)");
          setQuickReplies(["30 (Low)", "50 (Medium)", "70 (High)", "90 (Severe)"]);
      } else if (chatState === 'burnout_fatigue') {
          newTemp.fatigue = val;
          setTempData(newTemp);
          setChatState('burnout_break');
          addBotMessage("How many days has it been since you took a proper day off?");
          setQuickReplies(["1 day", "4 days", "7 days", "14+ days"]);
      } else if (chatState === 'burnout_break') {
          newTemp.break = val;
          addBotMessage("Checking your burnout risk...");
          try {
             const res = await fetch('http://127.0.0.1:5000/api/burnout', {
                method: 'POST',
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify({
                    work_hours_per_week: newTemp.work,
                    stress_level: newTemp.stress,
                    fatigue_score: newTemp.fatigue,
                    days_without_break: newTemp.break,
                    user_name: username
                })
             });
             const data = await res.json();
             addBotMessage(`Burnout Risk: ${data.burnout_level}\n\nRecommendations:\n• ${data.recommendations.join('\n• ')}`);
             setQuickReplies(["Fatigue Assessment", "Start Breathing", "Go to Dashboard"]);
          } catch(e) { addBotMessage("Failed to calculate burnout."); }
          setChatState('idle');
          setTempData({});
      }
  };

  const handlePhqFlow = async (text) => {
      let val = 0;
      let lower = text.toLowerCase();
      if (lower.includes('several') || lower.includes('1')) val = 1;
      else if (lower.includes('half') || lower.includes('2')) val = 2;
      else if (lower.includes('nearly') || lower.includes('every') || lower.includes('3')) val = 3;
      
      const newAnswers = [...(tempData.answers || []), val];
      setTempData({ answers: newAnswers });
      
      const questions = [
         "1. Little interest or pleasure in doing things?",
         "2. Feeling down, depressed, or hopeless?",
         "3. Trouble falling or staying asleep, or sleeping too much?",
         "4. Feeling tired or having little energy?",
         "5. Poor appetite or overeating?",
         "6. Feeling bad about yourself — or that you are a failure?",
         "7. Trouble concentrating on things?",
         "8. Moving or speaking so slowly that other people noted it? Or the opposite?",
         "9. Thoughts that you would be better off dead, or of hurting yourself?"
      ];
      
      const qIndex = newAnswers.length;
      if (qIndex < 9) {
          addBotMessage(questions[qIndex]);
          setQuickReplies(["0 - Not at all", "1 - Several days", "2 - More than half", "3 - Nearly every day"]);
      } else {
          addBotMessage("Analyzing your responses...");
          try {
             const res = await fetch('http://127.0.0.1:5000/api/phq', {
                method: 'POST',
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify({ answers: newAnswers, user_name: username })
             });
             const data = await res.json();
             addBotMessage(`Assessment complete.\nResult: ${data.level} (Score: ${data.total})\n\n${data.advice}`);
             if (data.seek_help) {
                setQuickReplies(["Show Crisis Support", "Start Breathing", "Calculate fatigue score"]);
             } else {
                setQuickReplies(["Breathing exercise", "Fatigue assessment"]);
             }
          } catch(e) { addBotMessage("Error processing assessment."); }
          setChatState('idle');
          setTempData({});
      }
  };

  const resetChat = () => {
    setMessages([]); 
    setChatState('idle');
    setTempData({});
    setQuickReplies(["Calculate fatigue score", "Burnout Check", "PHQ-9 Quiz", "I'm stressed"]);
    addBotMessage("Conversation reset. How can I help you?");
  };

  const handleSend = async (textToSend = inputValue) => {
    if (!textToSend.trim()) return;
    
    addUserMessage(textToSend);
    setInputValue('');
    setQuickReplies([]);
    setIsTyping(true);

    if (!hasProvidedName) {
      const name = textToSend.trim();
      setUsername(name);
      setHasProvidedName(true);
      setIsTyping(false);
      addBotMessage(`Nice to meet you, ${name}!\n\nI can help you with fatigue assessment, sleep guidance, stress, anxiety, or general wellness advice.\n\nWhat would you like to explore today?`);
      setQuickReplies(["Calculate fatigue score", "Burnout Check", "PHQ-9 Quiz", "I'm stressed"]);
      return;
    }

    try {
      const lowerText = textToSend.toLowerCase();

      // Trigger Keywords for local actions
      if (lowerText.includes('breathe') || lowerText.includes('breathing')) {
         setIsTyping(false);
         setShowBreatheModal(true);
         addBotMessage("I've opened the Box Breathing exercise for you. Follow the ring to calm your nervous system.");
         setChatState('idle');
         setQuickReplies(["Calculate fatigue score", "PHQ-9 Quiz"]);
         return;
      }
      if (lowerText.includes('crisis') || lowerText.includes('suicide') || lowerText.includes('die')) {
         setIsTyping(false);
         setShowCrisisModal(true);
         addBotMessage("I'm displaying crisis resources for you right now. Please reach out to them. You matter.");
         setQuickReplies(["Show Crisis Support", "I want to talk"]);
         setChatState('idle');
         return;
      }
      if (lowerText.includes('reset') || lowerText.includes('start over')) {
         setIsTyping(false);
         resetChat();
         return;
      }

      // Check current conversation state for questionnaires
      if (chatState.startsWith('fatigue_')) {
          handleFatigueFlow(textToSend);
          setIsTyping(false);
          return;
      }
      if (chatState.startsWith('burnout_')) {
          handleBurnoutFlow(textToSend);
          setIsTyping(false);
          return;
      }
      if (chatState.startsWith('phq_')) {
          handlePhqFlow(textToSend);
          setIsTyping(false);
          return;
      }
      
      // Determine if a new flow should start
      if (lowerText.includes('fatigue score') || lowerText === 'fatigue assessment') {
          setIsTyping(false);
          setChatState('fatigue_sleep');
          addBotMessage(`I'll ask you 4 quick questions to calculate your fatigue score. First, how many hours did you sleep last night?`);
          setQuickReplies(["Less than 5", "6", "8", "10+"]);
          return;
      }
      if (lowerText.includes('phq') || lowerText === 'phq-9 quiz' || lowerText.includes('phq-9 assessment')) {
          setIsTyping(false);
          setChatState('phq_1');
          setTempData({ answers: [] });
          addBotMessage(`Starting PHQ-9 Mental Health Assessment. Over the last 2 weeks, how often have you had little interest or pleasure in doing things?`);
          setQuickReplies(["0 - Not at all", "1 - Several days", "2 - More than half", "3 - Nearly every day"]);
          return;
      }
      if (lowerText.includes('burnout risk') || lowerText === 'burnout check' || lowerText.includes('calculate burnout')) {
          setIsTyping(false);
          setChatState('burnout_work');
          addBotMessage(`Let's check your burnout risk. How many hours do you work per week on average?`);
          setQuickReplies(["Less than 40", "40 hours", "50 hours", "60+ hours"]);
          return;
      }

      // Default backend text fallback
      const res = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, user_name: username })
      });
      
      const data = await res.json();
      
      setIsTyping(false);
      addBotMessage(data.response);
      
      if (data.quick_replies && data.quick_replies.length > 0) {
        setQuickReplies(data.quick_replies);
      }
      
      if (data.intent === 'crisis') {
         setTimeout(() => setShowCrisisModal(true), 1500);
      }

    } catch (err) {
      console.error("Chat API Error:", err);
      setIsTyping(false);
      addBotMessage("I'm sorry, I couldn't reach the server. Let's start over.");
      setChatState('idle');
    }
  };

  const startBreathing = () => {
    if (breatheInterval.current) clearInterval(breatheInterval.current);
    
    let currentPhase = 0;
    const phases = [
      { name: 'Inhale', class: 'inhale' },
      { name: 'Hold', class: 'hold' },
      { name: 'Exhale', class: 'exhale' },
      { name: 'Hold Empty', class: 'hold-empty' }
    ];

    setBreatheRound(1);
    setBreathePhase(phases[0]);
    currentPhase++;

    breatheInterval.current = setInterval(() => {
      if (currentPhase >= phases.length) {
         currentPhase = 0;
         setBreatheRound(prev => {
            if (prev >= 4) {
               stopBreathing();
               return 0; // finished
            }
            return prev + 1;
         });
      }
      setBreathePhase(phases[currentPhase]);
      currentPhase++;
    }, 4000); // 4 seconds per phase
  };

  const stopBreathing = () => {
    if (breatheInterval.current) clearInterval(breatheInterval.current);
    setBreathePhase({ name: 'Ready', class: '' });
    setBreatheRound(0);
  };

  const closeBreatheModal = () => {
    stopBreathing();
    setShowBreatheModal(false);
  };

  return (
    <div className="chat-page">
      
      {/* Sidebar Desktop */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-group">
          <div className="chat-sidebar-heading">Assessments</div>
          <button className="chat-nav-item" onClick={() => handleSend("Calculate fatigue score")}>
            <span className="chat-nav-icon"><Activity size={18}/></span> Fatigue Score
          </button>
          <button className="chat-nav-item" onClick={() => handleSend("Calculate burnout risk")}>
            <span className="chat-nav-icon"><Coffee size={18}/></span> Burnout Check
          </button>
          <button className="chat-nav-item" onClick={() => handleSend("PHQ-9 quiz")}>
            <span className="chat-nav-icon"><Heart size={18}/></span> PHQ-9 Quiz
          </button>
        </div>

        <div className="chat-sidebar-group" style={{marginTop: '1rem'}}>
          <div className="chat-sidebar-heading">Quick Topics</div>
          <button className="chat-nav-item" onClick={() => handleSend("I want to improve my sleep")}>
             <span className="chat-nav-icon"><Moon size={18}/></span> Sleep
          </button>
          <button className="chat-nav-item" onClick={() => handleSend("I'm feeling anxious")}>
             <span className="chat-nav-icon"><Wind size={18}/></span> Anxiety
          </button>
        </div>

        <div className="chat-score-widget">
           <div className="score-label">Wellness Goal</div>
           <div className="score-val">85%</div>
           <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>Daily Consistency</div>
           <div className="score-bar-track">
             <div className="score-bar-fill" style={{width: '85%'}}></div>
           </div>
        </div>

        <button className="chat-crisis-btn" onClick={() => setShowCrisisModal(true)}>
           <PhoneCall size={16} className="inline mr-2"/> Crisis Support
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        
        {/* Header */}
        <div className="chat-header">
           <div className="chat-header-info">
             <div className="chat-bot-avatar">
               <Bot size={24} />
             </div>
             <div className="chat-bot-details">
               <span className="chat-bot-name">MindGuard AI</span>
               <span className="chat-bot-status"><div className="status-dot"></div> Online</span>
             </div>
           </div>
           
           <div className="chat-actions">
              <button className="chat-action-btn" onClick={() => setShowBreatheModal(true)}>
                 <Wind size={16} className="inline mr-1"/> Breathe
              </button>
              <button className="chat-action-btn" onClick={resetChat}>
                 Reset
              </button>
           </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
           {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.sender}`}>
                 <div className="msg-avatar">
                    {msg.sender === 'bot' ? <Bot size={18}/> : <User size={18}/>}
                 </div>
                 <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div className="msg-bubble">
                       {msg.text}
                    </div>
                    <div className="msg-time">
                       {msg.time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </div>
                 </div>
              </div>
           ))}
           
           {isTyping && (
             <div className="typing-wrap">
                <div className="msg-avatar" style={{background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff'}}>
                   <Bot size={18}/>
                </div>
                <div className="typing-dots">
                   <div className="typing-dot"></div>
                   <div className="typing-dot"></div>
                   <div className="typing-dot"></div>
                </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {quickReplies.length > 0 && (
           <div className="qr-row">
              {quickReplies.map((qr, idx) => (
                 <button key={idx} className="qr-chip" onClick={() => handleSend(qr)}>
                    {qr}
                 </button>
              ))}
           </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
           <div className="chat-input-wrapper">
              <input 
                 type="text" 
                 placeholder="Type a message to MindGuard..." 
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => { if(e.key === 'Enter') handleSend(); }}
              />
              <button 
                className="chat-send-btn" 
                disabled={!inputValue.trim() || isTyping}
                onClick={() => handleSend()}
              >
                 <Send size={18} />
              </button>
           </div>
        </div>
      </div>

      {/* CRISIS MODAL */}
      {showCrisisModal && (
        <div className="chat-modal-overlay" onClick={() => setShowCrisisModal(false)}>
           <div className="chat-modal" onClick={e => e.stopPropagation()}>
              <div className="chat-modal-header">
                 <span style={{color: '#f87171'}}><PhoneCall className="inline mr-2" size={24}/> Crisis Support</span>
                 <button className="chat-modal-close" onClick={() => setShowCrisisModal(false)}><X size={20}/></button>
              </div>
              <p className="chat-modal-desc">
                 You are not alone. These services are free, confidential, and available right now.
              </p>
              
              <div className="helpline-card">
                 <div>
                   <div className="helpline-name">iCall Psychosocial</div>
                   <div className="helpline-hours">Mon-Sat, 8am - 10pm</div>
                 </div>
                 <div className="helpline-number">9152987821</div>
              </div>

              <div className="helpline-card">
                 <div>
                   <div className="helpline-name">Vandrevala Foundation</div>
                   <div className="helpline-hours">24/7 Available</div>
                 </div>
                 <div className="helpline-number">1860-2662-345</div>
              </div>

              <div className="helpline-card">
                 <div>
                   <div className="helpline-name">AASRA</div>
                   <div className="helpline-hours">24/7 Available</div>
                 </div>
                 <div className="helpline-number">9820466627</div>
              </div>
           </div>
        </div>
      )}

      {/* BREATHE MODAL */}
      {showBreatheModal && (
        <div className="chat-modal-overlay" onClick={closeBreatheModal}>
           <div className="chat-modal" style={{textAlign: 'center'}} onClick={e => e.stopPropagation()}>
              <div className="chat-modal-header" style={{justifyContent: 'center'}}>
                 Box Breathing Exercise
                 <button className="chat-modal-close" style={{position:'absolute', right:'1.5rem'}} onClick={closeBreatheModal}><X size={20}/></button>
              </div>
              <p className="chat-modal-desc mt-2">
                 Follow the ring to calm your nervous system.
              </p>
              
              <div className={`breathe-ring ${breathePhase.class}`}>
                 {breathePhase.name || 'Ready'}
              </div>
              
              <div style={{color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
                 {breatheRound === 0 && breathePhase.name === 'Ready' 
                   ? 'Press start to begin' 
                   : breatheRound === 0 
                     ? 'Finished!' 
                     : `Round ${breatheRound} of 4`}
              </div>

              {breatheRound === 0 && breathePhase.name === 'Ready' ? (
                 <button 
                   onClick={startBreathing}
                   style={{background: '#00e5ff', color: 'black', padding: '0.75rem 2rem', borderRadius: '2rem', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}
                 >
                    <Play size={18} fill="currentColor"/> Start Breathing
                 </button>
              ) : (
                 <button 
                   onClick={stopBreathing}
                   style={{background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '0.5rem 1.5rem', borderRadius: '2rem', cursor: 'pointer'}}
                 >
                    {breatheRound === 0 ? 'Close' : 'Stop Exercise'}
                 </button>
              )}
           </div>
        </div>
      )}
      
    </div>
  );
};

export default Chat;
