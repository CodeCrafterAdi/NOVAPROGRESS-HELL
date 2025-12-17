
import { GoogleGenAI } from "@google/genai";
import { Task, UserProfile } from "../types";

/* -------------------------------------------------------------------------- */
/*                                NOVA SYSTEM V8                              */
/*                       AI INTELLIGENCE CORE & ANALYSIS                      */
/* -------------------------------------------------------------------------- */

const env = (import.meta as any).env || {};

// --- HELPER: GET CLIENT ---
const getClient = (apiKey: string) => {
  if (!apiKey) throw new Error("LINK_SEVERED: NO API KEY DETECTED.");
  return new GoogleGenAI({ apiKey });
};

// --- HELPER: ERROR HANDLER ---
const handleAIError = (error: any): string => {
  const msg = error.toString().toLowerCase();
  if (msg.includes("400") || msg.includes("invalid argument") || msg.includes("key not valid")) {
    return "CRITICAL FAILURE: API KEY INVALID. PLEASE UPDATE CREDENTIALS IN IDENTITY.";
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
    return "SYSTEM OVERLOAD: API QUOTA EXCEEDED. TRY AGAIN LATER.";
  }
  return `PROCESSING ERROR: ${msg.substring(0, 60)}...`;
};

// --- HELPER: SANITIZE JSON ---
const cleanJSON = (text: string): string => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/* -------------------------------------------------------------------------- */
/*                            CORE ANALYSIS MODULES                           */
/* -------------------------------------------------------------------------- */

export const analyzePhysiqueImage = async (base64Image: string, userKey?: string): Promise<string> => {
  try {
    const key = userKey || env.VITE_GEMINI_API_KEY;
    if (!key) return "SYSTEM ERROR: No API Key found in Identity Module.";

    const ai = getClient(key);
    // Ensure we strip header if present, though split usually handles it.
    const cleanBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: `Act as an elite fitness coach (Nova System). Analyze physique. 1. Body fat range. 2. Strong point. 3. Weak point. 4. One specific training directive. Tone: Dark, Cyberpunk.` }
        ]
      }
    });
    return response.text || "Analysis complete.";
  } catch (error) { return handleAIError(error); }
};

export const generateRoadmapSuggestions = async (currentTasks: Task[], userKey?: string): Promise<string> => {
  try {
    const key = userKey || env.VITE_GEMINI_API_KEY;
    const ai = getClient(key);
    const taskList = currentTasks.map(t => `- [${t.temple_id}] ${t.title} (${t.completed ? 'DONE' : 'PENDING'})`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: `Nova System Oracle. Analyze roadmap:\n${taskList}\nSuggest 3 next-step tasks to optimize growth. Format: 1. [CAT] Task - Reason. Tone: Elite.` }]
      }
    });
    return response.text || "No directives.";
  } catch (error) { return handleAIError(error); }
};

export const parseVoiceCommand = async (transcript: string, userKey?: string): Promise<any> => {
  try {
    const key = userKey || env.VITE_GEMINI_API_KEY;
    const ai = getClient(key);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [{
                text: `Voice Command Processor. Input: "${transcript}". Return JSON only.
                If creating task: { "type": "CREATE_TASK", "title": "...", "temple_id": "HOME"|"FITNESS"|"...", "xp": 10-50, "complexity": "D" }
                If creating category: { "type": "CREATE_CATEGORY", "name": "...", "color": "hex" }
                Else: { "type": "UNKNOWN" }`
            }]
        }
    });
    return JSON.parse(cleanJSON(response.text || "{}"));
  } catch (e) { return { type: "UNKNOWN" }; }
};

/* -------------------------------------------------------------------------- */
/*                            V8 ENGINE EXTENSIONS                            */
/* -------------------------------------------------------------------------- */

export const generatePlanOrBreakdown = async (goal: string, mode: 'DAILY' | 'PROJECT', userKey?: string): Promise<any> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const prompt = mode === 'DAILY' 
            ? `Generate a high-performance daily schedule/plan for today based on this context: "${goal}". Return a JSON array of tasks. Each task: { "title": "...", "temple_id": "HOME", "xp": 10 }.`
            : `Break down this project: "${goal}" into a roadmap of 5-7 actionable steps. Return JSON array. Each step: { "title": "...", "temple_id": "BUSINESS", "xp": 50 }.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt + " JSON ONLY. No markdown." }] }
        });
        return JSON.parse(cleanJSON(response.text || "[]"));
    } catch (e) { return []; }
};

// NEW: Deep Hierarchical Generation for Advanced Workspace
export const generateQuestStructure = async (vision: string, fields: string[], intensity: string, userKey?: string): Promise<any> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const prompt = `
            Act as a Strategic Life Architect.
            Create a Quest Structure for vision: "${vision}".
            Fields: ${fields.join(', ')}.
            Intensity: ${intensity}.
            
            Return JSON ONLY with this structure:
            {
                "objectives": ["string", "string"],
                "kpis": ["string", "string"],
                "projects": []
            }
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch(e) { console.error(e); return null; }
};

