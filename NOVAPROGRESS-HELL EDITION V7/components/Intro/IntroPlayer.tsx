import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '../../utils/audioManager';
import MirrorButton from '../UI/MirrorButton';

interface IntroPlayerProps {
  onComplete: () => void;
}

const env = (import.meta as any).env || {};

// UPDATED URL
const INTRO_VIDEO_URL = 'https://voawdvkcqyikeilflzzt.supabase.co/storage/v1/object/public/animation/intro/v1/intro.mp4';
const INTRO_MUSIC_URL = env.VITE_INTRO_MUSIC || 'https://hnielgquavjcetnorgxn.supabase.co/storage/v1/object/public/sounds/intro/v2/intro.mp3';

const IntroPlayer: React.FC<IntroPlayerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [interacted, setInteracted] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let skipTimer: ReturnType<typeof setTimeout>;
    const btnTimer = setTimeout(() => setShowSkip(true), 3000);

    if (interacted) {
      // Auto-skip after video length approx (12s safe bet)
      skipTimer = setTimeout(() => {
        handleSkip();
      }, 12000);
    }

    return () => {
      clearTimeout(btnTimer);
      clearTimeout(skipTimer);
    };
  }, [interacted]);

  const handleInteraction = () => {
    if (interacted) return;
    setInteracted(true);
    
    // Play Intro Music
    audioManager.playIntroMusic(INTRO_MUSIC_URL, 0.25);
    
    // Play Video
    if (videoRef.current && !videoError) {
      videoRef.current.muted = false; // Unmute
      
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
            // AbortError is expected if user skips or component unmounts quickly
            if (e.name === 'AbortError') return;
            console.warn("Video play failed:", e);
        });
      }
    }
  };

  const handleSkip = () => {
    // Fade out music and proceed
    audioManager.stopIntroMusic();
    onComplete();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleInteraction}
    >
      {/* Video Layer */}
      {!videoError ? (
        <video
          ref={videoRef}
          src={INTRO_VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted // Start muted to allow autoplay visually (if needed before interaction)
          loop={false}
          onEnded={handleSkip}
          onError={() => setVideoError(true)}
        />
      ) : (
        // Fallback Layer - Dark Red Pulse
        <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-gray-900 animate-pulse-fast">
           <div className="absolute inset-0 opacity-20" 
                style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
           />
        </div>
      )}

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />

      <AnimatePresence>
        {!interacted ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px]"
          >
            <motion.div
               animate={{ scale: [1, 1.05, 1] }}
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <MirrorButton
                variant="brand"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleInteraction();
                }}
                className="!px-12 !py-6 border-red-500/30"
                text={
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                      NOVAPROGRESS
                    </span>
                    <span className="text-xs md:text-sm text-red-500 tracking-[0.8em] mt-2 uppercase font-mono">
                      HELL EDITION V7
                    </span>
                  </div>
                }
              />
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.5 }}
               transition={{ delay: 1, duration: 1 }}
               className="mt-12 text-[10px] font-mono text-white/30 tracking-[0.3em] uppercase"
            >
              [ TAP SCREEN TO INITIALIZE RITUAL ]
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
             initial={{ width: '0%' }}
             animate={{ width: '100%' }}
             transition={{ duration: 12, ease: 'linear' }} // Matches video length approx
             className="absolute bottom-0 left-0 h-[2px] bg-red-600 z-50 shadow-[0_0_20px_#ff0000]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSkip && interacted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 right-8 z-30"
          >
            <MirrorButton 
              text="SKIP RITUAL" 
              onClick={(e) => { e?.stopPropagation(); handleSkip(); }} 
              variant="ghost"
              className="!px-4 !py-2 !text-[10px] !border-white/10 opacity-50 hover:opacity-100"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntroPlayer;