import React from 'react';
import { ChevronLeft, Trophy, Star, Medal, Target, Flame, BrainCircuit, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Achievements.css';

const badges = [
  { id: 1, title: 'Early Bird', description: 'Started studying before 7 AM', icon: <Flame className="w-8 h-8" />, color: 'from-orange-400 to-red-500', unlocked: true },
  { id: 2, title: 'Deep Focus', description: '2 hours uninterrupted study', icon: <BrainCircuit className="w-8 h-8" />, color: 'from-blue-400 to-indigo-500', unlocked: true },
  { id: 3, title: 'Scholar', description: 'Log 50 hours of study', icon: <BookOpen className="w-8 h-8" />, color: 'from-emerald-400 to-teal-500', unlocked: false },
  { id: 4, title: 'Stress Master', description: 'Kept stress below 50 for a week', icon: <Medal className="w-8 h-8" />, color: 'from-purple-400 to-pink-500', unlocked: false },
  { id: 5, title: 'Zen Master', desc: '10 hours of Focus', icon: <Star size={24} color="#f48fb1" />, active: false },
  { id: 6, title: 'Hydration Pro', desc: 'Hit water goal 5 days', icon: <Target size={24} color="#00e5ff" />, active: true },
];

const Achievements = () => {
  return (
    <div className="achievements-container pb-20 p-6">
      <header className="flex justify-between items-center mb-8">
        <Link to="/" className="icon-btn border-[var(--border-color)]">
           <ChevronLeft size={20} />
        </Link>
        <h2 className="text-xl font-bold">Achievements</h2>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* Hero Stats */}
      <div className="hero-stats bg-gradient-to-br from-[var(--bg-card)] to-black border border-[var(--border-color)] rounded-[30px] p-6 mb-8 text-center relative overflow-hidden animate-slide-up delay-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-teal)]/20 rounded-full blur-[50px]"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--accent-purple)]/20 rounded-full blur-[50px]"></div>
        
        <div className="relative z-10">
           <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-[#ffb74d] to-[#ff7e5f] flex items-center justify-center p-1 mb-4 shadow-[0_10px_30px_rgba(255,183,77,0.3)]">
              <div className="w-full h-full bg-[var(--bg-primary)] rounded-full flex items-center justify-center">
                 <Trophy size={32} color="#ffb74d" />
              </div>
           </div>
           
           <h3 className="text-3xl font-extrabold mb-1">Level 12</h3>
           <p className="text-secondary mb-4">Fitness Enthusiast</p>
           
           <div className="w-full bg-[var(--bg-primary)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="h-full bg-gradient-to-r from-[var(--accent-teal)] to-[var(--accent-purple)] w-[65%] rounded-full"></div>
           </div>
           <p className="text-xs text-secondary mt-2 text-right">650 / 1000 XP</p>
        </div>
      </div>

      {/* Badges Grid */}
      <h3 className="section-title mb-4 animate-fade-in delay-200">Your Badges</h3>
      <div className="grid grid-cols-2 gap-4">
        {badges.map((badge, index) => (
          <div key={badge.id} className={`badge-card card p-5 flex flex-col items-center text-center transition-transform hover:scale-105 ${!badge.unlocked ? 'opacity-50 grayscale' : ''} animate-slide-up`} style={{animationDelay: `${200 + index * 100}ms`}}>
             <div className={`badge-icon-wrapper mb-3 w-16 h-16 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center p-1 shadow-[0_5px_15px_rgba(0,0,0,0.3)]`}>
                <div className="w-full h-full bg-[var(--bg-primary)] rounded-full flex items-center justify-center">
                   {badge.icon}
                </div>
             </div>
             <h4 className="font-bold text-sm mb-1">{badge.title}</h4>
             <p className="text-[10px] text-secondary leading-tight">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