// NEW: Granular Project Phase Generation
export const generateProjectPhases = async (title: string, field: string, style: string, userKey?: string): Promise<any> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const prompt = `
            Create an Execution Plan for Project: "${title}" in Field: "${field}".
            Execution Style: "${style}".
            
            Return JSON ONLY array of 3 Phases.
            Each Phase must have 2-3 Tasks.
            Each Task must have 2-3 Subtasks.
            
            Structure:
            [
                {
                    "id": "gen-1",
                    "title": "PHASE 1: ...",
                    "order": 1,
                    "status": "UNLOCKED",
                    "tasks": [
                        { 
                            "id": "t1", 
                            "title": "Task title", 
                            "xp_value": 50, 
                            "completed": false, 
                            "temple_id": "${field}",
                            "subtasks": [
                                { "id": "s1", "title": "Subtask 1", "completed": false }
                            ]
                        }
                    ]
                }
            ]
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] }
        });
        return JSON.parse(cleanJSON(response.text || "[]"));
    } catch(e) { console.error(e); return []; }
};

export const doctorHabit = async (failingTaskTitle: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `User is failing habit: "${failingTaskTitle}". Act as Nova Habit Doctor. 1. Why they likely failed (1 sentence). 2. A "Micro-Version" of the habit (e.g., 2 mins). 3. A new cue/trigger. Tone: Clinical, helpful but strict.` }] }
        });
        return response.text || "Habit prognosis unavailable.";
    } catch (e) { return handleAIError(e); }
};

export const getDemonMessage = async (missedTasksCount: number, userKey?: string): Promise<string> => {
     try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Act as a brutal, hell-themed Accountability Demon. The user missed ${missedTasksCount} tasks yesterday. Give them a 1-sentence motivation that borders on a threat. Use words like "Disgrace", "Soul", "Abyss", "Weakness".` }] }
        });
        return response.text || "Your silence is noted.";
    } catch (e) { return "Do not fail again."; }
};

export const getDecisionAdvice = async (dilemma: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `User Dilemma: "${dilemma}". Act as Nova Decision Engine. Output: 1. VERDICT (Do it / Don't do it / Pivot). 2. REASONING (Bullet point). 3. ALTERNATIVE PATH. Tone: Absolute logic.` }] }
        });
        return response.text || "Insufficient data for decision.";
    } catch (e) { return handleAIError(e); }
};

export const generateRitual = async (type: string, userKey?: string): Promise<any[]> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Create a perfect "${type}" ritual. Return JSON array of 3-5 steps (strings). JSON ONLY. Short concise steps.` }] }
        });
        return JSON.parse(cleanJSON(response.text || "[]"));
    } catch (e) { return ["Breathe", "Focus", "Execute"]; }
};

// --- NEW MODULES (V8 EXPANSION) ---

// 1. SKILL ARCHITECT: Generates a skill tree (JSON)
export const runSkillArchitect = async (skill: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Create a learning path for "${skill}". Break it down into 3 Phases (Beginner, Intermediate, Master). Return as a structured list with checkboxes. Tone: Academic, rigorous.` }] }
        });
        return response.text || "Architect offline.";
    } catch (e) { return handleAIError(e); }
};

// 2. WAR ROOM STRATEGY: Tactical advice for business/competition
export const runWarRoomStrategy = async (scenario: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Act as a Military Strategist for Business/Life. Scenario: "${scenario}". Give 3 Tactical Options: Aggressive, Defensive, and Guerrilla. Tone: Sun Tzu meets Cyberpunk.` }] }
        });
        return response.text || "Strategy offline.";
    } catch (e) { return handleAIError(e); }
};

// 3. BIO-HACKER PROTOCOL: Health advice
export const runBioHack = async (goal: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Act as a Bio-Hacker. User Goal: "${goal}". Provide a protocol involving: 1. Supplement Stack (Safe/Legal). 2. Sleep Routine. 3. Diet Adjustment. Tone: Clinical efficiency.` }] }
        });
        return response.text || "Bio-module offline.";
    } catch (e) { return handleAIError(e); }
};

// 4. CODEX WRITER: Content generation
export const runCodexWriter = async (topic: string, userKey?: string): Promise<string> => {
    try {
        const key = userKey || env.VITE_GEMINI_API_KEY;
        const ai = getClient(key);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Write a high-impact journal entry or manifesto about "${topic}". Tone: Inspiring, dark, powerful. Max 200 words.` }] }
        });
        return response.text || "Codex offline.";
    } catch (e) { return handleAIError(e); }
};
