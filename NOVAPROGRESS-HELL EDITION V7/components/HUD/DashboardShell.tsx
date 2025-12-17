
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TempleType, UserProfile, Category, Task } from '../../types';
import MirrorButton from '../UI/MirrorButton';
import { useNotification } from '../UI/NotificationProvider';
import { supabase } from '../../lib/supabaseClient';
import LevelUpOverlay from './LevelUpOverlay';
import { 
  HomeView, FitnessView, SkillsView, BusinessView, MissionView, 
  AnalyticsView, ProfileView, AIView, GenericCategoryView, ProjectsView, QuestModal 
} from './Views';
import HabitTracker from './HabitTracker'; // New Import
import RoadmapEditor from './RoadmapEditor';
import AdvancedWorkspace from './AdvancedWorkspace'; // New Import
import { getDemonMessage } from '../../services/aiAnalysis';

/* ========================================================================== */
/*                        NOVA PROGRESS SHELL - V8 HELL EDITION               */
/* ========================================================================== */
/* 
   SYSTEM ARCHITECTURE:
   This component serves as the 'Operating System' for the user.
   
   UPDATES IN V8:
   1. DYNAMIC ATMOSPHERE: A Canvas-based background engine that changes physics
      based on the active view (e.g., Fitness = Physical Pumping, Business = Floating Gold).
   2. HEADER HUD: Restored Profile Ring with Level-based coloring and Logout menu.
   3. RESPONSIVENESS: Fixed Sidebar/Header, scrollable Content Area.
*/

// --- ICON ASSETS (V8 UPDATED) ---
const Icons = {
  HOME: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  FITNESS: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a6 6 0 1112 0v2h1a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2v-8c0-1.1.9-2 2-2h1zm5 6.733c1.605 0 3.113.623 4.2 1.767A7.962 7.962 0 0118 18.681" /></svg>, // Biceps/Dumbbell
  SKILLS: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  BUSINESS: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  MISSION: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, // Task Board
  ANALYTICS: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  PROFILE: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  ROADMAP: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  AI: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  PROJECTS: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  HABIT: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  ADD: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'HOME', label: 'Home', icon: Icons.HOME, color: '#ffffff' },
  { id: 'FITNESS', label: 'FITNESS', icon: Icons.FITNESS, color: '#ef4444' }, 
  { id: 'MISSION', label: 'TASK LISTS', icon: Icons.MISSION, color: '#6366f1' }, 
  { id: 'SKILLS', label: 'SKILLS', icon: Icons.SKILLS, color: '#3b82f6' }, 
  { id: 'BUSINESS', label: 'BUSINESS', icon: Icons.BUSINESS, color: '#eab308' }, 
  { id: 'PROJECTS', label: 'PROJECTS', icon: Icons.PROJECTS, color: '#84cc16' }, 
  { id: 'HABIT', label: 'HABIT TRACKER', icon: Icons.HABIT, color: '#ec4899' }, // NEW: Pink/Magenta
  { id: 'ROADMAP', label: 'ROADMAP EDITOR', icon: Icons.ROADMAP, color: '#f87171' }, 
  { id: 'AI', label: 'NOVAI', icon: Icons.AI, color: '#8b5cf6' }, 
  { id: 'ANALYTICS', label: 'ANALYTICS', icon: Icons.ANALYTICS, color: '#14b8a6' },
  { id: 'PROFILE', label: 'IDENTITY', icon: Icons.PROFILE, color: '#22c55e' },
];

interface DashboardShellProps { userId: string; }

// Helper: Determines ring color gradient based on level (V8 Specs)
const getLevelGradient = (lvl: number) => {
    if (lvl >= 50) return 'linear-gradient(45deg, #ffd700, #ffaa00)'; // S Rank (Gold)
    if (lvl >= 40) return 'linear-gradient(45deg, #ef4444, #991b1b)'; // A Rank (Red)
    if (lvl >= 30) return 'linear-gradient(45deg, #a855f7, #6b21a8)'; // B Rank (Purple)
    if (lvl >= 20) return 'linear-gradient(45deg, #3b82f6, #1e40af)'; // C Rank (Blue)
    if (lvl >= 10) return 'linear-gradient(45deg, #22c55e, #166534)'; // D Rank (Green)
    return 'linear-gradient(45deg, #ffffff, #9ca3af)'; // E Rank (White)
};

