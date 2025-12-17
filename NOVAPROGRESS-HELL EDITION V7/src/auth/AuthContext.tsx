import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // ✅ IMPORTANT: handle OAuth callback first (Google redirect)
        const { data } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (!mounted) return;

        if (data?.session) {
          setSession(data.session);
          setLoading(false);
          return;
        }

        // ✅ Normal session restore (refresh / direct visit)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(sessionData.session);
        setLoading(false);
      } catch {
        // Fallback: never block app
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // ✅ Keep listening to auth changes (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
