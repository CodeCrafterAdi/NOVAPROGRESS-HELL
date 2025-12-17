
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MirrorButton from '../UI/MirrorButton';
import { audioManager } from '../../utils/audioManager';

interface SystemOnlineProps {
  onProceed: () => void;
  onRetry: () => void;
}

const env = (import.meta as any).env || {};

const SystemOnlineScreen: React.FC<SystemOnlineProps> = ({ onProceed, onRetry }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleProceed = () => {
    // Fades out music
    audioManager.stopIntroMusic();
    onProceed();
  };

  const handleRetry = () => {
    // User hesitated. 
    onRetry();
  };

  // Background Animation: Smokes & Spikes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    // Spike Particles
    const spikes: {x: number, h: number, speed: number, maxH: number}[] = [];
    const spikeCount = Math.floor(w / 10);
    
    for (let i = 0; i < spikeCount; i++) {
        spikes.push({
            x: i * 15,
            h: Math.random() * 50,
            maxH: 50 + Math.random() * 150,
            speed: 0.5 + Math.random() * 2
        });
    }

    let animationFrameId: number;
    let time = 0;

    const render = () => {
        time++;
        ctx.fillStyle = '#050000';
        ctx.fillRect(0, 0, w, h);

        // Draw Spikes
        ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        ctx.beginPath();
        spikes.forEach(s => {
            // Fluctuate height
            s.h += Math.sin(time * 0.05 * s.speed) * 2;
            if(s.h < 0) s.h = 0;
            
            // Draw triangle spike coming from bottom
            ctx.moveTo(s.x, h);
            ctx.lineTo(s.x + 7, h - s.h);
            ctx.lineTo(s.x + 14, h);
        });
        ctx.fill();

        // Draw stronger spikes layer
        ctx.fillStyle = 'rgba(200, 0, 0, 0.1)';
        ctx.beginPath();
        spikes.forEach((s, i) => {
            if (i % 3 === 0) {
                 const height = s.h * 0.8 + Math.sin(time * 0.1) * 20;
                 ctx.moveTo(s.x, h);
                 ctx.lineTo(s.x + 10, h - height);
                 ctx.lineTo(s.x + 20, h);
            }
        });
        ctx.fill();

        animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#050000] overflow-hidden">
      
      {/* 1. Canvas Background: Spikes */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" />

      {/* 2. CSS Smoke/Atmosphere Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-radial from-red-900/10 via-transparent to-black opacity-80 animate-pulse-fast" />
          <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-red-950/50 to-transparent opacity-60" />
      </div>
      
      {/* Main Content */}
      <div className="max-w-5xl w-full flex flex-col items-center text-center relative z-10">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-16 border-l-4 border-r-4 border-[#ff2b2b]/50 px-8 py-12 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(255,0,0,0.1)]"
        >
          <h2 className="font-mono text-[#ff2b2b] text-sm tracking-[0.5em] mb-4 uppercase drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">
            NOVAPROGRESS-V7
          </h2>
          
          <h1 className="font-display text-5xl md:text-8xl font-bold text-white tracking-tighter leading-none mb-2">
            CHOSEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2b2b] to-[#ff0000] drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">PLAYER</span>
          </h1>
          
          <p className="font-sans text-xl text-gray-300 mt-6 tracking-wide max-w-2xl mx-auto border-t border-white/10 pt-6">
            Do you have guts to fight for yourself?
            <br/><span className="text-red-500/50 text-sm font-mono mt-2 block animate-pulse">WARNING: WEAKNESS WILL BE PURGED.</span>
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full md:w-auto"
          >
            <MirrorButton 
              text="ACCEPT CONTRACT" 
              onClick={handleProceed}
              variant="primary"
              className="w-full md:w-72 !text-xl !py-5 border-red-500/30 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.4)]"
              reflectionDirection="rtl" // Right to Left
              reflectionColor="from-transparent via-red-500/40 to-transparent" // Red Gradient
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full md:w-auto"
          >
            <MirrorButton 
              text="REJECT" 
              onClick={handleRetry}
              variant="danger"
              className="w-full md:w-48 opacity-80 hover:opacity-100"
            />
          </motion.div>
        </div>
        
        <motion.div 
          className="absolute bottom-[-100px] md:bottom-[-150px] font-mono text-[10px] text-red-500/20 tracking-[0.2em]"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          SESSION ID: {env.VITE_BYPASS_USER_ID?.slice(0, 8) || 'ERR_NULL'}
        </motion.div>

      </div>
    </div>
  );
};

export default SystemOnlineScreen;
