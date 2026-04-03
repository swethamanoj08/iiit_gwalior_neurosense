import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, Edit2, ListTodo, Plus } from 'lucide-react';
import './Timetable.css';

const DEFAULT_TASKS = [
  "Study", "Coding", "Exercise", "Reading", "Leisure", "Sleep"
];

const Timetable = () => {
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmedMode, setConfirmedMode] = useState(false);
  
  const [newTask, setNewTask] = useState('');

  const username = localStorage.getItem('auth_user') || 'guest';

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const res = await fetch(`/api/get_timetable?username=${username}`);
      const data = await res.json();
      
      if (Object.keys(data).length > 0) {
         setAllocations(data);
         setConfirmedMode(true);
      } else {
         const initial = {};
         DEFAULT_TASKS.forEach(t => initial[t] = { hours: 1, completed: false });
         setAllocations(initial);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/save_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, allocations })
      });
      setConfirmedMode(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (category) => {
    setAllocations(prev => ({
       ...prev,
       [category]: { ...prev[category], completed: !prev[category].completed }
    }));
    try {
       await fetch(`/api/toggle_allocation/${category}?username=${username}`, { method: 'POST' });
    } catch(err) {
       console.error("Failed to sync toggle", err);
    }
  };

  const toggleTaskInclude = (category) => {
    setAllocations(prev => {
      const newAlloc = { ...prev };
      if (newAlloc[category]) {
        delete newAlloc[category];
      } else {
        newAlloc[category] = { hours: 1, completed: false };
      }
      return newAlloc;
    });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAllocations(prev => ({
      ...prev,
      [newTask.trim()]: { hours: 1, completed: false }
    }));
    setNewTask('');
  };

  if (loading) return <div className="tt-loading">Loading schedule...</div>;

  // View 1: Confirmed Checklist
  if (confirmedMode) {
     const completedCount = Object.values(allocations).filter(v => typeof v === 'object' && v.completed).length;
     const totalItems = Object.keys(allocations).length;
     const progressPct = Object.keys(allocations).length === 0 ? 0 : Math.round((completedCount / totalItems) * 100);

     return (
        <div className="timetable-wrapper">
           <div className="timetable-header">
              <div className="timetable-title-group">
                 <h3 className="timetable-title">
                   <ListTodo size={20} /> 
                   Today's Timetable
                 </h3>
                 <p className="timetable-subtitle">
                    {progressPct}% Completed ({completedCount}/{totalItems} tasks)
                 </p>
              </div>
              <button 
                onClick={() => setConfirmedMode(false)}
                className="tt-edit-btn"
              >
                <Edit2 size={12}/> Edit
              </button>
           </div>
           
           <div className="tt-checklist">
              {Object.entries(allocations).map(([category, val]) => {
                 const isCompleted = typeof val === 'object' ? val.completed : false;
                 return (
                    <div 
                      key={category} 
                      className={`tt-check-item ${isCompleted ? 'completed' : ''}`}
                    >
                       <div className="tt-check-left" onClick={() => toggleTaskStatus(category)}>
                          <input 
                            type="checkbox" 
                            checked={isCompleted}
                            onChange={() => {}} 
                            className="tt-checkbox"
                          />
                          <span className="tt-task-name">
                             {category}
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
     );
  }

  // View 2: Edit / Create Timetable
  const allKnownTasks = Array.from(new Set([...DEFAULT_TASKS, ...Object.keys(allocations)]));

  return (
    <div className="timetable-card">
      <div className="timetable-header">
         <div className="timetable-title-group">
            <h3 className="timetable-title">
              <Calendar size={22} /> 
              Create Timetable
            </h3>
            <p className="timetable-subtitle">
               Select the activities for your daily plan.
            </p>
         </div>
      </div>

      <div className="tt-edit-list">
         {allKnownTasks.map(task => {
           const isChecked = !!allocations[task];
           return (
             <label key={task} className={`tt-select-label ${isChecked ? 'checked' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={() => toggleTaskInclude(task)} 
                  className="tt-select-checkbox"
                />
                <span className="tt-select-text">{task}</span>
             </label>
           )
         })}
      </div>

      <form onSubmit={handleAddTask} className="tt-add-form">
         <input 
           type="text" 
           placeholder="Add custom task..." 
           className="tt-add-input"
           value={newTask}
           onChange={(e) => setNewTask(e.target.value)}
         />
         <button type="submit" className="tt-add-btn">
            <Plus size={16} /> Add Task
         </button>
      </form>

      <button 
         onClick={handleSave} 
         disabled={saving || Object.keys(allocations).length === 0}
         className="tt-confirm-btn"
      >
         <Save size={20} />
         {saving ? 'Confirming...' : 'Confirm Timetable'}
      </button>

    </div>
  );
};

export default Timetable;
