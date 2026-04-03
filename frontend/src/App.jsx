import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import './App.css';

import Dashboard from './pages/Dashboard/Dashboard';
import Stats from './pages/Stats/Stats';
import Call from './pages/Call/Call';
import Feed from './pages/Feed/Feed';
import Chat from './pages/Chat/Chat';
import StressCam from './pages/StressCam/StressCam';
import FocusMode from './pages/FocusMode/FocusMode';
import Achievements from './pages/Achievements/Achievements';
import Login from './pages/Login/Login';

// Placeholder Pages
const WorkoutPlan = () => <div className="text-xl">Workout Plan</div>;

// Auth Guard Wrapper
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('auth_user');
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="plan" element={<WorkoutPlan />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="chat" element={<Chat />} />
          <Route path="feed" element={<Feed />} />
          <Route path="stress-cam" element={<StressCam />} />
          <Route path="focus" element={<FocusMode />} />
        </Route>
        
        {/* Full screen routes without Layout nav */}
        <Route path="/call" element={<ProtectedRoute><Call /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
