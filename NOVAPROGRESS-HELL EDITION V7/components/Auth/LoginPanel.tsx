import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../UI/NotificationProvider';
import MirrorButton from '../UI/MirrorButton';
import { audioManager } from '../../utils/audioManager';

interface LoginPanelProps {
  onLoginSuccess: (userId: string) => void;
}

const BG_VIDEO_URL = "https://llwhhmxsoukfixuqrqsd.supabase.co/storage/v1/object/public/intro/animation/login/background_circle.mp4";

const LoginPanel: React.FC<LoginPanelProps> = ({ onLoginSuccess }) => {
  const { addToast } = useNotification();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // --- HANDLERS ---
  const handleProviderLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin, // ← FIXED: Redirect to root for reliable session restore on all devices
      },
    });
    if (error) {
      addToast(`CONNECTION FAILED: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        addToast("CREDENTIALS MISSING", "error");
        return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin, // ← Also updated for consistency (was /auth/callback)
      },
    });
    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast('ENCRYPTION KEY SENT TO INBOX', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050000] text-white selection:bg-red-900 selection:text-white font-sans">
     
      {/* GLOBAL BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {!videoError ? (
            <video
              src={BG_VIDEO_URL} autoPlay loop muted playsInline preload="auto"
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover opacity-30 transition-opacity duration-1000 grayscale contrast-125 brightness-50"
            />
        ) : (
            <div className="w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black opacity-50" />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_90%)]" />
      </div>

      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="relative z-20 w-full max-w-md px-6"
      >
          {/* HEADER */}
          <div className="text-center mb-10">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/30 bg-black/50 backdrop-blur-md mb-6"
              >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[10px] font-mono tracking-[0.2em] text-red-500 uppercase">SYSTEM V8 ONLINE</span>
              </motion.div>
             
              <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white mb-2 drop-shadow-2xl">
                  NOVA<span className="text-red-600">PRO</span>
              </h1>
              <p className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase">Hell Edition</p>
          </div>

          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative rounded-2xl">
             
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/20 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/20 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20 rounded-br-xl" />

              <div className="space-y-4">
                  {/* SOCIAL LOGIN: GOOGLE */}
                  <button
                      onClick={() => handleProviderLogin('google')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-b from-gray-800 to-black border border-white/20 hover:border-white/50 hover:from-gray-700 hover:to-gray-900 transition-all group shadow-lg"
                  >
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white group-hover:text-gray-200">Continue with Google</span>
                  </button>

                  {/* SOCIAL LOGIN: GITHUB */}
                  <button
                      onClick={() => handleProviderLogin('github')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-black border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all group"
                  >
                      <svg className="w-4 h-4 fill-white group-hover:fill-red-500 transition-colors" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-300 group-hover:text-white">Continue with GitHub</span>
                  </button>

                  <div className="flex items-center gap-4 py-2">
                      <div className="h-[1px] flex-1 bg-white/10" />
                      <span className="text-[10px] font-mono text-gray-600 uppercase">OR</span>
                      <div className="h-[1px] flex-1 bg-white/10" />
                  </div>

                  {/* EMAIL LOGIN */}
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                      <input
                          type="email"
                          placeholder="OPERATIVE EMAIL"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black border border-white/20 rounded-xl p-4 text-xs font-mono text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors text-center uppercase tracking-wider"
                      />
                      <MirrorButton
                          text={loading ? "SENDING..." : "INITIATE LINK"}
                          onClick={() => {}}
                          className="!w-full !py-4 !text-xs !border-white/20 hover:border-white"
                          variant="ghost"
                      />
                  </form>
              </div>
          </div>
         
          {/* Footer DECOR */}
          <div className="mt-12 flex justify-center gap-8 opacity-30">
              <div className="w-1 h-8 bg-gradient-to-b from-transparent via-red-500 to-transparent" />
              <div className="w-1 h-8 bg-gradient-to-b from-transparent via-red-500 to-transparent" />
              <div className="w-1 h-8 bg-gradient-to-b from-transparent via-red-500 to-transparent" />
          </div>
      </motion.div>
    </div>
  );
};

export default LoginPanel;
