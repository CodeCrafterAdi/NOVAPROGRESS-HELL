
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

// Providers
import { NotificationProvider } from '../components/UI/NotificationProvider';

// Components
import LoginPanel from '../components/Auth/LoginPanel';
import DashboardShell from '../components/HUD/DashboardShell';
import OnboardingSequence from '../components/Auth/OnboardingSequence';
import AuthCallback from '../src/auth/callback';

type Stage = 'LOGIN' | 'ONBOARDING' | 'DASHBOARD';

export default function Page() {
  // START DIRECTLY AT LOGIN (Skipping Intro/System Check)
  const [stage, setStage] = useState<Stage>('LOGIN');
  const [userId, setUserId] = useState<string | null>(null);

  // Simple routing for Auth Callback
  if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  useEffect(() => {
    const checkUser = async () => {
      // Check existing Supabase session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        handleLoginSuccess(existingSession.user.id);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            handleLoginSuccess(session.user.id);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (id: string) => {
    setUserId(id);
    checkProfileAndRedirect(id);
  };

  // Check if user has a profile to determine if Onboarding is needed
  const checkProfileAndRedirect = async (id: string) => {
    // Check Local Storage first for speed
    const localProfile = localStorage.getItem(`nova_profile_${id}`);
    
    if (localProfile) {
      setStage('DASHBOARD');
    } else {
      // Fallback: Check remote DB
      try {
          const { data } = await supabase.from('profiles').select('id').eq('id', id).single();
          if (data) {
              setStage('DASHBOARD');
          } else {
              setStage('ONBOARDING');
          }
      } catch (e) {
          // If remote fails and no local, default to Onboarding
          setStage('ONBOARDING');
      }
    }
  };

  const handleOnboardingComplete = () => {
    setStage('DASHBOARD');
  };

  return (
    <NotificationProvider>
      <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden select-none">
        <AnimatePresence mode="wait">
          
          {stage === 'LOGIN' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50, scale: 1.1, filter: 'blur(10px)' }}
              className="w-full h-full"
            >
               <LoginPanel onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          )}

          {stage === 'ONBOARDING' && userId && (
            <motion.div
               key="onboarding"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0, y: -50 }}
            >
               <OnboardingSequence userId={userId} onComplete={handleOnboardingComplete} />
            </motion.div>
          )}

          {stage === 'DASHBOARD' && userId && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="min-h-screen bg-[#050000]"
            >
               <DashboardShell userId={userId} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </NotificationProvider>
  );
}
