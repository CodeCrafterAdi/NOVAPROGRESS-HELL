import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IntroPlayer from './components/Intro/IntroPlayer';
import SystemOnlineScreen from './components/Intro/SystemOnlineScreen';
import { audioManager } from './utils/audioManager';
import { supabase } from './lib/supabaseClient';

// Types
type AppStage = 'INTRO' | 'SYSTEM_CHECK' | 'LOGIN' | 'DASHBOARD';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>('INTRO');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for developer bypass or existing session
    const checkSession = async () => {
      // Dev bypass check
      const isDev = process.env.NODE_ENV === 'development';
      const bypassId = process.env.NEXT_PUBLIC_BYPASS_USER_ID;

      if (isDev && bypassId) {
        console.log("DEV BYPASS ACTIVE");
        // In a real app we would set a mock session, here we just track ID
        setUserId(bypassId);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
        }
      }
    };
    checkSession();
  }, []);

  const handleIntroComplete = () => {
    setStage('SYSTEM_CHECK');
  };

  const handleSystemProceed = () => {
    audioManager.playSfx('LEVEL_UP');
    audioManager.stopIntroMusic();
    
    // If user is already "logged in" (or bypassed), go to Dashboard
    if (userId) {
      setStage('DASHBOARD');
    } else {
      setStage('LOGIN');
    }
  };

  const handleSystemRetry = () => {
    // Pulse red effect or shake screen (simplified here)
    console.log("Retry clicked - user hesitation recorded");
  };

  const handleLoginSuccess = (id: string) => {
    setUserId(id);
    setStage('DASHBOARD');
  };

  return (
    <div className="relative min-h-screen bg-nova-dark text-white overflow-hidden selection:bg-nova-mind selection:text-white">
      <AnimatePresence mode='wait'>
        
        {stage === 'INTRO' && (
          <motion.div
            key="intro"
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <IntroPlayer 
              onComplete={handleIntroComplete} 
            />
          </motion.div>
        )}

        {stage === 'SYSTEM_CHECK' && (
          <motion.div
            key="system"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
          >
            <SystemOnlineScreen 
              onProceed={handleSystemProceed}
              onRetry={handleSystemRetry}
            />
          </motion.div>
        )}

        {stage === 'LOGIN' && (
          <motion.div
             key="login"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex items-center justify-center h-screen"
          >
             {/* Simple Login Placeholder for this step */}
             <div className="text-center">
                <h2 className="text-3xl font-display mb-8">AUTHENTICATE SOUL</h2>
                <button 
                  onClick={() => handleLoginSuccess('user-123')}
                  className="px-8 py-3 bg-nova-mind hover:bg-red-700 transition rounded text-white font-bold"
                >
                  ENTER // GUEST MODE
                </button>
             </div>
          </motion.div>
        )}

        {stage === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="p-8 h-screen w-full relative"
          >
            {/* Dashboard Skeleton */}
            <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-4">
               <h1 className="text-4xl font-display font-bold tracking-widest text-nova-mind drop-shadow-[0_0_10px_rgba(255,43,43,0.5)]">
                 NOVA<span className="text-white">PROGRESS</span>
               </h1>
               <div className="flex gap-4 items-center">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">CURRENT RANK</div>
                    <div className="font-bold text-xl">INITIATE</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-nova-mind overflow-hidden">
                    <img src="https://picsum.photos/200" alt="Profile" className="w-full h-full object-cover" />
                  </div>
               </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
              {/* Category Placeholders */}
              {['MIND', 'COMMUNICATION', 'CREATIVE', 'FITNESS'].map((cat, i) => (
                <div key={cat} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col relative group hover:border-nova-mind/50 transition-colors">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nova-mind to-transparent opacity-50" />
                   <h3 className="font-display text-2xl mb-4 text-gray-200 tracking-wider">{cat}</h3>
                   <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                      NO TASKS PENDING
                   </div>
                </div>
              ))}
            </main>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default App;