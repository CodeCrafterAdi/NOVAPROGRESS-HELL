
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../UI/NotificationProvider';
import { audioManager } from '../../utils/audioManager';
import { CATEGORY_ICONS_MAP } from './Views'; 

interface TaskCardProps {
  task: Task;
  accentColor: string;
  onUpdate?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, accentColor, onUpdate }) => {
  const [completed, setCompleted] = useState(task.completed);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showFire, setShowFire] = useState(false);
  const { addToast } = useNotification();

  const completedSubs = subtasks.filter(s => s.completed).length;
  const progress = subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : (completed ? 100 : 0);
  const Icon = CATEGORY_ICONS_MAP[task.icon_key || 'DEFAULT'] || CATEGORY_ICONS_MAP.DEFAULT;

  const triggerFireChain = () => {
    setShowFire(true);
    setTimeout(() => setShowFire(false), 2000);
  };

  const updateLocalFallback = (updatedTask: Partial<Task> | null) => {
    try {
        const key = `nova_local_tasks_${task.user_id}`;
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        let newStored;
        if (updatedTask === null) {
            newStored = stored.filter((t: Task) => t.id !== task.id);
        } else {
            newStored = stored.map((t: Task) => t.id === task.id ? { ...t, ...updatedTask } : t);
        }
        localStorage.setItem(key, JSON.stringify(newStored));
        window.dispatchEvent(new Event('nova_tasks_update'));
    } catch (e) { console.error("Local fallback error", e); }
  };

  const handleTaskToggle = async () => {
    const newVal = !completed;
    setCompleted(newVal);
    
    if (newVal) {
        audioManager.playSfx('LEVEL_UP');
        triggerFireChain();
    } else {
        audioManager.playSfx('CLICK');
    }

    try {
      if (task.id.startsWith('local-')) throw new Error("Local task");
      const { error } = await supabase.from('tasks').update({ completed: newVal }).eq('id', task.id);
      if (error) throw error;
      if (newVal) addToast('PROTOCOL COMPLETE', 'success');
      if (onUpdate) onUpdate();
    } catch (e) {
      updateLocalFallback({ completed: newVal });
      if (onUpdate) onUpdate();
    }
  };

  const handleSubtaskToggle = async (subId: string) => {
    const newSubtasks = subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    setSubtasks(newSubtasks);
    const allDone = newSubtasks.length > 0 && newSubtasks.every(s => s.completed);
    const shouldCompleteTask = allDone && !completed;
    
    if (shouldCompleteTask) {
        setCompleted(true);
        audioManager.playSfx('LEVEL_UP');
        triggerFireChain();
    } else {
        audioManager.playSfx('CLICK');
    }

    try {
      if (task.id.startsWith('local-')) throw new Error("Local task");
      await supabase.from('tasks').update({ subtasks: newSubtasks, completed: shouldCompleteTask ? true : completed }).eq('id', task.id);
      if (shouldCompleteTask) addToast('ALL OBJECTIVES CLEARED', 'success');
    } catch (e) {
      updateLocalFallback({ subtasks: newSubtasks, completed: shouldCompleteTask ? true : completed });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("CONFIRM DELETION: Purge this directive?")) return;
    try {
      if (task.id.startsWith('local-')) throw new Error("Local task");
      await supabase.from('tasks').delete().eq('id', task.id);
      addToast('DIRECTIVE PURGED', 'info');
      if (onUpdate) onUpdate(); 
    } catch (e) {
      updateLocalFallback(null);
      addToast('DIRECTIVE PURGED (LOCAL)', 'info');
      if (onUpdate) onUpdate();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative mb-4 border transition-all duration-300 group rounded-2xl overflow-hidden
        ${completed ? 'bg-black/40' : 'bg-[#0A0A0A] border-white/10'}
      `}
      style={{
        borderColor: completed ? `${accentColor}40` : (isHovered ? accentColor : undefined),
        boxShadow: completed ? `0 0 15px ${accentColor}15` : (isHovered ? `0 0 20px ${accentColor}20` : 'none'),
      }}
    >
      {/* Background Progress */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div 
            className="absolute bottom-0 left-0 h-full opacity-10"
            style={{ backgroundColor: accentColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
      </div>

      {/* FIRE ANIMATION LAYER */}
      <AnimatePresence>
        {showFire && (
            <div className="absolute top-0 right-0 pointer-events-none z-50 w-full h-full flex items-center justify-center">
                <div className="absolute w-full h-1 bg-white blur-md animate-pulse" style={{ top: '50%' }} />
                <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"
                />
            </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 pl-4 flex gap-4">
        
        {/* ICON SLOT */}
        <div className={`
             flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border
             ${completed ? 'bg-black border-white/5 text-gray-600' : 'bg-white/5 border-white/10 text-white'}
        `} style={{ borderColor: isHovered ? accentColor : undefined }}>
            {Icon}
        </div>

        <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex justify-between items-start">
             <div>
                <div className="flex items-center gap-2 mb-1">
                   {task.linked_asset_id && <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1 rounded border border-blue-500/30">LINKED</span>}
                   <h3 className={`font-display text-lg tracking-wide transition-colors ${completed ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h3>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                   <span className="text-[10px] px-2 py-0.5 rounded border border-white/5 bg-white/5 font-mono text-gray-400">{task.temple_id}</span>
                   {task.complexity && (
                       <span className="text-[10px] px-2 py-0.5 rounded border border-white/5 bg-white/5 font-mono text-white font-bold">{task.complexity}-RANK</span>
                   )}
                   <span className="text-[10px] px-2 py-0.5 rounded border border-white/5 bg-white/5 font-mono" style={{ color: accentColor, borderColor: `${accentColor}30` }}>+{task.xp_value} XP</span>
                   {subtasks.length > 0 && (
                       <span className="text-[10px] px-2 py-0.5 rounded border border-white/5 bg-white/5 font-mono text-gray-400 flex items-center gap-1">
                          <span>{completedSubs}/{subtasks.length}</span>
                       </span>
                   )}
                </div>
             </div>

             <div className="flex flex-col items-end gap-2">
                <button 
                   onClick={(e) => { e.stopPropagation(); handleTaskToggle(); }}
                   className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${completed ? 'bg-transparent' : 'hover:scale-110'}`}
                   style={{ borderColor: completed ? accentColor : 'rgba(255,255,255,0.2)' }}
                >
                   {completed && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />}
                </button>
                <motion.button 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: isHovered ? 1 : 0 }} 
                    onClick={handleDelete} 
                    className="text-gray-600 hover:text-red-500 transition-colors p-1"
                >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </motion.button>
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isExpanded || (subtasks.length > 0 && !completed)) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4">
             {subtasks.length > 0 && (
               <div className="space-y-2 mt-2 pl-16">
                 {subtasks.map(sub => (
                   <div key={sub.id} className="flex flex-col gap-1">
                       <div onClick={(e) => { e.stopPropagation(); handleSubtaskToggle(sub.id); }} className="flex items-center gap-3 py-1 cursor-pointer group/sub">
                          <div className={`w-3 h-3 rounded-full border transition-colors ${sub.completed ? 'bg-white border-white' : 'border-white/20 group-hover/sub:border-white'}`} style={{ backgroundColor: sub.completed ? accentColor : 'transparent', borderColor: sub.completed ? accentColor : undefined }} />
                          <span className={`text-xs font-mono ${sub.completed ? 'text-gray-600 line-through' : 'text-gray-300'}`}>{sub.title}</span>
                       </div>
                       {sub.link_url && (
                           <a 
                             href={sub.link_url} 
                             target="_blank" 
                             rel="noreferrer" 
                             onClick={(e) => e.stopPropagation()}
                             className="ml-6 text-[9px] text-blue-400 hover:text-blue-300 bg-blue-900/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit flex items-center gap-1 transition-colors"
                           >
                             🔗 {sub.link_label || 'LINK'} ↗
                           </a>
                       )}
                   </div>
                 ))}
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskCard;
