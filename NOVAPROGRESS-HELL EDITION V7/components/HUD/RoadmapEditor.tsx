
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { audioManager } from '../../utils/audioManager';
import { useNotification } from '../UI/NotificationProvider';
import { QuestModal, ICON_DATA } from './Views';

interface RoadmapEditorProps {
  userId: string;
}

// --- V8 PARTICLE COMBINING BACKGROUND ---
// Particles float, merge into nodes, dissolve, reborn.
const ParticleCombiningBackground = ({ scale, pan }: { scale: number, pan: {x: number, y: number} }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        
        // Particles that seek each other
        const particles: {x: number, y: number, tx: number, ty: number, life: number, color: string}[] = [];
        const colors = ['#ef4444', '#3b82f6', '#eab308']; // Red, Blue, Yellow

        const spawn = () => {
            if(particles.length < 50) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    tx: Math.random() * w,
                    ty: Math.random() * h,
                    life: 100 + Math.random() * 200,
                    color: colors[Math.floor(Math.random() * colors.length)]
                });
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, w, h);
            const px = pan.x * 0.1;
            const py = pan.y * 0.1;

            particles.forEach((p, i) => {
                // Move towards target
                p.x += (p.tx - p.x) * 0.01;
                p.y += (p.ty - p.y) * 0.01;
                p.life--;

                // Draw connecting lines if close to others
                particles.forEach((p2, j) => {
                    if (i === j) return;
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255,255,255,${(1 - dist/100) * 0.1})`;
                        ctx.moveTo(p.x + px, p.y + py);
                        ctx.lineTo(p2.x + px, p2.y + py);
                        ctx.stroke();
                    }
                });

                // Draw Particle
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.min(1, p.life / 50) * 0.5;
                ctx.beginPath();
                ctx.arc(p.x + px, p.y + py, 2 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                // Reset
                if (p.life <= 0 || Math.abs(p.x - p.tx) < 1) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                    p.tx = Math.random() * w;
                    p.ty = Math.random() * h;
                    p.life = 200;
                }
            });
            spawn();
            requestAnimationFrame(render);
        };
        const animId = requestAnimationFrame(render);
        const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, [scale, pan]);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40 z-0" />;
};

const getPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dist = Math.abs(x2 - x1);
  const cp1x = x1 + dist * 0.5; const cp1y = y1;
  const cp2x = x2 - dist * 0.5; const cp2y = y2;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
};

const RoadmapEditor: React.FC<RoadmapEditorProps> = ({ userId }) => {
  const { addToast } = useNotification();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSpawnPos, setModalSpawnPos] = useState<{x: number, y: number} | null>(null);
  const [linkingNodeId, setLinkingNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial Fetch & Local Storage Merge
  const fetchTasks = async () => {
    let { data } = await supabase.from('tasks').select('*').eq('user_id', userId);
    const stored = localStorage.getItem(`nova_local_tasks_${userId}`);
    let localTasks = stored ? JSON.parse(stored) : [];
    
    // Dedupe
    const taskMap = new Map();
    [...(data || []), ...localTasks].forEach(t => taskMap.set(t.id, t));
    setTasks(Array.from(taskMap.values()));
  };

  // Sync Logic with Optimistic Updates (V8 Realtime)
  useEffect(() => {
    fetchTasks();
    const channel = supabase.channel('roadmap_sync_realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, 
        (payload) => {
            if (payload.eventType === 'INSERT') {
                setTasks(prev => [...prev, payload.new as Task]);
            } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as Task;
                setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            } else if (payload.eventType === 'DELETE') {
                setTasks(prev => prev.filter(t => t.id !== payload.old.id));
            }
        }
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const saveTaskPosition = async (id: string, x: number, y: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    try {
      if(id.startsWith('local-')) {
         const stored = JSON.parse(localStorage.getItem(`nova_local_tasks_${userId}`) || '[]');
         const updated = stored.map((t: Task) => t.id === id ? { ...t, x, y } : t);
         localStorage.setItem(`nova_local_tasks_${userId}`, JSON.stringify(updated));
      } else {
         await supabase.from('tasks').update({ x, y }).eq('id', id);
      }
    } catch(e) {}
  };

  const handleConnect = async (targetId: string) => {
    if (!linkingNodeId || linkingNodeId === targetId) return;
    const sourceTask = tasks.find(t => t.id === linkingNodeId);
    if (!sourceTask) return;
    const newConnections = [...(sourceTask.connections || []), targetId];
    setTasks(prev => prev.map(t => t.id === linkingNodeId ? { ...t, connections: newConnections } : t));
    setLinkingNodeId(null);
    audioManager.playSfx('LEVEL_UP');
    try {
        if(sourceTask.id.startsWith('local-')) {
             const stored = JSON.parse(localStorage.getItem(`nova_local_tasks_${userId}`) || '[]');
             const updated = stored.map((t: Task) => t.id === linkingNodeId ? { ...t, connections: newConnections } : t);
             localStorage.setItem(`nova_local_tasks_${userId}`, JSON.stringify(updated));
        } else {
             await supabase.from('tasks').update({ connections: newConnections }).eq('id', linkingNodeId);
        }
        addToast("NEURAL LINK ESTABLISHED", "success");
    } catch(e) {}
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#080808] select-none rounded-3xl" onMouseUp={() => { setIsDraggingCanvas(false); setLinkingNodeId(null); }}>
        <ParticleCombiningBackground scale={scale} pan={pan} />
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="bg-white/10 p-2 rounded text-white border border-white/5 hover:bg-white/20">+</button>
            <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} className="bg-white/10 p-2 rounded text-white text-xs border border-white/5 hover:bg-white/20">RESET</button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="bg-white/10 p-2 rounded text-white border border-white/5 hover:bg-white/20">-</button>
        </div>

        <div 
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
            onMouseDown={(e) => {
                if(e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg')) {
                    setIsDraggingCanvas(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                }
            }}
            onMouseMove={(e) => {
                if (isDraggingCanvas) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                if (linkingNodeId) {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if(rect) setMousePos({ x: (e.clientX - rect.left - pan.x) / scale, y: (e.clientY - rect.top - pan.y) / scale });
                }
            }}
            onDoubleClick={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if(!rect) return;
                setModalSpawnPos({ x: (e.clientX - rect.left - pan.x) / scale, y: (e.clientY - rect.top - pan.y) / scale });
                setIsModalOpen(true);
            }}
            onWheel={(e) => setScale(s => Math.max(0.5, Math.min(2, s - e.deltaY * 0.001)))}
        >
            <motion.div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }} className="w-full h-full relative">
                <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] overflow-visible pointer-events-none z-0" style={{ transform: 'translate(-5000px, -5000px)' }}>
                    {tasks.map(task => {
                        if (!task.x) return null;
                        const links = task.connections || [];
                        if (task.linked_asset_id && !links.includes(task.linked_asset_id)) links.push(task.linked_asset_id);
                        
                        // CATEGORY COLOR LOGIC
                        const colorMap: any = { 'FITNESS': '#ef4444', 'BUSINESS': '#eab308', 'SKILLS': '#3b82f6', 'PROJECTS': '#84cc16' };
                        const lineColor = colorMap[task.temple_id] || '#ffffff';

                        return links.map(targetId => {
                            const target = tasks.find(t => t.id === targetId);
                            if (!target || !target.x) return null;
                            const startX = (task.x || 0) + 200 + 5000;
                            const startY = (task.y || 0) + 45 + 5000;
                            const endX = (target.x || 0) - 10 + 5000;
                            const endY = (target.y || 0) + 45 + 5000;
                            const d = getPath(startX, startY, endX, endY);
                            return (
                                <g key={`${task.id}-${targetId}`}>
                                    <path d={d} fill="none" stroke={lineColor} strokeWidth={task.completed ? 3 : 1} strokeDasharray={task.completed ? "none" : "5 5"} opacity={task.completed ? 1 : 0.3} />
                                    {task.completed && (
                                        <circle r="3" fill="#fff">
                                            <animateMotion dur="2s" repeatCount="indefinite" path={d} />
                                        </circle>
                                    )}
                                </g>
                            );
                        });
                    })}
                    {linkingNodeId && (() => {
                        const source = tasks.find(t => t.id === linkingNodeId);
                        if (source && source.x) {
                             const d = getPath((source.x || 0) + 200 + 5000, (source.y || 0) + 45 + 5000, mousePos.x + 5000, mousePos.y + 5000);
                             return <path d={d} stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="5 5" opacity="0.5" />;
                        }
                    })()}
                </svg>

                {tasks.map(task => (
                    <NodeCard key={task.id} task={task} scale={scale} onDragEnd={(x, y) => saveTaskPosition(task.id, x, y)} onStartLink={() => setLinkingNodeId(task.id)} onEndLink={() => handleConnect(task.id)} />
                ))}
            </motion.div>
        </div>

        <AnimatePresence>
            {isModalOpen && <QuestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialCategory="ROADMAP" categories={[]} userId={userId} existingTasks={tasks} initialData={{ x: modalSpawnPos?.x || 100, y: modalSpawnPos?.y || 100, temple_id: 'ROADMAP' }} />}
        </AnimatePresence>
        
        <div className="absolute bottom-6 left-6 pointer-events-none">
            <h3 className="text-white/20 font-display text-4xl font-bold tracking-widest">ROADMAP EDITOR</h3>
        </div>
    </div>
  );
};

const NodeCard = ({ task, scale, onDragEnd, onStartLink, onEndLink }: any) => {
    // Determine Color based on Category
    const colorMap: any = { 'FITNESS': '#ef4444', 'BUSINESS': '#eab308', 'SKILLS': '#3b82f6', 'PROJECTS': '#84cc16' };
    const color = colorMap[task.temple_id] || '#ffffff';
    const styleData = ICON_DATA[task.icon_key || 'DEFAULT'] || ICON_DATA.DEFAULT;
    const Icon = styleData.icon;

    return (
        <motion.div
            drag dragMomentum={false}
            initial={{ x: task.x || 100, y: task.y || 100, opacity: 0, scale: 0.8 }}
            animate={{ x: task.x, y: task.y, opacity: 1, scale: 1 }}
            onDragEnd={(_, info) => onDragEnd((task.x || 100) + info.offset.x, (task.y || 100) + info.offset.y)}
            onMouseUp={() => onEndLink()}
            className="absolute w-[200px] min-h-[90px] rounded-xl flex flex-col justify-between backdrop-blur-xl shadow-2xl group overflow-visible border transition-all duration-300"
            style={{ 
                cursor: 'grab', 
                borderColor: task.completed ? color : 'rgba(255,255,255,0.1)', 
                backgroundColor: 'rgba(5,5,5,0.9)', 
                boxShadow: task.completed ? `0 0 20px ${color}40` : 'none' 
            }}
        >
            <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-900 border border-gray-600 z-50 hover:bg-white transition-colors" />
            <div className="p-4 relative z-10 flex flex-col gap-2 pointer-events-none">
                <span className="text-[9px] font-mono uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded w-max" style={{ color }}>{task.temple_id}</span>
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/5 text-white shadow-lg"><div className="w-4 h-4" style={{ color }}>{Icon}</div></div>
                    <span className={`font-display font-bold leading-tight text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.title}</span>
                </div>
            </div>
            <div 
                className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20 border border-black cursor-crosshair z-50 hover:scale-150 transition-transform hover:bg-white"
                onMouseDown={(e) => { e.stopPropagation(); onStartLink(); }}
            />
        </motion.div>
    );
};

export default RoadmapEditor;
