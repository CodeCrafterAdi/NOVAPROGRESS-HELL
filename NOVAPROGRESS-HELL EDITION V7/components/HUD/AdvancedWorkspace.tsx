
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import MirrorButton from '../UI/MirrorButton';
import { AdvancedProject, Mission, Step, Task, Subtask } from '../../types';
import { generateQuestStructure, generateProjectPhases } from '../../services/aiAnalysis';
import { useNotification } from '../UI/NotificationProvider';
import { audioManager } from '../../utils/audioManager';
import { CATEGORY_ICONS_MAP, ICON_DATA } from './Views';

interface AdvancedWorkspaceProps {
  userId: string;
  onBack: () => void;
}

// MOCK DATA TYPES
interface QuestDraft {
    name: string;
    fields: string[];
    intensity: 'CASUAL' | 'FOCUSED' | 'HARDCORE';
}

interface ProjectDraft {
    name: string;
    field: string;
    style: 'STRUCTURED' | 'PARALLEL' | 'SPRINT';
}

const FIELDS = ['BUSINESS', 'TECH', 'FITNESS', 'SKILLS', 'PERSONAL', 'ART'];

// --- COLOR MAPPING FOR GLOWS ---
const FIELD_COLORS: Record<string, string> = {
    'BUSINESS': '#eab308', // Gold
    'TECH': '#0ea5e9',     // Cyan
    'FITNESS': '#ef4444',  // Red
    'SKILLS': '#8b5cf6',   // Purple
    'PERSONAL': '#22c55e', // Green
    'ART': '#f43f5e'       // Pink
};

// --- ATMOSPHERE ENGINE ---
const ProjectAtmosphere = ({ color }: { color: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let particles: {x: number, y: number, r: number, vx: number, vy: number, life: number}[] = [];

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 255, b: 255 };
        };
        const rgb = hexToRgb(color);

        const init = () => {
            particles = [];
            // Reduced particle count for mobile performance
            const count = window.innerWidth < 768 ? 30 : 60;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 100 + 50,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    life: Math.random() * 100
                });
            }
        };
        init();

        let animId: number;
        const render = () => {
            ctx.fillStyle = '#030303';
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'screen'; 

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if(p.x < -p.r) p.x = w + p.r;
                if(p.x > w + p.r) p.x = -p.r;
                if(p.y < -p.r) p.y = h + p.r;
                if(p.y > h + p.r) p.y = -p.r;

                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalCompositeOperation = 'source-over'; 
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for(let y=0; y<h; y+=4) ctx.fillRect(0, y, w, 1);

            animId = requestAnimationFrame(render);
        };
        render();

        const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; init(); };
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, [color]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-60" />;
};

