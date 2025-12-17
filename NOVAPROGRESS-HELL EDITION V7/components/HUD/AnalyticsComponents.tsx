
import React from 'react';
import { motion } from 'framer-motion';
import { Task } from '../../types';

// --- 1. ACTIVITY HEATMAP (THE GRID) ---
export const ActivityGrid = ({ tasks }: { tasks: Task[] }) => {
  // Last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const getActivity = (date: string) => {
    return tasks.filter(t => t.completed && t.created_at.startsWith(date)).length;
  };

  return (
    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
      <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3">NEURAL_ACTIVITY_LOG (14 DAYS)</h4>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const count = getActivity(day);
          const intensity = Math.min(count * 0.2, 1); // Cap at 5 tasks for max brightness
          return (
            <div key={day} className="flex flex-col items-center gap-1">
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="w-full aspect-square rounded-md border border-white/5 relative overflow-hidden group"
                 style={{ backgroundColor: `rgba(239, 68, 68, ${intensity * 0.8 + 0.1})` }}
               >
                  {count > 0 && <div className="absolute inset-0 bg-red-500 blur-md opacity-50" />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/80 transition-opacity">
                     <span className="text-[8px] font-bold">{count}</span>
                  </div>
               </motion.div>
               <span className="text-[8px] text-gray-600 font-mono">{day.slice(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 2. CHRONO CIRCLE (TIME OF DAY) ---
export const ChronoCircle = ({ tasks }: { tasks: Task[] }) => {
  const hours = Array(24).fill(0);
  tasks.filter(t => t.completed).forEach(t => {
      // Use created_at as proxy for completion time if completed_at missing, ideally need completed_at
      const h = new Date(t.created_at).getHours(); 
      hours[h]++;
  });
  const max = Math.max(...hours, 1);

  return (
    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center relative overflow-hidden">
       <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3 self-start">CHRONO_SYNC_METRIC</h4>
       <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
             {hours.map((count, i) => {
                const rotation = (i / 24) * 360;
                const barHeight = (count / max) * 30; 
                return (
                   <g key={i} transform={`rotate(${rotation} 50 50)`}>
                      <rect 
                        x="48" 
                        y={50 - 15 - barHeight} // Start from radius 15 outwards
                        width="4" 
                        height={barHeight + 2} 
                        fill={count > 0 ? '#ef4444' : '#333'}
                        rx="1"
                        className="opacity-80 hover:opacity-100 transition-opacity"
                      />
                   </g>
                );
             })}
             <circle cx="50" cy="50" r="12" fill="none" stroke="#333" strokeWidth="1" />
             <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="8" className="font-mono">24H</text>
          </svg>
          {/* Scanline */}
          <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
             className="absolute inset-0 w-full h-full rounded-full border-t border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          />
       </div>
    </div>
  );
};

// --- 3. MOMENTUM CHART (XP VELOCITY) ---
export const MomentumChart = ({ tasks }: { tasks: Task[] }) => {
    // XP gain over last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });
    
    const data = days.map(day => 
        tasks.filter(t => t.completed && t.created_at.startsWith(day))
             .reduce((sum, t) => sum + t.xp_value, 0)
    );
    const max = Math.max(...data, 100);
    const points = data.map((val, i) => {
        const x = (i / 6) * 100;
        const y = 100 - (val / max) * 80; // keep padding
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
            <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3">XP_VELOCITY_VECTOR</h4>
            <div className="w-full h-32 relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <polygon points={`0,100 ${points} 100,100`} fill="url(#grad)" />
                    <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    {data.map((val, i) => (
                        <circle key={i} cx={(i/6)*100} cy={100 - (val/max)*80} r="1.5" fill="#fff" />
                    ))}
                </svg>
                {/* Horizontal Grid */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-white/5 w-full h-full" />
                    <div className="border-b border-white/5 w-full h-full" />
                    <div className="border-b border-white/5 w-full h-full" />
                </div>
            </div>
        </div>
    );
};

// --- 4. CATEGORY CORE (DONUT) ---
export const CategoryDonut = ({ tasks }: { tasks: Task[] }) => {
    const cats: Record<string, number> = {};
    tasks.filter(t => t.completed).forEach(t => {
        cats[t.temple_id] = (cats[t.temple_id] || 0) + 1;
    });
    
    const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    let accumulated = 0;
    
    // Colors map
    const colors: Record<string, string> = {
        'FITNESS': '#ef4444',
        'SKILLS': '#3b82f6',
        'BUSINESS': '#eab308',
        'MISSION': '#6366f1',
        'HOME': '#ffffff'
    };

    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center">
            <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3 self-start">TEMPLE_ALLOCATION</h4>
            <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {Object.entries(cats).map(([cat, count], i) => {
                        const percent = count / total;
                        const dash = percent * 251.2; // 2 * PI * 40
                        const offset = 251.2 - dash; // Not really needed for sequential segments, need calculation
                        
                        const startPercent = accumulated;
                        accumulated += percent;
                        
                        const circumference = 2 * Math.PI * 40;
                        const dashArray = `${percent * circumference} ${circumference}`;
                        const dashOffset = -startPercent * circumference;

                        return (
                            <circle 
                                key={cat}
                                r="40" cx="50" cy="50" 
                                fill="none" 
                                stroke={colors[cat] || '#888'}
                                strokeWidth="8"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                className="opacity-80 hover:opacity-100 transition-opacity"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-display">{tasks.filter(t => t.completed).length}</span>
                    <span className="text-[8px] font-mono text-gray-500">COMPLETE</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {Object.keys(cats).map(c => (
                    <div key={c} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[c] || '#888' }} />
                        <span className="text-[8px] text-gray-400">{c}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 5. DAILY PULSE (BARS) ---
export const DailyPulse = ({ tasks }: { tasks: Task[] }) => {
    // 7 Day Added vs Completed
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
            <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3">INPUT_OUTPUT_CYCLE</h4>
            <div className="flex justify-between items-end h-24 gap-2">
                {days.map(day => {
                    const added = tasks.filter(t => t.created_at.startsWith(day)).length;
                    const done = tasks.filter(t => t.completed && t.created_at.startsWith(day)).length; // Approx for completed
                    const maxH = 10; 
                    
                    return (
                        <div key={day} className="flex-1 flex flex-col justify-end gap-1 group">
                            <div className="w-full bg-red-900/30 relative rounded-sm overflow-hidden" style={{ height: `${(Math.min(added, maxH)/maxH)*100}%` }}>
                                <div className="absolute bottom-0 w-full bg-red-500/50" style={{ height: `${(Math.min(done, maxH)/Math.max(added, 1))*100}%` }} />
                            </div>
                            <div className="h-0.5 w-full bg-white/10 group-hover:bg-white/50 transition-colors" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 6. WIN RATE (GAUGE) ---
export const WinRate = ({ tasks }: { tasks: Task[] }) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-1">EXECUTION_RATE</h4>
            <div className="flex items-end gap-2">
                <span className="text-5xl font-display font-bold text-white">{rate}%</span>
                <span className="text-xs font-mono text-gray-400 mb-2">EFFICIENCY</span>
            </div>
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden mt-4">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                />
            </div>
            <p className="text-[8px] text-gray-500 mt-2 font-mono">
                {completed} CLEARED / {total} TOTAL DIRECTIVES
            </p>
        </div>
    );
};

// --- RADAR CHART (RETAINED) ---
export const HellRadar = ({ stats }: { stats: { label: string; value: number; max: number }[] }) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  
  const getPoints = (values: number[]) => {
    return values.map((val, i) => {
      const angle = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
      const r = (val / 100) * radius; 
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const levels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[400px]">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
         {levels.map((level, idx) => (
            <polygon key={idx} points={getPoints(stats.map(() => level * 100))} fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4"/>
         ))}
         {stats.map((stat, i) => {
            const angle = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#222" strokeWidth="1" />;
         })}
         <motion.polygon
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            points={getPoints(stats.map(s => (s.value / s.max) * 100))}
            fill="rgba(239, 68, 68, 0.2)"
            stroke="#ef4444"
            strokeWidth="2"
            className="drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
         />
         {stats.map((stat, i) => {
            const angle = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
            const x = center + (radius + 30) * Math.cos(angle); 
            const y = center + (radius + 30) * Math.sin(angle);
            return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#666" fontSize="10" fontFamily="monospace" className="uppercase tracking-widest">{stat.label}</text>;
         })}
      </svg>
    </div>
  );
};

// --- ORBIT PROGRESS (RETAINED) ---
export const SoulOrbit = ({ level, xp, maxXp }: { level: number, xp: number, maxXp: number }) => {
   const percentage = Math.min(100, Math.max(0, (xp / maxXp) * 100));
   const size = 120;
   const strokeWidth = 8;
   const radius = (size - strokeWidth) / 2;
   const circumference = radius * 2 * Math.PI;
   const offset = circumference - (percentage / 100) * circumference;

   return (
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
         <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} stroke="#333" strokeWidth={strokeWidth} fill="none" />
            <motion.circle cx={size/2} cy={size/2} r={radius} stroke="#ef4444" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: "easeOut" }} strokeLinecap="round" className="drop-shadow-[0_0_10px_#ef4444]" />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold text-white">{level}</span>
            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">RANK</span>
         </div>
      </div>
   );
};

// Placeholder to satisfy imports
export const BloodWave = () => <div/>;
