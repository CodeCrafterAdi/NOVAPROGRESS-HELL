
import { supabase } from './supabaseClient';
import { Task, UserProfile } from '../types';

// --- PROFILES ---

export const createProfile = async (userId: string, email: string, username: string) => {
  return await supabase.from('profiles').insert({ id: userId, email, username });
};

export const getProfile = async (userId: string) => {
  return await supabase.from('profiles').select('*').eq('id', userId).single();
};

export const updateProfile = async (userId: string, data: Partial<UserProfile>) => {
  return await supabase.from('profiles').update(data).eq('id', userId);
};

// --- TASKS ---

export const createTask = async (userId: string, taskData: Partial<Task>) => {
  return await supabase.from('tasks').insert({ ...taskData, user_id: userId });
};

export const getTasks = async (userId: string) => {
  return await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
};

export const updateTask = async (taskId: string, data: Partial<Task>) => {
  return await supabase.from('tasks').update(data).eq('id', taskId);
};

// --- PROJECTS ---

export const createProject = async (userId: string, projectData: any) => {
  return await supabase.from('projects').insert({ ...projectData, user_id: userId });
};

export const getProjects = async (userId: string) => {
  return await supabase.from('projects').select('*').eq('user_id', userId);
};

// --- GAMIFICATION ---

export const getGamification = async (userId: string) => {
  return await supabase.from('gamification').select('*').eq('user_id', userId).single();
};

export const addXP = async (userId: string, amount: number) => {
  // Try RPC first (atomic), fallback to manual update if RPC not set
  const { data, error } = await supabase.rpc('add_xp', { user_id_input: userId, amount_input: amount });
  
  if (error) {
    // Manual fallback
    const { data: current } = await supabase.from('gamification').select('xp, level').eq('user_id', userId).single();
    if (current) {
      const newXp = current.xp + amount;
      // Simple logic: level up every 100 XP
      const newLevel = Math.floor(newXp / 100) + 1;
      return await supabase.from('gamification').update({ xp: newXp, level: newLevel }).eq('user_id', userId);
    }
  }
  return data;
};