const DashboardShell: React.FC<DashboardShellProps> = ({ userId }) => {
  const { addToast } = useNotification();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // -- UI STATE --
  const [activeView, setActiveView] = useState<TempleType>('HOME'); 
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // -- GAME STATE --
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // -- USER DATA --
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: userId, email: 'hunter@nova.system', username: 'HUNTER', height: '0', weight: '0', age: '0', gender: 'MALE', dob: '', bio: 'System Initialized.', api_key: '', is_premium: false
  });

  // --- V8 BACKGROUND ENGINE ---
  // Renders different particle physics based on the `activeView`.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let animationId: number;
    let time = 0;

    // Entity Types for different views
    const particles: any[] = [];
    const initParticles = () => {
        particles.length = 0;
        const count = 50; 
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                type: Math.random() > 0.5 ? 'A' : 'B' // For collisions
            });
        }
    };
    initParticles();

    const render = () => {
        time++;
        ctx.clearRect(0, 0, w, h);
        
        // --- 1. GLOBAL GHOSTING EFFECT (Opacity 60%) ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 60% opacity trail for "Loop" effect
        // Actually, clearer to fill semi-transparent rect to create trails
        
        // --- 2. SWITCH LOGIC PER VIEW ---
        if (activeView === 'FITNESS') {
            // FITNESS: "Pumping" Animation (Bars moving up/down)
            const barCount = 20;
            const barWidth = w / barCount;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // Red Tint
            for (let i = 0; i < barCount; i++) {
                const height = Math.sin(time * 0.05 + i) * 100 + 150; // Pumping motion
                ctx.fillRect(i * barWidth, h - height, barWidth - 5, height);
            }
        } 
        else if (activeView === 'BUSINESS') {
            // BUSINESS: Floating Gold Particles (Money)
            ctx.fillStyle = 'rgba(234, 179, 8, 0.4)'; // Gold
            particles.forEach(p => {
                p.y -= p.size * 0.5; // Float up
                if (p.y < 0) p.y = h;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                // Draw "$" symbol occasionally
                if (p.size > 2) ctx.fillText("$", p.x, p.y);
            });
        }
        else if (activeView === 'HABIT') {
             // HABIT: Matrix Rain Style (Vertical Streaks)
             const drops = particles.map(p => ({ x: p.x, y: (p.y + time * 5) % h }));
             ctx.fillStyle = 'rgba(236, 72, 153, 0.3)'; // Pink
             drops.forEach(d => {
                 ctx.fillRect(d.x, d.y, 2, 20);
             });
        }
        else if (activeView === 'SKILLS') {
            // SKILLS: Particles colliding and sparking
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > w) p.vx *= -1;
                if(p.y < 0 || p.y > h) p.vy *= -1;
                
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; // Blue
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                
                // Draw connection lines if close
                particles.forEach(p2 => {
                    const dx = p.x - p2.x; const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 50) {
                        ctx.strokeStyle = `rgba(59, 130, 246, ${1 - dist/50})`;
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                    }
                });
            });
        }
        else if (activeView === 'MISSION') {
            // MISSION: Checkboard Loop (Scanning lines)
            const scanY = (time * 2) % h;
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'; // Indigo
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();
            
            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            for(let x=0; x<w; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
            for(let y=0; y<h; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
        }
        else if (activeView === 'PROFILE') {
            // PROFILE: Green Glowing Particles (Request 4)
            particles.forEach(p => {
                p.y -= 0.5; if(p.y < 0) p.y = h;
                ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; // Green Opacity 60%
                ctx.shadowBlur = 10; ctx.shadowColor = '#22c55e';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
        }
        else {
            // DEFAULT / HOME / ADVANCED: Man Choosing / Generic Flow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            particles.forEach(p => {
                p.x += Math.sin(time * 0.01 + p.y) * 0.5;
                p.y += Math.cos(time * 0.01 + p.x) * 0.5;
                ctx.fillRect(p.x, p.y, 2, 2);
            });
        }

        animationId = requestAnimationFrame(render);
    };
    
    render();
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; initParticles(); };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, [activeView]);

  // --- DATA FETCHING ---
  const fetchProfile = async () => {
     const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
     if (data) {
         setUserProfile(data as UserProfile);
         localStorage.setItem(`nova_profile_${userId}`, JSON.stringify(data));
     } else {
         const localStr = localStorage.getItem(`nova_profile_${userId}`);
         if (localStr) { try { setUserProfile(JSON.parse(localStr)); } catch(e) {} }
     }
  };

  useEffect(() => {
    fetchProfile();
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('nova_profile_update', handleProfileUpdate);
    return () => window.removeEventListener('nova_profile_update', handleProfileUpdate);
  }, [userId]);

  const fetchGlobalStats = async () => {
     let allTasks: Task[] = [];
     try { const { data } = await supabase.from('tasks').select('*').eq('user_id', userId); if (data) allTasks = data as Task[]; } catch (e) {}
     try { const stored = localStorage.getItem(`nova_local_tasks_${userId}`); if (stored) allTasks = [...allTasks, ...JSON.parse(stored)]; } catch (e) {}
     allTasks = Array.from(new Map(allTasks.map(item => [item.id, item])).values());
     setGlobalTasks(allTasks);
     
     // XP LOGIC V8: 1000 base, increases by factor
     const xp = allTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.xp_value || 10), 0);
     let lvl = 1;
     let xpReq = 1000;
     let currentXp = xp;
     while (currentXp >= xpReq) {
         currentXp -= xpReq;
         lvl++;
         xpReq = Math.floor(xpReq * 1.5); // 1000 -> 1500 -> 2250...
     }
     
     if (lvl > level && level > 0) setShowLevelUp(true);
     setTotalXP(xp);
     setLevel(lvl);
  };

  useEffect(() => {
    fetchGlobalStats();
    const channel = supabase.channel('global_stats').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, fetchGlobalStats).subscribe();
    window.addEventListener('nova_tasks_update', fetchGlobalStats);
    return () => { supabase.removeChannel(channel); window.removeEventListener('nova_tasks_update', fetchGlobalStats); };
  }, [userId, level]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
  };

  const activeCategoryData = categories.find(c => c.id === activeView);
  const themeColor = activeCategoryData?.color || '#ffffff';

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden relative">
      <AnimatePresence>
         {showLevelUp && <LevelUpOverlay level={level} onClose={() => setShowLevelUp(false)} />}
      </AnimatePresence>

      {/* --- V8 BACKGROUND ENGINE --- */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-black z-0 pointer-events-none" />

      {/* --- SIDEBAR (Fixed) --- */}
      <motion.aside initial={{ x: -100 }} animate={{ x: 0 }} className="w-20 md:w-24 border-r border-white/5 bg-black/80 backdrop-blur-xl flex flex-col items-center py-8 z-50 h-full fixed left-0 top-0 overflow-y-auto custom-scrollbar">
        <div className="mb-8 text-center">
            <div className="text-white text-xl font-display font-bold">NOVA</div>
            <div className="text-red-500 text-[10px] tracking-widest font-mono">V8</div>
        </div>
        <nav className="flex flex-col gap-4 flex-1 w-full items-center">
          {categories.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`relative group p-3 rounded-xl transition-all duration-300 w-12 h-12 flex items-center justify-center ${activeView === item.id ? 'text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} style={{ color: activeView === item.id ? item.color : undefined }}>
              {item.icon}
              {activeView === item.id && <motion.div layoutId="active-pill" className="absolute left-[-8px] top-2 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: item.color }} />}
              <div className="absolute left-16 bg-black border border-white/10 px-2 py-1 rounded text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">{item.label}</div>
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* --- MAIN CONTENT (Scrollable) --- */}
      <main className="flex-1 flex flex-col relative z-10 ml-20 md:ml-24 h-full">
        {/* TOP BAR V8: Glowing Text & Profile Ring */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md sticky top-0 z-40 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow duration-500">
           <div className="flex items-center gap-3 group">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-mono tracking-[0.2em] text-white/50 group-hover:text-white group-hover:shadow-[0_0_10px_white] transition-all cursor-default">SYSTEM ONLINE</span>
           </div>
           
           <div className="flex items-center gap-6 relative">
              <div className="text-right hidden md:block">
                 <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">RANK: {level < 10 ? 'INITIATE' : 'HUNTER'}</div>
                 <div className="text-2xl font-display font-bold flex items-center justify-end gap-1" style={{ color: themeColor }}>
                    LVL {level}
                 </div>
              </div>
              
              {/* PROFILE RING V8 */}
              <div className="relative" onClick={() => setShowUserMenu(!showUserMenu)}>
                  <div 
                    className="w-12 h-12 rounded-full p-[2px] cursor-pointer hover:scale-110 transition-transform duration-300"
                    style={{ background: getLevelGradient(level), boxShadow: `0 0 15px ${themeColor}60` }}
                  >
                     <div className="w-full h-full rounded-full bg-black overflow-hidden">
                        <img src={userProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.username}`} alt="Profile" className="w-full h-full object-cover" />
                     </div>
                  </div>
                  
                  {/* LOGOUT PANEL */}
                  <AnimatePresence>
                      {showUserMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-14 right-0 w-48 bg-black border border-white/10 rounded-xl shadow-2xl p-2 z-50"
                          >
                              <div className="px-4 py-2 text-xs text-gray-500 font-mono border-b border-white/5 mb-2">{userProfile.email}</div>
                              <button onClick={() => setActiveView('PROFILE')} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors">EDIT IDENTITY</button>
                              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-900/20 rounded transition-colors">LOGOUT</button>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
           </div>
        </header>

        {/* DYNAMIC VIEW ROUTER */}
        <div className={`flex-1 relative ${activeView === 'ROADMAP' || activeView === 'ADVANCED' ? 'overflow-hidden p-0' : 'overflow-y-auto custom-scrollbar p-6 md:p-8'}`}>
          <AnimatePresence mode='wait'>
            <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className={`h-full ${activeView === 'ROADMAP' || activeView === 'ADVANCED' ? 'w-full' : 'max-w-7xl mx-auto'}`}>
              
              {activeView === 'HOME' && <HomeView userId={userId} onNavigate={setActiveView} username={userProfile.username} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              
              {/* SPLIT SCREEN VIEWS */}
              {activeView === 'FITNESS' && <FitnessView userId={userId} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              {activeView === 'BUSINESS' && <BusinessView userId={userId} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              {activeView === 'SKILLS' && <SkillsView userId={userId} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              {activeView === 'PROJECTS' && <ProjectsView userId={userId} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              
              {activeView === 'MISSION' && <MissionView userId={userId} onOpenQuest={() => setIsQuestModalOpen(true)} />}
              {activeView === 'ROADMAP' && <RoadmapEditor userId={userId} />}
              {activeView === 'AI' && <AIView userId={userId} profile={userProfile} tasks={globalTasks} />}
              {activeView === 'ANALYTICS' && <AnalyticsView tasks={globalTasks} level={level} xp={totalXP} onOpenAdvanced={() => setActiveView('ADVANCED')} />}
              {activeView === 'PROFILE' && <ProfileView userId={userId} profile={userProfile} setProfile={setUserProfile} level={level} />}
              
              {/* HABIT TRACKER (NEW) */}
              {activeView === 'HABIT' && <HabitTracker userId={userId} />}

              {/* ADVANCED MODE V8 */}
              {activeView === 'ADVANCED' && <AdvancedWorkspace userId={userId} onBack={() => setActiveView('HOME')} />}
              
              {DEFAULT_CATEGORIES.every(c => c.id !== activeView) && activeView !== 'ADVANCED' && <GenericCategoryView id={activeView} userId={userId} category={categories.find(c => c.id === activeView)} onOpenQuest={() => setIsQuestModalOpen(true)} />}
            
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {isQuestModalOpen && <QuestModal isOpen={isQuestModalOpen} onClose={() => setIsQuestModalOpen(false)} initialCategory={activeView} categories={categories} userId={userId} existingTasks={globalTasks} />}
      </AnimatePresence>
    </div>
  );
};

export default DashboardShell;
