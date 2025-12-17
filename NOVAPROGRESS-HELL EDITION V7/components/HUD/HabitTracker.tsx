
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { audioManager } from '../../utils/audioManager';
import MirrorButton from '../UI/MirrorButton';
import { useNotification } from '../UI/NotificationProvider';
import { SectionHeader } from './Views';

interface HabitTrackerProps {
  userId: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const PINK_ACCENT = '#ec4899'; // Habits theme

const HabitTracker: React.FC<HabitTrackerProps> = ({ userId }) => {
  const { addToast } = useNotification();
  const [habits, setHabits] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Habit Form
  const [newTitle, setNewTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);

  // Pagination / Weeks state
  // [0] = Current Week. [1] = Next Week (future).
  // Ideally, if user wants history, we would prepend. But request asked for "+ button in last".
  // Let's assume standard behavior: showing history + current + future planning.
  // Starting with 0 (current).
  const [weeks, setWeeks] = useState<number[]>([0]);

  const fetchHabits = async () => {
      let remoteHabits: Task[] = [];
      try {
          const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('temple_id', 'HABIT');
          if (data) remoteHabits = data as Task[];
      } catch(e) {}

      try {
          const stored = JSON.parse(localStorage.getItem(`nova_local_tasks_${userId}`) || '[]');
          const localHabits = stored.filter((t:Task) => t.temple_id === 'HABIT');
          const map = new Map();
          [...remoteHabits, ...localHabits].forEach(t => map.set(t.id, t));
          setHabits(Array.from(map.values()));
      } catch(e) {}
      setLoading(false);
  };

  useEffect(() => {
      fetchHabits();
      const channel = supabase.channel('habit_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, fetchHabits)
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const createHabit = async () => {
      if (!newTitle.trim()) { addToast("NAME REQUIRED", "error"); return; }
      
      const newHabitPayload: Partial<Task> = {
          title: newTitle.toUpperCase(),
          temple_id: 'HABIT',
          xp_value: 10,
          user_id: userId,
          completed: false, 
          habit_frequency: selectedDays,
          habit_history: {}, 
          streak_current: 0,
          streak_best: 0,
          created_at: new Date().toISOString() 
      };

      try {
          const { data, error } = await supabase.from('tasks').insert(newHabitPayload).select().single();
          if (error) throw error;
          if (data) setHabits(prev => [data as Task, ...prev]);
          addToast("HABIT PROTOCOL INITIATED", "success");
      } catch (e) {
          const key = `nova_local_tasks_${userId}`;
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          const local = { ...newHabitPayload, id: `local-${Date.now()}` };
          localStorage.setItem(key, JSON.stringify([local, ...stored]));
          setHabits(prev => [local as Task, ...prev]);
          addToast("HABIT STORED LOCALLY", "warning");
      }
      setIsModalOpen(false);
      setNewTitle('');
      audioManager.playSfx('LEVEL_UP');
  };

  // Generate 7 Dates for a given week offset (0 = current week)
  const getWeekDates = (offset: number) => {
      const dates = [];
      const today = new Date();
      // Calculate start of "Current Week" (Monday)
      const day = today.getDay(); 
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
      const currentMonday = new Date(today.setDate(diff));
      
      // Apply offset weeks
      const targetMonday = new Date(currentMonday);
      targetMonday.setDate(currentMonday.getDate() + (offset * 7));

      for(let i=0; i<7; i++) {
          const d = new Date(targetMonday);
          d.setDate(targetMonday.getDate() + i);
          dates.push(d);
      }
      return dates;
  };

  const toggleDay = async (habit: Task, dateStr: string) => {
      const history = habit.habit_history || {};
      const wasCompleted = history[dateStr];
      const newHistory = { ...history, [dateStr]: !wasCompleted };
      
      // Calculate Streaks
      let currentStreak = 0;
      let d = new Date();
      // Iterate backwards from today to find contiguous streak
      while (true) {
          const iso = d.toISOString().split('T')[0];
          // If checking today and it's not done yet, don't break streak if yesterday was done
          // But here, we are just counting what is marked.
          // Simple logic: consecutive days marked true ending at Today or Yesterday.
          if (newHistory[iso]) {
              currentStreak++;
              d.setDate(d.getDate() - 1);
          } else {
              // If today is not done, check if yesterday was done to keep streak alive?
              // For simplicity, strict streak: needs continuous days up to today/yesterday.
              // We will just count standard continuous true from now backwards.
              // If today is false, check yesterday.
              if (iso === new Date().toISOString().split('T')[0] && !newHistory[iso]) {
                  d.setDate(d.getDate() - 1);
                  continue;
              }
              break; 
          }
          if (currentStreak > 365) break; 
      }

      const updates = { 
          habit_history: newHistory,
          streak_current: currentStreak,
          streak_best: Math.max(habit.streak_best || 0, currentStreak)
      };

      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, ...updates } : h));
      if (!wasCompleted) audioManager.playSfx('LEVEL_UP');

      try {
          if (habit.id.startsWith('local-')) throw new Error("Local");
          await supabase.from('tasks').update(updates).eq('id', habit.id);
      } catch (e) {
          const key = `nova_local_tasks_${userId}`;
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = stored.map((t:Task) => t.id === habit.id ? { ...t, ...updates } : t);
          localStorage.setItem(key, JSON.stringify(updated));
      }
  };

  const handleAddWeek = () => {
      const lastWeek = weeks[weeks.length - 1];
      setWeeks(prev => [...prev, lastWeek + 1]);
  };

  // --- ANALYTICS CALCULATIONS ---
  const calculateCompletionRate = () => {
      if (habits.length === 0) return 0;
      let totalOpportunities = 0;
      let totalCompleted = 0;
      const today = new Date();
      
      // Calculate across all habits history
      habits.forEach(h => {
          const history = h.habit_history || {};
          // Only count tracked days roughly from creation
          const created = new Date(h.created_at);
          const daysExist = Math.floor((today.getTime() - created.getTime()) / (1000 * 3600 * 24)) + 1;
          
          // Simple: Total True / (Days since creation * frequency match?)
          // Simpler: Just count all 'true' entries vs total days tracked in UI? 
          // Let's use total 'true' entries / total days since creation
          const completedCount = Object.values(history).filter(Boolean).length;
          totalCompleted += completedCount;
          totalOpportunities += Math.max(1, daysExist);
      });
      
      return Math.round((totalCompleted / totalOpportunities) * 100) || 0;
  };

  const calculateConsistencyWave = () => {
      // Return percentage per day of week (Mon-Sun)
      const dayCounts = [0,0,0,0,0,0,0]; // Mon=0
      let totalEntries = 0;
      
      habits.forEach(h => {
          Object.entries(h.habit_history || {}).forEach(([dateStr, done]) => {
              if (done) {
                  const d = new Date(dateStr);
                  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0, Sun=6
                  if (dayIdx >= 0 && dayIdx <= 6) dayCounts[dayIdx]++;
                  totalEntries++;
              }
          });
      });
      
      if (totalEntries === 0) return [0,0,0,0,0,0,0];
      const max = Math.max(...dayCounts) || 1;
      return dayCounts.map(c => Math.round((c / max) * 100));
  };

  const topStreak = Math.max(...habits.map(h => h.streak_current || 0), 0);
  const completionRate = calculateCompletionRate();
  const consistencyData = calculateConsistencyWave();

  return (
    <div className="space-y-8 pb-32">
        <SectionHeader title="HABIT TRACKER" subtitle="Consistency Protocol" color={PINK_ACCENT} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: MAIN TRACKER (Horizontal Scroll) */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-display font-bold text-white">ACTIVE PROTOCOLS</h3>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-pink-900/30 border border-pink-500/50 rounded-xl hover:bg-pink-900/50 text-pink-300 font-mono text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        + NEW HABIT
                    </button>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                    <div className="flex overflow-x-auto custom-scrollbar pb-4 gap-8">
                        {/* Render Column for Names + Streak (Sticky-ish visually if we split, but for now simple scroll) */}
                        
                        {weeks.map((offset, wIdx) => {
                            const currentWeekDates = getWeekDates(offset);
                            return (
                                <div key={offset} className="min-w-[600px] border-r border-white/5 pr-8 last:border-0 last:pr-0">
                                    <div className="text-[10px] font-mono text-gray-500 mb-4 uppercase tracking-widest">
                                        WEEK OFFSET {offset}
                                    </div>
                                    <div className="grid grid-cols-[150px_repeat(7,1fr)_60px] gap-2 items-center mb-4 border-b border-white/10 pb-2">
                                        <div className="text-[10px] text-gray-600">PROTOCOL</div>
                                        {currentWeekDates.map((d, i) => (
                                            <div key={i} className="text-center">
                                                <div className={`text-[10px] font-bold ${d.toDateString() === new Date().toDateString() ? 'text-pink-500' : 'text-gray-500'}`}>{DAYS[i]}</div>
                                                <div className="text-[9px] text-gray-600">{d.getDate()}</div>
                                            </div>
                                        ))}
                                        <div className="text-[10px] text-gray-600 text-center">STRK</div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {habits.map(habit => (
                                            <div key={`${habit.id}-${offset}`} className="grid grid-cols-[150px_repeat(7,1fr)_60px] gap-2 items-center p-2 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="truncate text-xs font-display text-gray-300">{habit.title}</div>
                                                {currentWeekDates.map((date, i) => {
                                                    const dateStr = date.toISOString().split('T')[0];
                                                    const isCompleted = habit.habit_history?.[dateStr];
                                                    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
                                                    const isScheduled = (habit.habit_frequency || DAYS).includes(dayName);
                                                    
                                                    return (
                                                        <div key={i} className="flex justify-center">
                                                            {isScheduled ? (
                                                                <button 
                                                                    onClick={() => toggleDay(habit, dateStr)}
                                                                    className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isCompleted ? 'bg-pink-600 border-pink-500 shadow-[0_0_10px_#ec4899]' : 'bg-black/50 border-white/10 hover:border-white/30'}`}
                                                                >
                                                                    {isCompleted && <span className="text-[8px] text-white">✓</span>}
                                                                </button>
                                                            ) : (
                                                                <div className="w-1 h-1 bg-white/5 rounded-full" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                <div className="text-center font-mono text-[10px] text-pink-500 font-bold">{habit.streak_current}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* ADD WEEK BUTTON */}
                        <div className="min-w-[100px] flex items-center justify-center">
                            <button onClick={handleAddWeek} className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white hover:bg-white/10 transition-all text-2xl">
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: REAL ANALYTICS */}
            <div className="space-y-6">
                <h3 className="text-xl font-display font-bold text-white">PERFORMANCE</h3>
                
                {/* 1. Completion Rate */}
                <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <h4 className="text-[10px] font-mono text-gray-500 uppercase absolute top-4 left-4">Completion Rate</h4>
                    <div className="relative w-40 h-40 mt-4">
                        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                            <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="8" fill="none" />
                            <motion.circle 
                                initial={{ strokeDashoffset: 251 }}
                                animate={{ strokeDashoffset: 251 - (251 * (completionRate / 100)) }}
                                cx="50" cy="50" r="40" 
                                stroke={PINK_ACCENT} 
                                strokeWidth="8" 
                                fill="none" 
                                strokeDasharray="251" 
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_10px_#ec4899]"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">{completionRate}%</span>
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">LIFETIME AVG</span>
                        </div>
                    </div>
                </div>

                {/* 2. Consistency Wave */}
                <div className="bg-black/40 border border-white/5 rounded-3xl p-6">
                    <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-4">Consistency Wave (Mon-Sun)</h4>
                    <div className="h-32 w-full flex items-end justify-between gap-1">
                        {consistencyData.map((h, i) => (
                            <motion.div 
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: i * 0.1 }}
                                className="w-full bg-pink-900/40 border-t-2 border-pink-500 rounded-t-sm relative group"
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded">{h}%</div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] text-gray-600 font-mono">
                        {DAYS.map(d => <span key={d}>{d[0]}</span>)}
                    </div>
                </div>

                {/* 3. Top Streak */}
                <div className="bg-gradient-to-br from-pink-900/20 to-black border border-pink-500/20 rounded-3xl p-6 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-mono text-gray-400 uppercase">Top Streak</div>
                        <div className="text-3xl font-display font-bold text-white mt-1">
                            {topStreak} DAYS
                        </div>
                    </div>
                    <div className="text-4xl">🔥</div>
                </div>
            </div>
        </div>

        {/* CREATE MODAL */}
        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-black border border-white/10 rounded-3xl p-8 max-w-md w-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-purple-600" />
                        <h3 className="text-2xl font-display font-bold text-white mb-6">NEW HABIT</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Protocol Name</label>
                                <input 
                                    autoFocus
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. MORNING RUN"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-pink-500 outline-none font-display tracking-wide"
                                />
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Frequency</label>
                                <div className="flex justify-between gap-1">
                                    {DAYS.map(day => (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                            className={`w-10 h-10 rounded-lg text-[10px] font-bold transition-colors ${selectedDays.includes(day) ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                                        >
                                            {day[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <MirrorButton text="CANCEL" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1" />
                            <MirrorButton text="INITIATE" onClick={createHabit} className="flex-1 !border-pink-500/50" reflectionColor="from-transparent via-pink-500/50 to-transparent" />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default HabitTracker;
