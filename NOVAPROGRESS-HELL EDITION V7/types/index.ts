
export type UserLevel = {
  level: number;
  xp: number;
  max_xp: number;
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
};

// Relaxed to string to allow custom user categories
export type TempleType = string;

export type Complexity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface Category {
  id: string;
  label: string;
  icon: string | React.ReactNode;
  color: string;
  isCustom?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  xp?: number;
  icon?: string;
  isBlocker?: boolean;
  // V8 Upgrades
  description?: string;
  link_url?: string;
  link_label?: string;
  connections?: string[]; // IDs of other tasks/subtasks this connects to
}

export interface Task {
  id: string;
  created_at: string;
  title: string;
  description?: string; // Rich description
  link_url?: string;    // Executable Link URL
  link_label?: string;  // Link Display Name
  temple_id: TempleType;
  complexity: Complexity;
  xp_value: number;
  due_date?: string;
  completed: boolean;
  subtasks: Subtask[]; // stored as JSONB in Supabase
  link?: string; // Legacy link field, kept for backward compat
  user_id: string;
  
  // Visual coordinates for Roadmap/Node Editor
  x?: number;
  y?: number;
  
  // Roadmap specific
  connections?: string[]; // Array of IDs this node points TO
  linked_asset_id?: string; // ID of a task in another category this node represents/depends on
  icon_key?: string; // Specific icon selection
  
  // Advanced Mode Fields
  step_id?: string;
  duration_est?: string;
  progress_percent?: number;

  // Habit Tracker Fields
  habit_frequency?: string[]; // ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  habit_history?: Record<string, boolean>; // { '2023-10-01': true, ... }
  streak_current?: number;
  streak_best?: number;
}

export interface Step {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
  status: 'LOCKED' | 'UNLOCKED' | 'COMPLETED'; // Enhanced Status
  is_phase?: boolean; // Marker for Phase system
}

export interface AdvancedProject {
  id: string;
  title: string;
  field: 'BUSINESS' | 'TECH' | 'FITNESS' | 'SKILLS' | 'PERSONAL' | 'OTHER';
  mission_id?: string;
  steps: Step[]; // These act as Phases
  progress: number;
  user_id: string;
  execution_style?: 'STRUCTURED' | 'PARALLEL' | 'SPRINT'; // New Execution Logic
}

export interface Mission {
  id: string;
  vision: string;
  objectives: string[];
  kpis: string[];
  projects: string[]; // Project IDs
  user_id: string;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  ai_analysis?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  avatar_url?: string;
  username: string;
  height: string;
  weight: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  bio: string;
  posts?: Post[]; // Array of journal entries
  stats?: any;
  api_key?: string; // Local storage for Gemini Key
  ai_credits?: number;
  is_premium?: boolean; // $299 Lifetime Access
}
