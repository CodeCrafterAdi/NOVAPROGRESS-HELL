
/* RESPONSIVE NOTES:
   - Mobile: p-6, full width modal.
   - Desktop: p-8, floating hover effects.
   - Logic: XP = tasks * 10. Level = XP / 100 + 1.
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TempleType, Task } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import TaskCard from './TaskCard';
import MirrorButton from '../UI/MirrorButton';

interface TempleWindowProps {
  id: TempleType;
  title: string;
  color: string;
  className?: string;
  isMobile: boolean;
}

const TempleWindow: React.FC<TempleWindowProps> = ({ 
  id, 
  title, 
  color, 
  className = '',
  isMobile
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // XP & Level Logic
  const completedCount = tasks.filter(t => t.completed).length;
  const totalXp = tasks.reduce((acc, t) => acc + (t.completed ? t.xp_value : 0), 0);
  const level = Math.floor(totalXp / 100) + 1;

  // Realtime Fetch
  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('temple_id', id)
        .order('created_at', { ascending: false });
      
      if (data) setTasks(data as Task[]);
      setLoading(false);
    };

    fetchTasks();

    const channel = supabase
      .channel(`temple_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `temple_id=eq.${id}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') setTasks(prev => [payload.new as Task, ...prev]);
          else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
          else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    
    // Silent UI - No Audio Playback
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('tasks').insert({
      title: newTitle,
      temple_id: id,
      completed: false,
      xp_value: 10,
      user_id: session.user.id
    });

    setNewTitle('');
    setIsModalOpen(false);
  };

  return (
    <>
      <motion.div
        layout
        whileHover={!isMobile ? { scale: 1.02, boxShadow: `0 0 30px ${color}30` } : {}}
        className={`
          bg-black/80 backdrop-blur-md 
          border border-white/10 rounded-3xl 
          flex flex-col relative overflow-hidden
          transition-colors duration-500
          ${className}
        `}
        style={{ borderColor: `${color}40` }}
      >
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-transparent via-white/5 to-transparent relative z-10 flex justify-between items-center">
           <div>
             <h2 className="text-2xl font-bold font-display tracking-wider text-white drop-shadow-md">
               {title} <span style={{ color }}>CATEGORY</span>
             </h2>
           </div>
           
           {/* Level Badge */}
           <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-white/30 text-right hidden sm:block">
                <div>XP {totalXp}</div>
                <div>NEXT {level * 100}</div>
              </div>
              <motion.div 
                key={level} // Triggers animation on change
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-gray-800 to-black border border-white/20 shadow-lg relative group overflow-hidden"
              >
                 <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: color }} />
                 <span className="relative z-10 text-white">L{level}</span>
              </motion.div>
           </div>
        </div>

        {/* Task List */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar min-h-[300px] max-h-[500px]">
           {loading ? (
             <div className="text-white/20 font-mono text-xs animate-pulse text-center mt-10">SYNCING_RITUALS...</div>
           ) : (
             <div className="space-y-4">
               {tasks.map(task => (
                 <TaskCard key={task.id} task={task} accentColor={color} />
               ))}
               {tasks.length === 0 && (
                 <div className="text-center py-10 opacity-30">
                   <div className="text-4xl mb-2 grayscale">◈</div>
                   <div className="font-mono text-xs">NO OATHS SWORN</div>
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-white/5 bg-black/40">
           <MirrorButton 
             text="FORGE NEW RITUAL" 
             onClick={() => setIsModalOpen(true)}
             variant="ghost"
             className="w-full !py-3 !text-xs !border-dashed border-white/20 hover:border-white/50"
           />
        </div>
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md relative shadow-2xl"
              style={{ borderColor: color }}
            >
              <h3 className="font-display text-2xl text-white mb-6">FORGE {title} RITUAL</h3>
              
              <input 
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Name your oath..."
                className="w-full bg-black border border-white/20 rounded-xl p-4 text-white placeholder-white/20 mb-6 focus:border-white focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              
              <div className="flex gap-4">
                <MirrorButton text="FORGE" onClick={handleAddTask} className="flex-1" />
                <MirrorButton text="ABORT" onClick={() => setIsModalOpen(false)} variant="danger" className="flex-1" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TempleWindow;
