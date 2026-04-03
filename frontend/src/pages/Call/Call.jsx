import React from 'react';
import { ChevronLeft, MicOff, Video, Volume2, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Call.css';

const Call = () => {
  const navigate = useNavigate();

  return (
    <div className="call-container">
      {/* Simulated Advisor Video Background */}
      <img 
        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
        alt="Academic Advisor" 
        className="main-video"
      />
      
      {/* Top Controls Overlay */}
      <div className="top-overlay flex justify-between items-center p-6 w-full max-w-[600px] mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#fff" />
        </button>
        <div className="timer-badge flex items-center gap-2">
          <div className="recording-dot"></div>
          <span className="text-sm font-medium">00:24:04</span>
        </div>
      </div>

      {/* Picture in Picture (User) */}
      <div className="pip-container">
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" 
          alt="Self" 
          className="pip-video"
        />
      </div>

      {/* Bottom Controls */}
      <div className="bottom-controls flex justify-center gap-4 w-full max-w-[600px] mx-auto absolute bottom-0 left-1/2 -translate-x-1/2 z-10 pb-10 pt-20">
        <button className="control-btn"><MicOff size={24} color="#fff" /></button>
        <button className="control-btn"><Video size={24} color="#fff" /></button>
        <button className="control-btn"><Volume2 size={24} color="#fff" /></button>
        <button className="control-btn end-call" onClick={() => navigate(-1)}>
          <PhoneOff size={24} color="#fff" />
        </button>
      </div>
    </div>
  );
};

export default Call;
