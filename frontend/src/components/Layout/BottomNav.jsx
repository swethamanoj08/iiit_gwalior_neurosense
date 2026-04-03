import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Video, MessageCircle, BarChart2, Loader } from 'lucide-react';
import './BottomNav.css';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  
  // Hide bottom nav on specific pages like stress cam or call
  if (location.pathname === '/call' || location.pathname === '/stress-cam' || location.pathname === '/focus') {
    return null;
  }

  const handleVideoScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      // Trigger the 10-second OpenCV web cam script on the backend
      await fetch('/api/run_scan', { method: 'POST' });
      // Once done, take the user to the Dashboard to see the newly generated results
      navigate('/');
      // Optional: if already on Dashboard, trigger a hard refresh or state update
      if (location.pathname === '/') {
        window.location.reload();
      }
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <nav className="bottom-nav">
      <div className="nav-items flex justify-between items-center">
        <NavLink to="/" className={({isActive}) => `nav-item flex-col items-center justify-center gap-1 ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span className="text-xs">Home</span>
        </NavLink>
        <NavLink to="/feed" className={({isActive}) => `nav-item flex-col items-center justify-center gap-1 ${isActive ? 'active' : ''}`}>
          <Compass size={24} />
          <span className="text-xs">Feed</span>
        </NavLink>
        <NavLink to="/achievements" className={({isActive}) => `nav-item flex-col items-center justify-center gap-1 ${isActive ? 'active' : ''}`}>
          <BarChart2 size={24} />
          <span className="text-xs">Stats</span>
        </NavLink>
        <NavLink to="/chat" className={({isActive}) => `nav-item flex-col items-center justify-center gap-1 ${isActive ? 'active' : ''}`}>
          <MessageCircle size={24} />
          <span className="text-xs">Guide</span>
        </NavLink>
        <button 
          onClick={handleVideoScan}
          disabled={isScanning}
          className="nav-item flex-col items-center justify-center gap-1 action-btn border-none bg-transparent m-0 cursor-pointer"
        >
          <div className="action-circle mx-auto">
             {isScanning ? (
                 <Loader size={24} color="#fff" className="animate-spin" />
             ) : (
                 <Video size={24} color="#fff" />
             )}
          </div>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
