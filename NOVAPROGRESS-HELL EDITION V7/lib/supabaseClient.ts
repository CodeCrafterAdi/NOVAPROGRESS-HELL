import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://llwhhmxsoukfixuqrqsd.supabase.co'; // Your URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsd2hobXhzb3VrZml4dXFycXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTE2OTgsImV4cCI6MjA4MTUyNzY5OH0.ZCD339ct6YTzTm0MNRC_vRBx0IZ3DPl9BqMHL-SQTTc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,     // ← ADDED: Critical for catching session after Google redirect
    flowType: 'pkce',             // ← ADDED: Best for SPAs, fixes timing issues
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
