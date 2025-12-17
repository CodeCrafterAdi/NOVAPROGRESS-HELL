
import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://voawdvkcqyikeilflzzt.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWVsZ3F1YXZqY2V0bm9yZ3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTUzNjYsImV4cCI6MjA3OTk5MTM2Nn0.FBQIkcKLtoFCt3rBV42Tk-zl06V3wD9F0bifrCF8siI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
