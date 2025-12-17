
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '../../utils/audioManager';

interface LevelUpProps {
  level: number;
  onClose: () => void;
}

const LevelUpOverlay: React.FC<LevelUpProps> = ({ level, onClose }) => {
  useEffect(() => {
    audioManager.playSfx('LEVEL_UP');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl cursor-pointer"
      onClick={onClose}
    >
      {/* Background Burst */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div 
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 2, opacity: [0, 0.5, 0] }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-600 blur-[100px]"
         />
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <h2 className="text-red-500 font-mono text-sm tracking-[1em] mb-4 uppercase animate-pulse">
            Soul Evolution
          </h2>
          <h1 className="text-8xl md:text-9xl font-display font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]">
            LEVEL <span className="text-red-600">{level}</span>
          </h1>
        </motion.div>

        <motion.div
           initial={{ width: 0 }}
           animate={{ width: "100%" }}
           transition={{ delay: 0.5, duration: 0.5 }}
           className="h-1 bg-white/20 w-full max-w-md mt-8 mb-8 relative overflow-hidden"
        >
           <motion.div 
             className="absolute inset-0 bg-red-500"
             initial={{ x: "-100%" }}
             animate={{ x: "0%" }}
             transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
           />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-2 text-gray-400 font-mono text-xs uppercase tracking-widest"
        >
           <p>+ STAT POINTS ACQUIRED</p>
           <p>+ NEW TITLES UNLOCKED</p>
           <p className="text-white pt-4">[ CLICK TO CONTINUE ]</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LevelUpOverlay;
