
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TempleType, Task, UserProfile, Category, Complexity, Subtask } from '../../types';
import MirrorButton from '../UI/MirrorButton';
import { supabase } from '../../lib/supabaseClient';
import { audioManager } from '../../utils/audioManager';
import { useNotification } from '../UI/NotificationProvider';
import TaskCard from './TaskCard';
import { HellRadar, SoulOrbit, ActivityGrid, ChronoCircle, MomentumChart, CategoryDonut, DailyPulse, WinRate } from './AnalyticsComponents';
import { 
    analyzePhysiqueImage, generateRoadmapSuggestions, parseVoiceCommand, generatePlanOrBreakdown, 
    doctorHabit, getDecisionAdvice, generateRitual, runSkillArchitect, runWarRoomStrategy, runBioHack, runCodexWriter 
} from '../../services/aiAnalysis';
import RoadmapEditor from './RoadmapEditor';

/* ========================================================================== */
/*                                 VIEW SYSTEM V8                             */
/* ========================================================================== */

// --- MASSIVE ICON LIBRARY (V8 EXPANDED) ---
const createIcon = (d: string) => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;

export const ICON_DATA: Record<string, { icon: React.ReactNode; color: string; category: string; keywords: string[] }> = {
  // --- GENERAL ---
  DEFAULT: { icon: createIcon("M13 10V3L4 14h7v7l9-11h-7z"), color: '#ffffff', category: 'GENERAL', keywords: [] },
  STAR: { icon: createIcon("M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"), color: '#fbbf24', category: 'GENERAL', keywords: ['star', 'fame', 'shine', 'important'] },
  FIRE: { icon: createIcon("M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"), color: '#ef4444', category: 'GENERAL', keywords: ['fire', 'burn', 'hot', 'streak'] },
  
  // --- TECH / DEV ---
  CODE: { icon: createIcon("M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"), color: '#10b981', category: 'TECH', keywords: ['code', 'program', 'dev', 'script'] },
  TERMINAL: { icon: createIcon("M4 17l6-6-6-6m8 14h8"), color: '#10b981', category: 'TECH', keywords: ['terminal', 'bash', 'cmd', 'command'] },
  CPU: { icon: createIcon("M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"), color: '#0ea5e9', category: 'TECH', keywords: ['cpu', 'tech', 'compute', 'server'] },
  DATABASE: { icon: createIcon("M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"), color: '#f59e0b', category: 'TECH', keywords: ['db', 'data', 'sql', 'storage'] },
  CLOUD: { icon: createIcon("M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"), color: '#38bdf8', category: 'TECH', keywords: ['cloud', 'aws', 'upload', 'deploy'] },
  WIFI: { icon: createIcon("M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"), color: '#6366f1', category: 'TECH', keywords: ['wifi', 'net', 'connect', 'online'] },
  BUG: { icon: createIcon("M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 16H4m12 3.932l-.5-.866M6.5 19.932l.5-.866m11.414-7.5l2-2m-14.828 0l2 2m1.414 7.5l-2 2m14.828 0l-2-2M12 8c-2.21 0-4 1.79-4 4v4h8v-4c0-2.21-1.79-4-4-4z"), color: '#ef4444', category: 'TECH', keywords: ['bug', 'fix', 'error', 'debug'] },
  LOCK: { icon: createIcon("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"), color: '#f43f5e', category: 'TECH', keywords: ['lock', 'security', 'auth', 'private'] },
  ROBOT: { icon: createIcon("M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"), color: '#a855f7', category: 'TECH', keywords: ['ai', 'bot', 'gpt', 'auto'] }, // Reused CPU visually but different context

  // --- FITNESS / HEALTH ---
  BICEP: { icon: createIcon("M4 8V6a6 6 0 1112 0v2h1a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2v-8c0-1.1.9-2 2-2h1zm5 6.733c1.605 0 3.113.623 4.2 1.767A7.962 7.962 0 0118 18.681"), color: '#ef4444', category: 'FITNESS', keywords: ['gym', 'lift', 'workout', 'muscle'] },
  RUN: { icon: createIcon("M13 10V3L4 14h7v7l9-11h-7z"), color: '#f97316', category: 'FITNESS', keywords: ['run', 'cardio', 'jog', 'sprint'] }, // Bolt used for run
  HEART: { icon: createIcon("M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"), color: '#be123c', category: 'FITNESS', keywords: ['health', 'love', 'date', 'med'] },
  BRAIN: { icon: createIcon("M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"), color: '#ec4899', category: 'FITNESS', keywords: ['learn', 'study', 'read', 'think'] },
  PILL: { icon: createIcon("M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"), color: '#6366f1', category: 'FITNESS', keywords: ['meds', 'vitamin', 'supp', 'pill'] },
  WATER: { icon: createIcon("M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"), color: '#38bdf8', category: 'FITNESS', keywords: ['water', 'drink', 'hydrate', 'aqua'] },
  SLEEP: { icon: createIcon("M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"), color: '#818cf8', category: 'FITNESS', keywords: ['sleep', 'nap', 'rest', 'bed'] }, // Moon visual
  EYE: { icon: createIcon("M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"), color: '#22d3ee', category: 'FITNESS', keywords: ['focus', 'watch', 'monitor'] },
  // --- HABIT ---
  CYCLE: { icon: createIcon("M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"), color: '#ec4899', category: 'HABIT', keywords: ['habit', 'cycle', 'repeat', 'loop'] },

  // --- BUSINESS / WEALTH ---
  MONEY: { icon: createIcon("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"), color: '#22c55e', category: 'WEALTH', keywords: ['money', 'cash', 'pay', 'buy'] },
  BANK: { icon: createIcon("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"), color: '#fbbf24', category: 'WEALTH', keywords: ['bank', 'deposit', 'invest', 'stocks'] },
  BRIEFCASE: { icon: createIcon("M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"), color: '#a16207', category: 'WEALTH', keywords: ['work', 'job', 'client', 'business'] },
  CHART: { icon: createIcon("M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"), color: '#ef4444', category: 'WEALTH', keywords: ['chart', 'growth', 'stats', 'analytics'] },
  TARGET: { icon: createIcon("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"), color: '#f87171', category: 'WEALTH', keywords: ['goal', 'target', 'aim', 'focus'] },

  // --- LIFESTYLE ---
  HOME: { icon: createIcon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"), color: '#84cc16', category: 'LIFE', keywords: ['home', 'clean', 'house', 'rent'] },
  CAR: { icon: createIcon("M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"), color: '#f43f5e', category: 'LIFE', keywords: ['car', 'drive', 'travel', 'fix'] },
  PLANE: { icon: createIcon("M12 19l9 2-9-18-9 18 9-2zm0 0v-8"), color: '#3b82f6', category: 'LIFE', keywords: ['fly', 'flight', 'trip', 'vacation'] },
  CART: { icon: createIcon("M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"), color: '#fcd34d', category: 'LIFE', keywords: ['shop', 'buy', 'groceries', 'store'] },
  BOOK: { icon: createIcon("M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"), color: '#8b5cf6', category: 'LIFE', keywords: ['book', 'read', 'novel', 'study'] },
  MAIL: { icon: createIcon("M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"), color: '#fbbf24', category: 'LIFE', keywords: ['email', 'mail', 'send', 'inbox'] },
  PHONE: { icon: createIcon("M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"), color: '#10b981', category: 'LIFE', keywords: ['call', 'phone', 'mom', 'contact'] },
  CAMERA: { icon: createIcon("M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"), color: '#f472b6', category: 'LIFE', keywords: ['photo', 'pic', 'video', 'record'] },
  MUSIC: { icon: createIcon("M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"), color: '#c084fc', category: 'LIFE', keywords: ['music', 'listen', 'song', 'playlist'] },
  
  // --- WAR / COMBAT ---
  SWORD: { icon: createIcon("M13 10V3L4 14h7v7l9-11h-7z M6 18L18 6 M6 6l12 12"), color: '#ef4444', category: 'WAR', keywords: ['fight', 'attack', 'kill', 'war'] },
  SHIELD: { icon: createIcon("M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"), color: '#60a5fa', category: 'WAR', keywords: ['defend', 'guard', 'secure', 'protect'] },
  SKULL: { icon: createIcon("M12 14l9-5-9-5-9 5 9 5z"), color: '#9ca3af', category: 'WAR', keywords: ['dead', 'death', 'danger', 'toxic'] },
  FLAG: { icon: createIcon("M3 21v-8a2 2 0 01-2-2H5a2 2 0 012-2h6a2 2 0 012 2v2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2h-6a2 2 0 01-2-2v-2a2 2 0 01-2-2h-2a2 2 0 01-2 2"), color: '#ef4444', category: 'WAR', keywords: ['capture', 'flag', 'milestone', 'win'] },
};

export const CATEGORY_ICONS_MAP: Record<string, React.ReactNode> = Object.keys(ICON_DATA).reduce((acc, key) => { acc[key] = ICON_DATA[key].icon; return acc; }, {} as Record<string, React.ReactNode>);

// --- AUTO ICON ASSIGNER ---
const getAutoIcon = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    for (const [key, data] of Object.entries(ICON_DATA)) {
        if (data.keywords.some(k => lowerTitle.includes(k))) {
            return key;
        }
    }
    return 'DEFAULT';
};