const AdvancedWorkspace: React.FC<AdvancedWorkspaceProps> = ({ userId, onBack }) => {
  const { addToast } = useNotification();
  
  // -- STATE --
  const [missions, setMissions] = useState<Mission[]>([]);
  const [projects, setProjects] = useState<AdvancedProject[]>([]);
  
  // Undo/Redo State
  const [history, setHistory] = useState<AdvancedProject[][]>([]);
  const [future, setFuture] = useState<AdvancedProject[][]>([]);

  // View State Management
  const [viewState, setViewState] = useState<'DASHBOARD' | 'QUEST_WIZARD' | 'PROJECT_WIZARD' | 'EXECUTION'>('DASHBOARD');
  
  // Wizards & Active Data
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Linking & Graph State
  const [isGraphMode, setIsGraphMode] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [sourceTaskForLink, setSourceTaskForLink] = useState<{taskId?: string, subtaskId?: string, stepId: string} | null>(null);

  // Infinite Graph Canvas State
  // Centered Pan for visibility
  const [pan, setPan] = useState({ x: -4500, y: -4800 }); 
  const [zoom, setZoom] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Detail Modal State
  const [editingTask, setEditingTask] = useState<{task: Task, stepId: string} | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{subtask: Subtask, parentTask: Task, stepId: string} | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null); 

  const [questDraft, setQuestDraft] = useState<QuestDraft>({ name: '', fields: [], intensity: 'FOCUSED' });
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>({ name: '', field: 'BUSINESS', style: 'STRUCTURED' });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(1);

  // Data Loading
  useEffect(() => {
    const fetchData = async () => {
        const localMissions = JSON.parse(localStorage.getItem(`nova_missions_${userId}`) || '[]');
        const localProjects = JSON.parse(localStorage.getItem(`nova_projects_${userId}`) || '[]');
        
        if (localMissions.length === 0) {
            setViewState('QUEST_WIZARD');
        }
        
        setMissions(localMissions);
        setProjects(localProjects);
    };
    fetchData();
  }, [userId]);

  // Persist Updates (Basic)
  const saveProjects = (updatedProjects: AdvancedProject[]) => {
      setProjects(updatedProjects);
      localStorage.setItem(`nova_projects_${userId}`, JSON.stringify(updatedProjects));
  };

  // --- UNDO / REDO ENGINE ---
  const saveProjectsWithHistory = (updatedProjects: AdvancedProject[]) => {
      setHistory(prev => [...prev, projects]);
      setFuture([]);
      saveProjects(updatedProjects);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const previous = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setFuture(prev => [projects, ...prev]);
      setHistory(newHistory);
      saveProjects(previous); 
      addToast("TIMELINE REVERTED", "info");
  };

  const handleRedo = () => {
      if (future.length === 0) return;
      const next = future[0];
      const newFuture = future.slice(1);
      setHistory(prev => [...prev, projects]);
      setFuture(newFuture);
      saveProjects(next);
      addToast("TIMELINE RESTORED", "info");
  };

  // --- LINKING LOGIC ---
  const handleOpenLinkModal = (stepId: string, taskId?: string, subtaskId?: string) => {
      setSourceTaskForLink({ stepId, taskId, subtaskId });
      setLinkModalOpen(true);
  };

  const handleConfirmLink = (targetId: string) => {
      if (!activeProjectId || !sourceTaskForLink) return;
      
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;

      const updatedSteps = currentProject.steps.map(s => {
          if (s.id !== sourceTaskForLink.stepId) return s;
          return {
              ...s,
              tasks: s.tasks.map(t => {
                  if (sourceTaskForLink.taskId && t.id === sourceTaskForLink.taskId) {
                      const currentLinks = t.connections || [];
                      if (currentLinks.includes(targetId)) return t;
                      return { ...t, connections: [...currentLinks, targetId] };
                  }
                  if (sourceTaskForLink.subtaskId && t.subtasks?.some(sub => sub.id === sourceTaskForLink.subtaskId)) {
                      return {
                          ...t,
                          subtasks: t.subtasks.map(sub => 
                              sub.id === sourceTaskForLink.subtaskId 
                              ? { ...sub, connections: [...(sub.connections || []), targetId] }
                              : sub
                          )
                      };
                  }
                  return t;
              })
          };
      });

      const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, steps: updatedSteps } : p);
      saveProjectsWithHistory(updatedProjects);
      
      setLinkModalOpen(false);
      setSourceTaskForLink(null);
      addToast("NEURAL CONNECTION ESTABLISHED", "success");
      audioManager.playSfx('LEVEL_UP');
  };

  // --- PHASE MANAGEMENT ---
  const handleAddPhase = () => {
      if (!activeProjectId) return;
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;

      const newPhase: Step = {
          id: `phase-${Date.now()}`,
          title: `PHASE ${currentProject.steps.length + 1}: EXPANSION`,
          order: currentProject.steps.length + 1,
          status: currentProject.steps.length === 0 ? 'UNLOCKED' : 'LOCKED',
          tasks: [],
          is_phase: true
      };

      const updatedSteps = [...currentProject.steps, newPhase];
      const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, steps: updatedSteps } : p);
      saveProjectsWithHistory(updatedProjects);
      addToast("NEW PHASE INITIALIZED", "success");
  };

  const updatePhaseTitle = (phaseId: string, newTitle: string) => {
      if (!activeProjectId) return;
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;

      const updatedSteps = currentProject.steps.map(s => s.id === phaseId ? { ...s, title: newTitle.toUpperCase() } : s);
      const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, steps: updatedSteps } : p);
      saveProjectsWithHistory(updatedProjects);
  };

  const saveTaskDetails = (updatedTask: Task) => {
      if (!activeProjectId || !editingTask) return;
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;

      const updatedSteps = currentProject.steps.map(s => {
          if (s.id !== editingTask.stepId) return s;
          return {
              ...s,
              tasks: s.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
          };
      });

      const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, steps: updatedSteps } : p);
      saveProjectsWithHistory(updatedProjects);
      setEditingTask({ ...editingTask, task: updatedTask }); 
  };

  const saveSubtaskDetails = (updatedSubtask: Subtask) => {
      if (!activeProjectId || !editingSubtask) return;
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;

      const parentTask = editingSubtask.parentTask;
      const updatedSubtasks = (parentTask.subtasks || []).map(s => s.id === updatedSubtask.id ? updatedSubtask : s);
      const updatedTask = { ...parentTask, subtasks: updatedSubtasks };

      const updatedSteps = currentProject.steps.map(s => {
          if (s.id !== editingSubtask.stepId) return s;
          return {
              ...s,
              tasks: s.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
          };
      });

      const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, steps: updatedSteps } : p);
      saveProjectsWithHistory(updatedProjects);
      setEditingSubtask({ ...editingSubtask, subtask: updatedSubtask, parentTask: updatedTask });
  };

  const toggleQuestField = (field: string) => {
      setQuestDraft(prev => {
          const newFields = prev.fields.includes(field) 
              ? prev.fields.filter(f => f !== field)
              : [...prev.fields, field];
          return { ...prev, fields: newFields };
      });
  };

  const handleQuestCompletion = async (mode: 'MANUAL' | 'AI') => {
      if(!questDraft.name) { addToast("QUEST NAME REQUIRED", "error"); return; }
      if(questDraft.fields.length === 0) { addToast("SELECT AT LEAST ONE FIELD", "error"); return; }

      setIsGenerating(true);
      let newMission: Mission = { id: `mis-${Date.now()}`, vision: questDraft.name.toUpperCase(), objectives: [], kpis: [], projects: [], user_id: userId };

      if (mode === 'AI') {
          const apiKey = localStorage.getItem(`nova_gemini_key_${userId}`);
          if (!apiKey) { addToast("API KEY REQUIRED", "error"); setIsGenerating(false); return; }
          try {
              const aiData = await generateQuestStructure(questDraft.name, questDraft.fields, questDraft.intensity, apiKey);
              if (aiData) { newMission.objectives = aiData.objectives || []; newMission.kpis = aiData.kpis || []; }
          } catch(e) { addToast("AI GENERATION FAILED", "error"); }
      }

      const updatedMissions = [newMission, ...missions];
      setMissions(updatedMissions);
      localStorage.setItem(`nova_missions_${userId}`, JSON.stringify(updatedMissions));
      audioManager.playSfx('LEVEL_UP');
      setIsGenerating(false);
      setViewState('DASHBOARD');
      addToast("QUEST INITIALIZED", "success");
  };

  const initProjectWizard = (missionId: string) => { setActiveQuestId(missionId); setProjectDraft({ name: '', field: 'BUSINESS', style: 'STRUCTURED' }); setStep(1); setViewState('PROJECT_WIZARD'); };

  const handleProjectCompletion = async (mode: 'MANUAL' | 'AI') => {
      if (!projectDraft.name) { addToast("PROJECT NAME REQUIRED", "error"); return; }
      setIsGenerating(true);
      let newProject: AdvancedProject = { id: `proj-${Date.now()}`, title: projectDraft.name.toUpperCase(), field: projectDraft.field as any, mission_id: activeQuestId || undefined, steps: [], progress: 0, user_id: userId, execution_style: projectDraft.style };

      if (mode === 'AI') {
          const apiKey = localStorage.getItem(`nova_gemini_key_${userId}`);
          if (!apiKey) { addToast("API KEY REQUIRED", "error"); setIsGenerating(false); return; }
          try {
              const phases = await generateProjectPhases(projectDraft.name, projectDraft.field, projectDraft.style, apiKey);
              if (phases && Array.isArray(phases)) newProject.steps = phases; 
          } catch (e) { addToast("AI FAILED", "error"); }
      } else {
          newProject.steps = [{ id: `phase-${Date.now()}`, title: 'PHASE 1: FOUNDATION', order: 1, status: 'UNLOCKED', tasks: [] }];
      }

      const updatedProjects = [...projects, newProject];
      saveProjectsWithHistory(updatedProjects);
      if (activeQuestId) {
          const updatedMissions = missions.map(m => m.id === activeQuestId ? { ...m, projects: [...m.projects, newProject.id] } : m);
          setMissions(updatedMissions);
          localStorage.setItem(`nova_missions_${userId}`, JSON.stringify(updatedMissions));
      }
      audioManager.playSfx('LEVEL_UP');
      setIsGenerating(false);
      setViewState('DASHBOARD');
      addToast("TACTICAL UNIT DEPLOYED", "success");
  };

  const openExecutionView = (projId: string) => { 
      // Reset Pan when entering execution view to ensure visibility
      setPan({ x: -4500, y: -4800 }); 
      setZoom(1);
      setActiveProjectId(projId); 
      setExpandedTaskId(null); 
      setIsGraphMode(false); 
      setViewState('EXECUTION'); 
  };

  const isPhaseLocked = (projectId: string, phaseId: string): boolean => {
      const proj = projects.find(p => p.id === projectId);
      if (!proj) return true;
      const phaseIndex = proj.steps.findIndex(s => s.id === phaseId);
      if (phaseIndex <= 0) return false; 
      return proj.steps[phaseIndex - 1].status !== 'COMPLETED';
  };

  const handleTaskComplete = (stepId: string, taskId: string) => {
      if (!activeProjectId) return;
      if (isPhaseLocked(activeProjectId, stepId)) {
          addToast("PHASE LOCKED: COMPLETE PREVIOUS PHASE FIRST", "error");
          audioManager.playSfx('ERROR');
          return;
      }
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;
      const updatedSteps = currentProject.steps.map(step => {
          if (step.id !== stepId) return step;
          const updatedTasks = step.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
          return { ...step, tasks: updatedTasks };
      });
      updateProjectProgress(currentProject, updatedSteps);
      audioManager.playSfx('CLICK');
  };

  const handleSubtaskToggle = (stepId: string, taskId: string, subtaskId: string) => {
      if (!activeProjectId) return;
      if (isPhaseLocked(activeProjectId, stepId)) {
          addToast("PHASE LOCKED: COMPLETE PREVIOUS PHASE FIRST", "error");
          audioManager.playSfx('ERROR');
          return;
      }
      const currentProject = projects.find(p => p.id === activeProjectId);
      if (!currentProject) return;
      const updatedSteps = currentProject.steps.map(step => {
          if (step.id !== stepId) return step;
          const updatedTasks = step.tasks.map(t => {
              if (t.id !== taskId) return t;
              const updatedSubtasks = (t.subtasks || []).map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
              return { ...t, subtasks: updatedSubtasks };
          });
          return { ...step, tasks: updatedTasks };
      });
      updateProjectProgress(currentProject, updatedSteps);
      audioManager.playSfx('CLICK');
  };

  const updateProjectProgress = (currentProject: AdvancedProject, updatedSteps: Step[]) => {
      const totalTasks = updatedSteps.reduce((acc, s) => acc + s.tasks.length, 0);
      const completedTasks = updatedSteps.reduce((acc, s) => acc + s.tasks.filter(t => t.completed).length, 0);
      const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const finalSteps = updatedSteps.map((step, index) => {
          if (step.status === 'LOCKED' && index > 0) {
              const prevStep = updatedSteps[index - 1];
              const prevStepTasks = prevStep.tasks.length;
              const prevStepDone = prevStep.tasks.filter(t => t.completed).length;
              if (prevStepTasks > 0 && prevStepDone === prevStepTasks) return { ...step, status: 'UNLOCKED' as const };
          }
          if (step.status !== 'LOCKED') {
              const stepTasks = step.tasks.length;
              const stepDone = step.tasks.filter(t => t.completed).length;
              if (stepTasks > 0 && stepDone === stepTasks) return { ...step, status: 'COMPLETED' as const };
          }
          return step;
      });
      const updatedProject = { ...currentProject, steps: finalSteps, progress: newProgress };
      const updatedProjects = projects.map(p => p.id === activeProjectId ? updatedProject : p);
      saveProjectsWithHistory(updatedProjects);
      if (newProgress === 100) { audioManager.playSfx('LEVEL_UP'); addToast("PROJECT EXECUTION COMPLETE", "success"); }
  };

  const getActiveProject = () => projects.find(p => p.id === activeProjectId);

  // --- GRAPH RENDERING (INFINITE CANVAS) ---
  const renderGraph = () => {
      const project = getActiveProject();
      if (!project) return null;
      const themeColor = FIELD_COLORS[project.field] || '#ffffff';

      const nodes: any[] = [];
      const links: any[] = [];
      let yOffset = 100;

      const isMobile = window.innerWidth < 768;
      const xSpacing = isMobile ? 350 : 500;
      const initialX = isMobile ? 50 : 300;

      project.steps.forEach((step, sIdx) => {
          const x = initialX + (sIdx * xSpacing);
          step.tasks.forEach((task, tIdx) => {
              const nodeY = yOffset + (tIdx * 250);
              const nodeId = task.id;
              nodes.push({ id: nodeId, type: 'TASK', data: task, x, y: nodeY, phase: step.title, stepId: step.id });

              // Handle Task Connections
              if (task.connections) {
                  task.connections.forEach(targetId => {
                      links.push({ source: nodeId, target: targetId, type: 'DIRECT' });
                  });
              }

              if (expandedTaskId === task.id) {
                  (task.subtasks || []).forEach((sub, subIdx) => {
                      const totalSubs = task.subtasks?.length || 1;
                      const spacing = isMobile ? 140 : 180;
                      const startX = -(spacing * (totalSubs - 1)) / 2;
                      const xOffset = startX + (subIdx * spacing);
                      const yOffset = 250; 

                      const subNodeId = sub.id;
                      nodes.push({
                          id: subNodeId,
                          type: 'SUBTASK',
                          data: sub,
                          x: x + xOffset,
                          y: nodeY + yOffset,
                          parentId: nodeId,
                          parentTask: task,
                          stepId: step.id
                      });
                      links.push({ source: nodeId, target: subNodeId, type: 'TREE' });

                      // Handle Subtask Connections
                      if (sub.connections) {
                          sub.connections.forEach(targetId => {
                              links.push({ source: subNodeId, target: targetId, type: 'DIRECT' });
                          });
                      }
                  });
              }
          });
      });

      const getCurve = (x1: number, y1: number, x2: number, y2: number, type?: string) => {
          if (type === 'TREE') {
              return `M ${x1 + 100} ${y1 + 100} L ${x1 + 100} ${y2} L ${x2 + 100} ${y2}`;
          }
          const dx = x2 - x1;
          const cp1x = x1 + dx * 0.5;
          return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp1x} ${y2}, ${x2} ${y2}`;
      };

      return (
          <div 
             ref={containerRef}
             className="w-full h-full overflow-hidden bg-black/10 backdrop-blur-sm relative rounded-3xl border border-white/5 shadow-inner cursor-grab active:cursor-grabbing"
             onMouseDown={(e) => {
                 if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
                     setIsDraggingCanvas(true);
                     setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                 }
             }}
             onMouseMove={(e) => {
                 if (isDraggingCanvas) {
                     setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                 }
             }}
             onMouseUp={() => setIsDraggingCanvas(false)}
             onWheel={(e) => {
                 setZoom(z => Math.max(0.2, Math.min(2, z - e.deltaY * 0.001)));
             }}
          >
              <motion.div 
                 style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                 className="absolute inset-0 w-full h-full"
              >
                  {/* Infinite Grid Background */}
                  <div className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none opacity-20">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:40px_40px]" />
                  </div>

                  <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                      {links.map((link, i) => {
                          const s = nodes.find(n => n.id === link.source);
                          const t = nodes.find(n => n.id === link.target);
                          if (!s || !t) return null;
                          
                          const isTree = link.type === 'TREE';
                          
                          // Adjust for transform + infinite offset
                          // Node size offsets: Task w=256(x+128), Subtask w=192(x+96)
                          const sOffsetX = s.type === 'TASK' ? 128 : 96;
                          const sOffsetY = s.type === 'TASK' ? 50 : 40;
                          const tOffsetX = t.type === 'TASK' ? 128 : 96;
                          const tOffsetY = t.type === 'TASK' ? 50 : 40;

                          const startX = s.x + 5000 + sOffsetX;
                          const startY = s.y + 5000 + sOffsetY;
                          const endX = t.x + 5000 + tOffsetX;
                          const endY = t.y + 5000 + tOffsetY;

                          return (
                              <path 
                                key={i} 
                                d={isTree 
                                    ? `M ${s.x + 5120} ${s.y + 5080} C ${s.x + 5120} ${s.y + 5180}, ${t.x + 5080} ${t.y + 4950}, ${t.x + 5080} ${t.y + 5000}` 
                                    : getCurve(startX, startY, endX, endY)} 
                                stroke={themeColor} 
                                strokeWidth={isTree ? "1" : "2"} 
                                fill="none" 
                                className="opacity-60 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                              />
                          );
                      })}
                  </svg>

                  {nodes.map(node => (
                      <motion.div 
                        key={node.id}
                        className={`absolute p-4 rounded-xl border backdrop-blur-md transition-all cursor-pointer group ${node.type === 'TASK' ? 'w-64 bg-zinc-900 border-white/20' : 'w-48 bg-zinc-900 border-white/10'}`}
                        style={{ 
                            left: node.x + 5000, top: node.y + 5000, 
                            borderColor: node.type === 'TASK' ? `${themeColor}80` : `${themeColor}40`,
                            boxShadow: `0 0 20px ${themeColor}10`,
                            zIndex: 10
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if(node.type === 'TASK') {
                                setEditingTask({ task: node.data, stepId: node.stepId });
                            } else if (node.type === 'SUBTASK') {
                                setEditingSubtask({ subtask: node.data, parentTask: node.parentTask, stepId: node.stepId });
                            }
                        }}
                      >
                          {node.type === 'TASK' && <div className="text-[9px] text-gray-500 font-mono mb-1 uppercase tracking-wider">{node.phase}</div>}
                          <div className="font-display font-bold text-sm text-white mb-1 tracking-wide">{node.data.title}</div>
                          {node.data.link_url && (
                              <div className="text-[9px] text-blue-300 bg-blue-900/30 px-2 py-1 rounded inline-block mt-2 border border-blue-500/30">
                                  🔗 LINKED
                              </div>
                          )}
                          {node.type === 'TASK' && (
                              <div className="mt-3 flex gap-1 items-center">
                                  {node.data.subtasks?.map((_:any, i:number) => (
                                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${node.data.subtasks[i].completed ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-700'}`} />
                                  ))}
                                  <span className="ml-2 text-[9px] text-gray-500">{node.data.subtasks?.filter((s:any)=>s.completed).length || 0}/{node.data.subtasks?.length || 0}</span>
                              </div>
                          )}
                          {node.type === 'SUBTASK' && (
                              <div className="mt-2 text-[9px] text-gray-500 font-mono">SUB-NODE</div>
                          )}
                      </motion.div>
                  ))}
              </motion.div>
              
              {/* Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-50">
                  <button onClick={() => setZoom(z => z + 0.1)} className="bg-white/10 p-2 rounded text-white border border-white/5 hover:bg-white/20">+</button>
                  <button onClick={() => { setZoom(1); setPan({x: -4500, y: -4800}); }} className="bg-white/10 p-2 rounded text-white text-xs border border-white/5 hover:bg-white/20">RESET</button>
                  <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="bg-white/10 p-2 rounded text-white border border-white/5 hover:bg-white/20">-</button>
              </div>
          </div>
      );
  };

  const themeColor = getActiveProject() ? FIELD_COLORS[getActiveProject()!.field] : '#fff';

  return (
    <div className="w-full h-full md:h-full min-h-screen bg-[#030303] text-white flex flex-col relative font-sans overflow-x-hidden">
        {/* ... (Existing render logic remains same) ... */}
        {viewState === 'EXECUTION' && getActiveProject() && (
            <ProjectAtmosphere color={themeColor} />
        )}
        
        {viewState !== 'EXECUTION' && (
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-radial from-red-900/10 via-transparent to-black opacity-60" />
                <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
            </div>
        )}

        {/* ... (Header and other components) ... */}
        <header className="h-16 md:h-20 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/80 backdrop-blur-xl z-20 flex-shrink-0 sticky top-0">
            <div className="flex items-center gap-2 md:gap-4">
                <MirrorButton text="← EXIT" onClick={() => viewState === 'EXECUTION' ? setViewState('DASHBOARD') : onBack()} variant="ghost" className="!px-3 md:!px-4 !py-2 !text-[10px] md:!text-xs border-white/10" />
                <h1 className="text-lg md:text-2xl font-display font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] truncate max-w-[180px] md:max-w-none">
                    {viewState === 'EXECUTION' ? getActiveProject()?.title : 'ADVANCED OPERATIONS'}
                </h1>
            </div>
            {viewState === 'EXECUTION' && getActiveProject() && (
                <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500">
                    <div>STYLE: {getActiveProject()?.execution_style}</div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <div>PROGRESS: {getActiveProject()?.progress}%</div>
                </div>
            )}
            {viewState === 'DASHBOARD' && (
                <div className="flex gap-4">
                    <MirrorButton text="+ NEW QUEST" onClick={() => { setStep(1); setViewState('QUEST_WIZARD'); }} className="!px-4 md:!px-8 !text-[10px] md:!text-sm" />
                </div>
            )}
        </header>

        {/* TASK DETAIL PANEL (SLIDE OVER) */}
        <AnimatePresence>
            {editingTask && (
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-black/95 backdrop-blur-2xl border-l border-white/10 z-[100] shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="font-display text-xl tracking-widest uppercase" style={{ color: themeColor }}>Tactical Detail</h3>
                        <button onClick={() => setEditingTask(null)} className="text-gray-500 hover:text-white p-2">✕ ESC</button>
                    </div>
                    {/* ... (Existing Task Detail UI) ... */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Directive Name</label>
                            <input 
                                value={editingTask.task.title} 
                                onChange={(e) => saveTaskDetails({...editingTask.task, title: e.target.value})}
                                className="w-full bg-black border border-white/20 rounded-xl p-4 text-lg font-display text-white focus:border-white/50 outline-none transition-colors"
                            />
                        </div>
                        {/* ... Rest of Task Details ... */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Description</label>
                            <textarea 
                                value={editingTask.task.description || ''} 
                                onChange={(e) => saveTaskDetails({...editingTask.task, description: e.target.value})}
                                placeholder="Enter tactical briefing..."
                                className="w-full h-32 bg-black border border-white/20 rounded-xl p-4 text-sm font-mono text-gray-300 focus:border-white/50 outline-none resize-none"
                            />
                        </div>
                        {/* Complexity & XP */}
                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Complexity</label>
                                <div className="flex gap-1 flex-wrap">
                                    {['E','D','C','B','A','S'].map(rank => (
                                        <button
                                            key={rank}
                                            onClick={() => saveTaskDetails({...editingTask.task, complexity: rank as any})}
                                            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${editingTask.task.complexity === rank ? 'bg-white text-black scale-110' : 'bg-black border border-white/20 text-gray-500 hover:border-white'}`}
                                        >
                                            {rank}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">XP Reward</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => saveTaskDetails({...editingTask.task, xp_value: Math.max(0, editingTask.task.xp_value - 10)})} className="text-gray-500 hover:text-white px-2 border border-white/10 rounded">-</button>
                                    <input 
                                        type="number"
                                        value={editingTask.task.xp_value}
                                        onChange={(e) => saveTaskDetails({...editingTask.task, xp_value: parseInt(e.target.value) || 0})}
                                        className="w-full bg-black border border-white/20 rounded px-2 py-1 text-white font-mono text-xs text-center"
                                    />
                                    <button onClick={() => saveTaskDetails({...editingTask.task, xp_value: editingTask.task.xp_value + 10})} className="text-gray-500 hover:text-white px-2 border border-white/10 rounded">+</button>
                                </div>
                            </div>
                        </div>
                        {/* Subtasks */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Sub-Directives</label>
                                <button 
                                    onClick={() => {
                                        const newSub: Subtask = { id: `sub-${Date.now()}`, title: '', completed: false };
                                        saveTaskDetails({ ...editingTask.task, subtasks: [...(editingTask.task.subtasks || []), newSub] });
                                    }}
                                    className="text-[10px] bg-white/10 px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    + ADD
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(editingTask.task.subtasks || []).map((sub, idx) => (
                                    <div key={sub.id} className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-2 group hover:border-white/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={sub.completed}
                                                onChange={() => handleSubtaskToggle(editingTask.stepId, editingTask.task.id, sub.id)}
                                                className="accent-green-500 w-4 h-4 rounded cursor-pointer"
                                            />
                                            <input 
                                                value={sub.title}
                                                onChange={(e) => {
                                                    const updatedSubs = [...editingTask.task.subtasks];
                                                    updatedSubs[idx].title = e.target.value;
                                                    saveTaskDetails({ ...editingTask.task, subtasks: updatedSubs });
                                                }}
                                                placeholder="Subtask name..."
                                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-600"
                                            />
                                            <button onClick={() => {
                                                const updatedSubs = editingTask.task.subtasks.filter((_, i) => i !== idx);
                                                saveTaskDetails({ ...editingTask.task, subtasks: updatedSubs });
                                            }} className="text-gray-600 hover:text-red-500">×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* SUBTASK DETAIL PANEL (UPDATED) */}
            {editingSubtask && (
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-black/95 backdrop-blur-2xl border-l border-white/10 z-[101] shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="font-display text-lg tracking-widest uppercase text-blue-400">Sub-Protocol Detail</h3>
                        <button onClick={() => setEditingSubtask(null)} className="text-gray-500 hover:text-white p-2">✕ ESC</button>
                    </div>
                    
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="text-[10px] font-mono text-gray-500">
                            PARENT: {editingSubtask.parentTask.title}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Title</label>
                            <input 
                                value={editingSubtask.subtask.title} 
                                onChange={(e) => saveSubtaskDetails({...editingSubtask.subtask, title: e.target.value})}
                                className="w-full bg-black border border-white/20 rounded-xl p-4 text-white font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Description / Notes</label>
                            <textarea 
                                value={editingSubtask.subtask.description || ''} 
                                onChange={(e) => saveSubtaskDetails({...editingSubtask.subtask, description: e.target.value})}
                                placeholder="Details..."
                                className="w-full h-32 bg-black border border-white/20 rounded-xl p-4 text-sm font-mono text-gray-300 resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Link Resource</label>
                            <input 
                                value={editingSubtask.subtask.link_url || ''} 
                                onChange={(e) => saveSubtaskDetails({...editingSubtask.subtask, link_url: e.target.value})}
                                placeholder="https://..."
                                className="w-full bg-black border border-white/20 rounded-xl p-4 text-xs font-mono text-white"
                            />
                            {editingSubtask.subtask.link_url && (
                                <a href={editingSubtask.subtask.link_url} target="_blank" rel="noreferrer" className="block text-center py-2 bg-blue-900/30 border border-blue-500/50 rounded-lg text-xs text-blue-400 hover:bg-blue-900/50 transition-colors uppercase font-mono tracking-widest">
                                    OPEN RESOURCE ↗
                                </a>
                            )}
                        </div>

                        {/* Connection Linking */}
                        <div className="space-y-2 pt-4 border-t border-white/10">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Graph Connections</label>
                            <div className="flex gap-2 flex-wrap">
                                {editingSubtask.subtask.connections?.map(cid => (
                                    <div key={cid} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono">
                                        LINKED
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => {
                                    setLinkModalOpen(true);
                                    setSourceTaskForLink({ 
                                        stepId: editingSubtask.stepId, 
                                        subtaskId: editingSubtask.subtask.id 
                                    });
                                }} 
                                className="w-full py-2 border border-dashed border-white/20 text-xs font-mono text-gray-400 hover:text-white hover:border-white/50 transition-all rounded-lg"
                            >
                                + LINK TO NODE
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* LINKING MODAL */}
            <AnimatePresence>
                {linkModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setLinkModalOpen(false)}
                    >
                        <div className="bg-black border border-white/20 rounded-2xl p-6 w-full max-w-md h-[400px] flex flex-col" onClick={e => e.stopPropagation()}>
                            <h3 className="font-display text-xl mb-4">Select Target Node</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {getActiveProject()?.steps.flatMap(s => s.tasks).map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => handleConfirmLink(t.id)}
                                        className="p-3 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer flex justify-between items-center"
                                    >
                                        <span className="font-mono text-sm">{t.title}</span>
                                        <span className="text-[9px] text-gray-500">TASK</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setLinkModalOpen(false)} className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-mono text-xs">CANCEL</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ... Rest of existing JSX ... */}
            {viewState === 'DASHBOARD' && (
                    <motion.div key="dashboard" className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
                        {/* ... Existing Dashboard Content ... */}
                        <div className="grid grid-cols-1 gap-8">
                            {missions.map(mission => (
                                <div key={mission.id} className="bg-black/60 border border-white/10 rounded-3xl p-6 md:p-8 hover:border-red-500/30 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">{mission.vision}</h2>
                                            <div className="flex gap-2 flex-wrap">
                                                {mission.objectives.slice(0, 3).map((obj, i) => (
                                                    <span key={i} className="text-[10px] font-mono border border-white/10 px-2 py-1 rounded bg-white/5 text-gray-400">{obj}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl md:text-4xl font-bold font-display text-white/20 group-hover:text-red-500/50 transition-colors">
                                                {projects.filter(p => mission.projects.includes(p.id)).length} PROJECTS
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                        {projects.filter(p => mission.projects.includes(p.id)).map(proj => (
                                            <motion.div key={proj.id} onClick={() => openExecutionView(proj.id)} whileHover={{ scale: 1.02 }} className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer group/card">
                                                <div className="absolute top-0 right-0 p-2 opacity-50">
                                                    <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: FIELD_COLORS[proj.field] || '#fff', color: FIELD_COLORS[proj.field] }} />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{proj.execution_style}</span>
                                                    <h4 className="font-display font-bold text-lg mt-1 group-hover/card:text-red-400 transition-colors">{proj.title}</h4>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                                                        <span>PROGRESS</span>
                                                        <span>{proj.progress}%</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-600" style={{ width: `${proj.progress}%` }} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        <button onClick={() => initProjectWizard(mission.id)} className="border border-red-500/20 bg-red-900/10 rounded-xl flex flex-col items-center justify-center h-36 hover:bg-red-900/20 hover:border-red-500/50 transition-all text-red-400 gap-2 group/btn">
                                            <div className="w-8 h-8 rounded-full border border-red-500/50 flex items-center justify-center group-hover/btn:bg-red-500 group-hover/btn:text-black transition-all">+</div>
                                            <span className="font-mono text-xs uppercase tracking-widest">INITIALIZE PROJECT</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* --- EXECUTION VIEW RESPONSIVE --- */}
                {viewState === 'EXECUTION' && getActiveProject() && (
                    <motion.div key="execution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2 flex-1 w-full md:w-auto" style={{ borderColor: `${themeColor}40` }}>
                                {isGraphMode ? 'TACTICAL NETWORK MAP' : 'EXECUTION TIMELINE'}
                            </h3>
                            <div className="flex gap-2 self-end">
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                    <button onClick={handleUndo} disabled={history.length===0} className={`px-3 py-1 rounded text-[10px] font-mono transition-all ${history.length===0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>↶ UNDO</button>
                                    <button onClick={handleRedo} disabled={future.length===0} className={`px-3 py-1 rounded text-[10px] font-mono transition-all ${future.length===0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>↷ REDO</button>
                                </div>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => setIsGraphMode(false)} className={`px-3 py-1 rounded text-[10px] font-mono transition-all ${!isGraphMode ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>LIST</button>
                                    <button onClick={() => setIsGraphMode(true)} className={`px-3 py-1 rounded text-[10px] font-mono transition-all ${isGraphMode ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>GRAPH</button>
                                </div>
                            </div>
                        </div>

                        {isGraphMode ? (
                            <div className="h-[80vh] md:h-[600px] w-full">{renderGraph()}</div>
                        ) : (
                            <div className="flex flex-col lg:flex-row gap-8 items-start h-full lg:overflow-hidden">
                                {/* LEFT COLUMN: PHASES (Horizontal Scroll on Mobile, Sidebar on Desktop) */}
                                <div className="w-full lg:w-1/3 lg:min-w-[300px] flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto custom-scrollbar lg:h-full lg:pr-4 relative border-b lg:border-b-0 border-white/10 pb-4 lg:pb-0 shrink-0">
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 z-0 hidden lg:block" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
                                    
                                    {getActiveProject()!.steps.map((phase, index) => (
                                        <div key={phase.id} className="min-w-[280px] lg:min-w-0 lg:pl-12 relative group shrink-0">
                                            {/* Desktop Dot */}
                                            <div className="hidden lg:flex absolute left-[-11px] top-6 w-6 h-6 rounded-full border-4 border-black z-20 items-center justify-center transition-all duration-500" style={{ backgroundColor: phase.status === 'UNLOCKED' ? themeColor : '#333', boxShadow: phase.status === 'UNLOCKED' ? `0 0 20px ${themeColor}` : 'none' }}>
                                                <div className="w-2 h-2 rounded-full bg-black" />
                                            </div>
                                            
                                            <div className={`p-6 rounded-2xl border transition-all duration-300 h-full ${phase.status === 'UNLOCKED' ? 'bg-gradient-to-r from-white/10 to-transparent border-white/20' : 'bg-black/40 border-white/5 opacity-60'}`} style={{ borderColor: phase.status === 'UNLOCKED' ? `${themeColor}60` : undefined }}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">PHASE 0{index + 1}</span>
                                                    {phase.status === 'COMPLETED' && <span className="text-[10px] text-green-500">✓ CLEARED</span>}
                                                </div>
                                                
                                                {editingPhaseId === phase.id ? (
                                                    <input 
                                                        autoFocus
                                                        value={phase.title}
                                                        onChange={(e) => updatePhaseTitle(phase.id, e.target.value)}
                                                        onBlur={() => setEditingPhaseId(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingPhaseId(null)}
                                                        className="bg-transparent border-b border-white/20 text-xl font-display font-bold text-white w-full outline-none mb-2"
                                                    />
                                                ) : (
                                                    <h4 
                                                        onClick={() => setEditingPhaseId(phase.id)}
                                                        className="font-display font-bold text-xl leading-none mb-2 cursor-pointer hover:text-white/80 transition-colors group/title truncate"
                                                    >
                                                        {phase.title} <span className="text-[10px] opacity-0 group-hover/title:opacity-50 ml-2">✎</span>
                                                    </h4>
                                                )}

                                                <div className="mt-4 flex gap-2">
                                                    <div className="text-[9px] font-mono px-2 py-1 rounded bg-black/50 border border-white/10 whitespace-nowrap">{phase.tasks.length} TASKS</div>
                                                    <div className="text-[9px] font-mono px-2 py-1 rounded bg-black/50 border border-white/10 whitespace-nowrap">{phase.tasks.filter(t=>t.completed).length} DONE</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button onClick={handleAddPhase} className="min-w-[60px] lg:w-[calc(100%-3rem)] lg:ml-12 lg:py-4 rounded-xl border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/50 transition-all font-mono text-xs flex items-center justify-center gap-2 group bg-black/20 shrink-0">
                                        <span className="text-lg group-hover:scale-125 transition-transform" style={{ color: themeColor }}>+</span> <span className="hidden lg:inline">ADD PHASE</span>
                                    </button>
                                </div>

                                {/* RIGHT COLUMN: TASKS (Vertical Scroll on Mobile) */}
                                <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-4 md:p-8 h-auto lg:h-full w-full lg:overflow-y-auto custom-scrollbar flex flex-col relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${themeColor}, transparent)` }} />
                                    
                                    <div className="space-y-6 relative z-10">
                                        {getActiveProject()!.steps.map(phase => (
                                            <div key={phase.id} className={phase.status === 'LOCKED' ? 'opacity-80' : ''}>
                                                <h4 className="text-xs font-mono text-gray-500 mb-4 pl-2 border-l-2 flex justify-between" style={{ borderColor: themeColor }}>
                                                    <span>{phase.title}</span>
                                                    {phase.status === 'LOCKED' && <span className="text-red-500 text-[10px] animate-pulse">LOCKED (EDIT ONLY)</span>}
                                                </h4>
                                                <div className="space-y-3">
                                                    {phase.tasks.map(task => (
                                                        <motion.div layout key={task.id} className={`border rounded-xl transition-all group ${task.completed ? 'bg-black/40 border-white/5 opacity-50' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'}`}>
                                                            <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
                                                                <div className="flex items-start gap-4">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleTaskComplete(phase.id, task.id); }} 
                                                                        className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${task.completed ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-white'}`}
                                                                    >
                                                                        {task.completed && <span className="text-[10px] text-black">✓</span>}
                                                                    </button>
                                                                    <div>
                                                                        <h5 className={`font-display text-sm tracking-wide ${task.completed ? 'line-through text-gray-600' : 'text-gray-200'}`}>{task.title}</h5>
                                                                        {task.description && <p className="text-[10px] text-gray-500 line-clamp-1 mt-1">{task.description}</p>}
                                                                        {task.link_url && (
                                                                            <a 
                                                                                href={task.link_url} 
                                                                                target="_blank" 
                                                                                rel="noreferrer" 
                                                                                onClick={e => e.stopPropagation()} 
                                                                                className="inline-flex items-center gap-1 mt-2 text-[9px] px-3 py-1 rounded-md bg-blue-900/30 text-blue-300 border border-blue-500/30 hover:bg-blue-900/60 hover:text-white hover:border-blue-400 font-mono transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                                                                            >
                                                                                <span>🔗</span> {task.link_label || 'NEURAL LINK'}
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingTask({ task, stepId: phase.id }); }} className="text-[10px] font-mono text-gray-500 hover:text-white px-2 py-1 rounded border border-transparent hover:border-white/10">EDIT</button>
                                                                    <span className={`text-xs transition-transform duration-300 ${expandedTaskId === task.id ? 'rotate-180' : ''}`}>▼</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <AnimatePresence>
                                                                {expandedTaskId === task.id && (
                                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5 bg-black/20">
                                                                        <div className="p-4 pl-12 space-y-2">
                                                                            {(task.subtasks || []).map(sub => (
                                                                                <div key={sub.id} className="flex items-center justify-between group/sub">
                                                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSubtaskToggle(phase.id, task.id, sub.id)}>
                                                                                        <div className={`w-3 h-3 rounded-full border transition-colors flex-shrink-0 ${sub.completed ? 'bg-white border-white' : 'border-white/20 group-hover/sub:border-white'}`} style={{ backgroundColor: sub.completed ? themeColor : 'transparent' }} />
                                                                                        <span className={`text-xs font-mono ${sub.completed ? 'line-through text-gray-600' : 'text-gray-400'}`}>{sub.title || 'Untitled Subtask'}</span>
                                                                                    </div>
                                                                                    {sub.link_url && (
                                                                                        <a 
                                                                                            href={sub.link_url} 
                                                                                            target="_blank" 
                                                                                            rel="noreferrer" 
                                                                                            onClick={e => e.stopPropagation()}
                                                                                            className="ml-2 text-[9px] bg-white/5 hover:bg-blue-900/40 text-gray-400 hover:text-blue-300 border border-white/10 hover:border-blue-500/50 px-2 py-0.5 rounded transition-all uppercase tracking-wider font-mono flex-shrink-0"
                                                                                        >
                                                                                            ACCESS ↗
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingTask({ task, stepId: phase.id }); }} className="text-[10px] text-gray-600 hover:text-white mt-2 font-mono flex items-center gap-1">
                                                                                <span>+</span> MANAGE SUB-DIRECTIVES
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            {/* SHOW MAP BUTTON */}
                                                            <div className="p-2 border-t border-white/5">
                                                                <MirrorButton 
                                                                    text="SHOW MAP" 
                                                                    onClick={(e) => { 
                                                                        e?.stopPropagation(); 
                                                                        setExpandedTaskId(task.id); 
                                                                        setIsGraphMode(true); 
                                                                    }} 
                                                                    variant="ghost" 
                                                                    className="!w-full !py-2 !text-[10px] !rounded-lg border-white/10 hover:bg-white/5" 
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                    <button onClick={() => {
                                                        const newTask = { id: `t-${Date.now()}`, title: 'NEW DIRECTIVE', created_at: new Date().toISOString(), temple_id: getActiveProject()!.field, complexity: 'C', xp_value: 20, completed: false, subtasks: [], user_id: userId } as Task;
                                                        const updatedSteps = projects.find(p=>p.id===activeProjectId)!.steps.map(s => s.id === phase.id ? { ...s, tasks: [...s.tasks, newTask] } : s);
                                                        saveProjectsWithHistory(projects.map(p=>p.id===activeProjectId ? { ...p, steps: updatedSteps } : p));
                                                        setEditingTask({ task: newTask, stepId: phase.id });
                                                    }} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-600 hover:text-white hover:border-white/30 text-xs font-mono transition-all bg-white/5">
                                                        + ADD DIRECTIVE
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            {/* ... Rest of existing JSX ... */}
            {viewState === 'QUEST_WIZARD' && (
                    <motion.div key="quest_wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-4 md:p-8">
                        <div className="max-w-2xl w-full text-center space-y-8">
                            <h2 className="text-2xl md:text-4xl font-display font-bold text-white">DEFINE THE VISION</h2>
                            <input autoFocus value={questDraft.name} onChange={(e) => setQuestDraft({...questDraft, name: e.target.value})} placeholder="e.g. BUILD EMPIRE" className="w-full bg-transparent border-b-2 border-white/20 text-center text-xl md:text-3xl font-display text-white py-4 outline-none focus:border-red-500" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {FIELDS.map(f => (
                                    <button key={f} onClick={() => toggleQuestField(f)} className={`p-4 rounded-xl border text-xs md:text-sm ${questDraft.fields.includes(f) ? 'bg-red-900/40 border-red-500' : 'bg-black/40 border-white/10 text-gray-500'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => handleQuestCompletion('MANUAL')} className="p-6 border border-white/10 rounded-xl bg-black/40">MANUAL</button>
                                <button onClick={() => handleQuestCompletion('AI')} className="p-6 border border-red-500/30 rounded-xl bg-red-900/10 text-red-400">{isGenerating ? 'GENERATING...' : 'AI ARCHITECT'}</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- PROJECT WIZARD --- */}
                {viewState === 'PROJECT_WIZARD' && (
                    <motion.div key="project_wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-4 md:p-8">
                        <div className="max-w-2xl w-full text-center space-y-8">
                             {step === 1 && (
                                <>
                                    <h2 className="text-2xl md:text-3xl font-display">PROJECT NAME</h2>
                                    <input value={projectDraft.name} onChange={e => setProjectDraft({...projectDraft, name: e.target.value})} className="w-full bg-transparent border-b border-white/20 text-xl md:text-2xl text-center py-2" />
                                    <MirrorButton text="NEXT" onClick={() => setStep(2)} />
                                </>
                             )}
                             {step === 2 && (
                                <>
                                    <h2 className="text-2xl md:text-3xl font-display">FIELD</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{FIELDS.map(f => <button key={f} onClick={() => setProjectDraft({...projectDraft, field: f})} className={`p-4 border text-xs md:text-sm ${projectDraft.field === f ? 'bg-white/10 border-white' : 'border-white/10'}`}>{f}</button>)}</div>
                                    <div className="flex gap-4 justify-center"><MirrorButton text="BACK" onClick={() => setStep(1)} /><MirrorButton text="NEXT" onClick={() => setStep(3)} /></div>
                                </>
                             )}
                             {step === 3 && (
                                <>
                                    <h2 className="text-2xl md:text-3xl font-display">STYLE</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{['STRUCTURED', 'PARALLEL', 'SPRINT'].map(s => <button key={s} onClick={() => setProjectDraft({...projectDraft, style: s as any})} className={`p-4 border text-xs md:text-sm ${projectDraft.style === s ? 'bg-white/10 border-white' : 'border-white/10'}`}>{s}</button>)}</div>
                                    <div className="flex gap-4 justify-center"><MirrorButton text="BACK" onClick={() => setStep(2)} /><MirrorButton text="NEXT" onClick={() => setStep(4)} /></div>
                                </>
                             )}
                             {step === 4 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button onClick={() => handleProjectCompletion('MANUAL')} className="p-8 border border-white/10">MANUAL</button>
                                    <button onClick={() => handleProjectCompletion('AI')} className="p-8 border border-red-500">AI GENERATE</button>
                                </div>
                             )}
                        </div>
                    </motion.div>
                )}
        </AnimatePresence>
    </div>
  );
};

export default AdvancedWorkspace;