// --- COMMON HEADER ---
export const SectionHeader = ({ title, subtitle, color }: { title: string, subtitle?: string, color: string }) => (
  <div className="relative mb-8 p-8 rounded-3xl bg-black/40 border border-white/5 overflow-hidden flex flex-col items-center justify-center text-center group transition-colors duration-500 hover:border-white/10" style={{ borderColor: `${color}20` }}>
    <div className="absolute top-0 left-0 w-full h-1 shadow-[0_0_20px_currentColor]" style={{ backgroundColor: color, color: color }} />
    <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-2 relative z-10 overflow-hidden py-2 drop-shadow-2xl">
      <span className="relative z-10">{title}</span>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-all duration-1000 ease-in-out pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    </motion.h1>
    {subtitle && <p className="text-white/40 font-mono tracking-[0.3em] text-xs uppercase">{subtitle}</p>}
  </div>
);

// --- ACTIVE PROTOCOLS (TASK LIST - REALTIME) ---
const ActiveProtocols = ({ category, onOpenQuest, accentColor, userId, compact = false }: any) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recognitionRef = useRef<any>(null);

  // Initial Fetch & Local Storage Merge
  const fetchTasks = async () => {
      let remoteTasks: Task[] = [];
      try {
        let query = supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (category !== 'HOME') query = query.eq('temple_id', category);
        const { data } = await query;
        if (data) remoteTasks = data as Task[];
      } catch (e) {}
      
      let localTasks: Task[] = [];
      try {
        const stored = localStorage.getItem(`nova_local_tasks_${userId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            localTasks = category === 'HOME' ? parsed : parsed.filter((t: Task) => t.temple_id === category);
        }
      } catch (e) {}
      
      // Dedupe by ID, favoring remote if collision (usually remote is newer/synced)
      const taskMap = new Map();
      [...remoteTasks, ...localTasks].forEach(t => taskMap.set(t.id, t));
      const combined = Array.from(taskMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTasks(combined);
  };

  useEffect(() => {
    fetchTasks();

    // REALTIME SUBSCRIPTION V8
    const channel = supabase
      .channel(`tasks_realtime_${userId}_${category}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`, // Filter by user to reduce noise
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // Only add if it matches current category filter (or if HOME which shows all)
            if (category === 'HOME' || newTask.temple_id === category) {
               setTasks((prev) => [newTask, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks((prev) => {
                // Check if it still belongs in this view
                if (category !== 'HOME' && updatedTask.temple_id !== category) {
                    return prev.filter(t => t.id !== updatedTask.id);
                }
                return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
            });
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Listen for local events (from QuestModal or other components using local fallback)
    window.addEventListener('nova_tasks_update', fetchTasks);
    
    return () => { 
        supabase.removeChannel(channel); 
        window.removeEventListener('nova_tasks_update', fetchTasks); 
    };
  }, [category, userId]);

  return (
    <div className="mt-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
         <h3 className="text-xl font-display font-bold text-white tracking-wide flex items-center gap-3">
             <span className="w-1 h-6 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: accentColor, color: accentColor }} />
             Protocols
         </h3>
         <div className="flex items-center gap-2">
             {onOpenQuest && (
                <button onClick={onOpenQuest} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg group border border-white/10 hover:bg-white/5">
                    <span className="text-lg font-bold" style={{ color: accentColor }}>+</span>
                </button>
             )}
         </div>
      </div>

      <div className={`space-y-3 overflow-y-auto custom-scrollbar ${compact ? 'max-h-[60vh]' : ''}`}>
          {tasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl opacity-50">
                  <div className="text-2xl mb-2 grayscale" style={{ color: accentColor }}>◈</div>
                  <p className="font-mono text-[10px]">NO DIRECTIVES</p>
              </div>
          ) : (
              tasks.map(task => <TaskCard key={task.id} task={task} accentColor={accentColor} onUpdate={fetchTasks} />)
          )}
      </div>
    </div>
  );
};

// --- SPLIT LAYOUT COMPONENT ---
const SplitLayout = ({ title, subtitle, color, userId, category, onOpenQuest }: any) => (
    <div className="h-full flex flex-col">
        <SectionHeader title={title} subtitle={subtitle} color={color} />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
            {/* LEFT: Tasks */}
            <div className="bg-black/20 border border-white/5 rounded-3xl p-6 flex flex-col">
                <ActiveProtocols category={category} onOpenQuest={onOpenQuest} accentColor={color} userId={userId} compact={true} />
            </div>
            {/* RIGHT: Mini Roadmap */}
            <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden relative min-h-[400px]">
                <div className="absolute top-4 left-4 z-10 bg-black/60 px-3 py-1 rounded text-[10px] font-mono border border-white/10 text-gray-400">
                    {category} ROADMAP
                </div>
                <RoadmapEditor userId={userId} /> 
            </div>
        </div>
    </div>
);

// --- CATEGORY VIEWS ---
export const FitnessView = ({ userId, onOpenQuest }: any) => (<SplitLayout title="FITNESS" subtitle="Physical Reconstruction" color="#ef4444" userId={userId} category="FITNESS" onOpenQuest={onOpenQuest} />);
export const SkillsView = ({ userId, onOpenQuest }: any) => (<SplitLayout title="SKILLS" subtitle="Neural Expansion" color="#3b82f6" userId={userId} category="SKILLS" onOpenQuest={onOpenQuest} />);
export const BusinessView = ({ userId, onOpenQuest }: any) => (<SplitLayout title="BUSINESS MONITORING" subtitle="Resource Acquisition" color="#eab308" userId={userId} category="BUSINESS" onOpenQuest={onOpenQuest} />);
export const ProjectsView = ({ userId, onOpenQuest }: any) => (<SplitLayout title="PROJECTS SECTION" subtitle="Grand Architecture" color="#84cc16" userId={userId} category="PROJECTS" onOpenQuest={onOpenQuest} />);
export const MissionView = ({ userId, onOpenQuest }: any) => (
    <div className="space-y-8">
        <SectionHeader title="TASK LISTS" subtitle="Daily Execution" color="#6366f1" />
        <ActiveProtocols category="MISSION" onOpenQuest={onOpenQuest} accentColor="#6366f1" userId={userId} />
    </div>
);

export const HomeView = ({ userId, onNavigate, username, onOpenQuest }: { userId: string, onNavigate: (view: any) => void, username: string, onOpenQuest: () => void }) => {
    return (
        <div className="space-y-8">
            <div className="relative p-8 rounded-3xl bg-gradient-to-r from-gray-900 to-black border border-white/10 overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] group-hover:bg-red-900/20 transition-colors duration-1000" />
                 <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 relative z-10">
                    WELCOME BACK, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{username}</span>
                 </h1>
                 <p className="text-gray-400 font-mono text-xs tracking-widest relative z-10 mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                    SYSTEM STATUS: OPTIMAL // READY FOR DIRECTIVES
                 </p>
                 <div className="flex gap-4 relative z-10">
                    <MirrorButton text="INITIATE PROTOCOL" onClick={onOpenQuest} />
                    <MirrorButton text="VIEW ANALYTICS" variant="ghost" onClick={() => onNavigate('ANALYTICS')} />
                    <MirrorButton 
                        text="ADVANCED OPERATIONS" 
                        variant="brand" 
                        onClick={() => onNavigate('ADVANCED')}
                        className="bg-gradient-to-r from-red-900 via-red-600 to-black hover:bg-gradient-to-l border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse-fast rounded-xl"
                        reflectionColor="from-transparent via-white/20 to-transparent"
                    />
                 </div>
            </div>
            <ActiveProtocols category="HOME" onOpenQuest={onOpenQuest} accentColor="#ffffff" userId={userId} />
        </div>
    );
};

// ... (Rest of file unchanged: AnalyticsView, ProfileView, AIView, etc.)
export const AnalyticsView = ({ tasks, level, xp, onOpenAdvanced }: { tasks: Task[], level: number, xp: number, onOpenAdvanced?: () => void }) => {
    let xpReq = 1000;
    for(let i=1; i<level; i++) xpReq = Math.floor(xpReq * 1.5);
    const progress = Math.min(100, (xp / xpReq) * 100);

    return (
      <div className="space-y-8 pb-20">
        <SectionHeader title="NEURAL ANALYTICS" subtitle="Performance Metrics" color="#14b8a6" />
        
        <div className="bg-[#050505] p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
            <h2 className="text-4xl font-display font-bold text-white mb-2">LEVEL {level}</h2>
            <p className="text-gray-500 font-mono text-xs mb-4">{xp} / {xpReq} XP TO NEXT EVOLUTION</p>
            <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 shadow-[0_0_20px_rgba(20,184,166,0.5)]" />
            </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['EARLY RISER', 'TASK MASTER', 'DEEP WORK', 'STREAK GOD'].map((award, i) => (
                <div key={award} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${i < 2 ? 'bg-teal-900/20 border-teal-500/50' : 'bg-black border-white/5 opacity-50'}`}>
                    <div className="text-2xl">{i < 2 ? '🏆' : '🔒'}</div>
                    <span className="text-[10px] font-mono tracking-widest">{award}</span>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#050505] p-6 rounded-3xl border border-white/10 flex items-center justify-center">
                <HellRadar stats={[{ label: 'BODY', value: 75, max: 100 }, { label: 'MIND', value: 60, max: 100 }, { label: 'WEALTH', value: 40, max: 100 }, { label: 'SOUL', value: 90, max: 100 }, { label: 'FOCUS', value: 70, max: 100 }]} />
            </div>
            <ActivityGrid tasks={tasks} />
            <WinRate tasks={tasks} />
            <MomentumChart tasks={tasks} />
        </div>
      </div>
    );
};

export const ProfileView = ({ userId, profile, setProfile, level }: any) => {
    const { addToast } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [localProfile, setLocalProfile] = useState(profile);
    const [apiKey, setApiKey] = useState(localStorage.getItem(`nova_gemini_key_${userId}`) || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PERSISTENCE FIX: Ensure state matches storage on load/user change
    useEffect(() => {
        const storedKey = localStorage.getItem(`nova_gemini_key_${userId}`);
        if (storedKey) setApiKey(storedKey);
    }, [userId]);

    const handleSave = async () => {
        // SAVE KEY FIRST
        localStorage.setItem(`nova_gemini_key_${userId}`, apiKey);
        
        const { error } = await supabase.from('profiles').upsert(localProfile);
        if (error) {
            addToast("PROFILE SYNC FAILED", "error");
        } else {
            setProfile(localProfile);
            localStorage.setItem(`nova_profile_${userId}`, JSON.stringify(localProfile));
            addToast("IDENTITY & KEY UPDATED", "success");
            window.dispatchEvent(new Event('nova_profile_update'));
            setIsEditing(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        addToast("UPLOADING AVATAR...", "info");
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const updatedProfile = { ...localProfile, avatar_url: data.publicUrl };
            setLocalProfile(updatedProfile);
            setProfile(updatedProfile);
            await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
            window.dispatchEvent(new Event('nova_profile_update'));
            addToast("VISUAL SIGNATURE UPDATED", "success");
        } catch (error) {
            console.error(error);
            addToast("UPLOAD FAILED - STORAGE BUCKET ERROR?", "error");
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader title="IDENTITY" subtitle={`OPERATIVE LEVEL ${level}`} color="#22c55e" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative group">
                    <div 
                        className="w-40 h-40 rounded-full border-4 border-green-500/50 overflow-hidden mb-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] relative cursor-pointer group-hover:border-green-400 transition-colors"
                        onClick={() => isEditing && fileInputRef.current?.click()}
                    >
                        <img src={localProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localProfile.username}`} className="w-full h-full object-cover" alt="Profile" />
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-mono text-white">UPLOAD</span>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />

                    <h2 className="text-2xl font-display font-bold text-white tracking-widest">{localProfile.username}</h2>
                    <p className="text-green-500 font-mono text-xs mt-1">RANK: {level > 10 ? 'ELITE HUNTER' : 'INITIATE'}</p>
                </div>
                <div className="md:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4">
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="text-xs font-mono text-green-500 hover:text-white transition-colors">[EDIT PROTOCOLS]</button>
                        ) : (
                            <div className="flex gap-4">
                                <button onClick={() => setIsEditing(false)} className="text-xs font-mono text-red-500 hover:text-white transition-colors">[CANCEL]</button>
                                <button onClick={handleSave} className="text-xs font-mono text-green-500 hover:text-white transition-colors">[SAVE]</button>
                            </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-6 mt-4">
                        <div className="col-span-2 border-b border-white/10 pb-4 mb-4 bg-green-900/10 p-4 rounded-xl">
                            <label className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-2 block">Google Gemini API Key (Required for NOVAI)</label>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs" />
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-green-400 underline flex items-center gap-1">
                                        <span>GET FREE KEY</span> <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            ) : (
                                <div className="text-xs font-mono text-gray-400">{apiKey ? '••••••••••••••••' : 'NO KEY DETECTED - SYSTEM LIMITS ACTIVE'}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gray-500 uppercase">Codename</label>
                            {isEditing ? <input value={localProfile.username} onChange={e => setLocalProfile({...localProfile, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-display" /> : <div className="text-xl text-white font-display">{localProfile.username}</div>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gray-500 uppercase">Bio / Mantra</label>
                             {isEditing ? <textarea value={localProfile.bio} onChange={e => setLocalProfile({...localProfile, bio: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono h-20" /> : <div className="text-sm text-gray-300 font-mono italic">"{localProfile.bio}"</div>}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export const AIView = ({ userId, profile, tasks }: { userId: string, profile: UserProfile, tasks: Task[] }) => {
    const { addToast } = useNotification();
    const [apiKey, setApiKey] = useState(localStorage.getItem(`nova_gemini_key_${userId}`) || '');
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    // Ensure key state is synced
    useEffect(() => {
        const handleProfileUpdate = () => {
            const key = localStorage.getItem(`nova_gemini_key_${userId}`);
            if (key) setApiKey(key);
        };
        window.addEventListener('nova_profile_update', handleProfileUpdate);
        
        // Initial Check
        const initialKey = localStorage.getItem(`nova_gemini_key_${userId}`);
        if(initialKey) setApiKey(initialKey);

        return () => window.removeEventListener('nova_profile_update', handleProfileUpdate);
    }, [userId]);

    const handleDirectKeySave = () => {
        if(input.startsWith('AI')) { // Simple check for Gemini keys often starting with AI
            localStorage.setItem(`nova_gemini_key_${userId}`, input);
            setApiKey(input);
            setInput("");
            window.dispatchEvent(new Event('nova_profile_update'));
            addToast("NEURAL LINK ESTABLISHED", "success");
        } else {
            addToast("INVALID KEY FORMAT", "error");
        }
    };

    const MODULES = [
        { id: 'WAR_ROOM', label: 'WAR ROOM', icon: '⚔️', desc: 'Tactical Business & Life Strategy', action: runWarRoomStrategy },
        { id: 'BIO_HACK', label: 'BIO-LAB', icon: '🧬', desc: 'Health, Sleep & Supplement Optimization', action: runBioHack },
        { id: 'SKILL_ARC', label: 'SKILL ARCHITECT', icon: '📐', desc: 'Deep Learning Path Generation', action: runSkillArchitect },
        { id: 'CODEX', label: 'CODEX WRITER', icon: '✒️', desc: 'Manifesto & Content Generation', action: runCodexWriter },
        { id: 'HABIT', label: 'HABIT DOCTOR', icon: '🩺', desc: 'Fix Broken Routines', action: doctorHabit },
        { id: 'DECISION', label: 'DECISION ENGINE', icon: '⚖️', desc: 'Binary Choice Resolution', action: getDecisionAdvice },
        { id: 'RITUAL', label: 'RITUAL FORGE', icon: '🕯️', desc: 'Morning/Night Routine Design', action: async (i: string, k?: string) => JSON.stringify(await generateRitual(i, k), null, 2) },
        { id: 'PHYSIQUE', label: 'VISUAL DIAGNOSTICS', icon: '📷', desc: 'Upload Body Photos for Analysis', action: analyzePhysiqueImage },
        { id: 'ROADMAP', label: 'ROADMAP OPTIMIZER', icon: '🗺️', desc: 'Analyze Current Tasks', action: async (_: string, k?: string) => await generateRoadmapSuggestions(tasks, k) },
    ];

    const executeModule = async () => {
        if(!apiKey) { addToast("API KEY REQUIRED", "error"); return; }
        // Input validation skip for specific modules
        if(!input && activeModule !== 'ROADMAP' && activeModule !== 'PHYSIQUE') { addToast("INPUT REQUIRED", "warning"); return; }
        
        setLoading(true);
        const module = MODULES.find(m => m.id === activeModule);
        if(module) {
            try {
                // Pass key explicitly to override default env check if needed
                const res = await module.action(input, apiKey);
                setOutput(res);
                audioManager.playSfx('LEVEL_UP');
            } catch (e: any) {
                setOutput(`ERROR: ${e.message || "Unknown Failure"}`);
                addToast("EXECUTION FAILED", "error");
            }
        }
        setLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInput(reader.result as string);
                addToast("IMAGE LOADED", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 h-full flex flex-col relative">
            <SectionHeader title="NOVAI" subtitle="Neural Intelligence Core" color="#8b5cf6" />
            {!apiKey ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 border border-white/5 rounded-3xl">
                    <div className="text-4xl mb-4 grayscale opacity-50">🔒</div>
                    <h3 className="text-xl font-display font-bold text-gray-300">ACCESS DENIED</h3>
                    <p className="text-xs font-mono text-gray-500 mt-2 max-w-md mb-6">Neural Link Severed. Inject Google Gemini API Key to unlock.</p>
                    <div className="flex gap-2 w-full max-w-sm">
                        <input placeholder="PASTE KEY HERE..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-white outline-none focus:border-violet-500" />
                        <button onClick={handleDirectKeySave} className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-xs font-bold font-display">UNLOCK</button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                    <div className="w-full lg:w-1/3 grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar p-2">
                        {MODULES.map(m => (
                            <button key={m.id} onClick={() => { setActiveModule(m.id); setOutput(""); setInput(""); }} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${activeModule === m.id ? 'bg-violet-900/30 border-violet-500 text-white shadow-[0_0_15px_#8b5cf6]' : 'bg-black/40 border-white/5 text-gray-500 hover:bg-white/5 hover:text-white'}`}>
                                <div className="text-2xl">{m.icon}</div>
                                <span className="text-[10px] font-bold tracking-widest text-center">{m.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                        {activeModule ? (
                            <>
                                <div className="mb-4">
                                    <h3 className="text-lg font-display font-bold text-violet-400">{MODULES.find(m => m.id === activeModule)?.label}</h3>
                                    <p className="text-[10px] font-mono text-gray-500">{MODULES.find(m => m.id === activeModule)?.desc}</p>
                                </div>
                                {activeModule === 'PHYSIQUE' ? (
                                    <div className="mb-4">
                                         <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleImageUpload} />
                                         <MirrorButton text="UPLOAD DATA (IMAGE)" onClick={() => fileRef.current?.click()} className="w-full mb-2" variant="ghost" />
                                         {input && <div className="text-[10px] text-green-500 font-mono">IMAGE DATA READY FOR ANALYSIS</div>}
                                    </div>
                                ) : activeModule !== 'ROADMAP' && (
                                    <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="ENTER PARAMETERS..." className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-white mb-4 outline-none focus:border-violet-500 resize-none" />
                                )}
                                <div className="flex justify-end mb-4">
                                    <MirrorButton text={loading ? "COMPUTING..." : "EXECUTE"} onClick={executeModule} disabled={loading} className="!py-2 !px-6 border-violet-500/30" />
                                </div>
                                <div className="flex-1 bg-black rounded-xl p-4 border border-white/5 overflow-y-auto custom-scrollbar font-mono text-xs text-green-400/80 whitespace-pre-wrap">
                                    {loading ? (
                                        <div className="flex items-center gap-2 animate-pulse text-violet-400">
                                            <span className="w-2 h-2 bg-violet-500 rounded-full"/>
                                            NEURAL NETWORK COMPUTING...
                                        </div>
                                    ) : output || "AWAITING INPUT..."}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-xs">SELECT A MODULE TO BEGIN</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const GenericCategoryView = ({ id, userId, category, onOpenQuest }: { id: string, userId: string, category?: Category, onOpenQuest: () => void }) => (
    <div>
        <SectionHeader title={category?.label?.toUpperCase() || id} subtitle="Custom Protocol" color={category?.color || '#ffffff'} />
        <ActiveProtocols category={id} onOpenQuest={onOpenQuest} accentColor={category?.color || '#ffffff'} userId={userId} />
    </div>
);

export const QuestModal = ({ isOpen, onClose, initialCategory, categories, userId, existingTasks, initialData }: any) => {
  const { addToast } = useNotification();
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'HOME');
  const [xp, setXp] = useState(10);
  const [selectedIcon, setSelectedIcon] = useState('DEFAULT');
  const [tab, setTab] = useState<'DETAILS' | 'ICON'>('DETAILS');
  
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTitle(val);
      // Auto Assign Icon
      const autoIcon = getAutoIcon(val);
      if (autoIcon !== 'DEFAULT') setSelectedIcon(autoIcon);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
       addToast("DIRECTIVE EMPTY", "error");
       return;
    }
    
    const newTask = {
        title: title.toUpperCase(),
        temple_id: selectedCategory,
        xp_value: xp,
        user_id: userId,
        completed: false,
        created_at: new Date().toISOString(),
        icon_key: selectedIcon,
        ...initialData
    };

    try {
        const { error } = await supabase.from('tasks').insert(newTask);
        if (error) throw error;
        audioManager.playSfx('LEVEL_UP');
        addToast("PROTOCOL INITIATED", "success");
        onClose();
        setTitle('');
    } catch (e) {
        console.warn("Using local storage fallback", e);
        const key = `nova_local_tasks_${userId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const localTask = { ...newTask, id: `local-${Date.now()}` };
        localStorage.setItem(key, JSON.stringify([localTask, ...stored]));
        window.dispatchEvent(new Event('nova_tasks_update'));
        audioManager.playSfx('LEVEL_UP');
        addToast("PROTOCOL INITIATED (LOCAL)", "warning");
        onClose();
        setTitle('');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-black border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />
        
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-white tracking-wide">NEW DIRECTIVE</h2>
            <div className="flex gap-2">
                <button onClick={() => setTab('DETAILS')} className={`px-3 py-1 rounded text-[10px] font-mono ${tab === 'DETAILS' ? 'bg-white text-black' : 'bg-white/10 text-gray-400'}`}>DETAILS</button>
                <button onClick={() => setTab('ICON')} className={`px-3 py-1 rounded text-[10px] font-mono ${tab === 'ICON' ? 'bg-white text-black' : 'bg-white/10 text-gray-400'}`}>ICON</button>
            </div>
        </div>
        
        {tab === 'DETAILS' ? (
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Objective</label>
                    <input 
                      autoFocus
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="ENTER TASK NAME..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:border-white/30 outline-none font-display tracking-wide"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Category</label>
                        <select 
                          value={selectedCategory} 
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-xs font-mono appearance-none bg-black"
                        >
                            {categories && categories.length > 0 ? categories.map((c: any) => (
                                <option key={c.id} value={c.id} className="bg-black text-white">{c.label}</option>
                            )) : (
                                 ['HOME', 'FITNESS', 'SKILLS', 'BUSINESS', 'MISSION', 'PROJECTS', 'HABIT'].map(c => (
                                     <option key={c} value={c} className="bg-black text-white">{c}</option>
                                 ))
                            )}
                            <option value="ROADMAP" className="bg-black text-white">ROADMAP</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">XP Value</label>
                        <div className="flex items-center gap-2">
                            {[10, 30, 50].map(val => (
                                <button 
                                  key={val}
                                  onClick={() => setXp(val)}
                                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-colors ${xp === val ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'}`}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                <h4 className="text-[10px] font-mono text-gray-500 mb-4 uppercase">SELECT VISUAL SIGNATURE</h4>
                <div className="grid grid-cols-5 gap-3">
                    {Object.entries(ICON_DATA).map(([key, data]) => (
                        <button 
                            key={key}
                            onClick={() => setSelectedIcon(key)}
                            className={`aspect-square rounded-xl flex items-center justify-center transition-all ${selectedIcon === key ? 'bg-white/20 border border-white scale-110' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}
                            style={{ color: selectedIcon === key ? '#fff' : data.color }}
                        >
                            {data.icon}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex gap-4 pt-6 mt-auto border-t border-white/10">
            <MirrorButton text="ABORT" variant="ghost" onClick={onClose} className="flex-1" />
            <MirrorButton text="INITIATE" variant="primary" onClick={handleSubmit} className="flex-1" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export const BloodWave = () => <div/>;
