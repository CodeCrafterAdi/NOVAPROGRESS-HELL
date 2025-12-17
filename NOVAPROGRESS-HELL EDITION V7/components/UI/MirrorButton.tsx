
import React from 'react';
import { motion, Variants } from 'framer-motion';

interface MirrorButtonProps {
  text: React.ReactNode;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'brand';
  className?: string;
  disabled?: boolean;
  reflectionDirection?: 'ltr' | 'rtl';
  reflectionColor?: string;
  shape?: 'pill' | 'octagonal' | 'rect';
}

const MirrorButton: React.FC<MirrorButtonProps> = ({ 
  text, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  reflectionDirection = 'ltr',
  reflectionColor = 'from-transparent via-white/20 to-transparent'
}) => {
  const isRTL = reflectionDirection === 'rtl';
  const initialX = isRTL ? '100%' : '-100%';
  const hoverX = isRTL ? '-100%' : '100%';

  // RGB Loop Animation for Background
  const rgbVariants: Variants = {
    animate: {
      backgroundColor: [
        'rgba(239, 68, 68, 0.15)',  // Red
        'rgba(59, 130, 246, 0.15)', // Blue
        'rgba(34, 197, 94, 0.15)',  // Green
        'rgba(168, 85, 247, 0.15)', // Purple
        'rgba(239, 68, 68, 0.15)'   // Back to Red
      ],
      borderColor: [
        'rgba(239, 68, 68, 0.3)',
        'rgba(59, 130, 246, 0.3)',
        'rgba(34, 197, 94, 0.3)',
        'rgba(168, 85, 247, 0.3)',
        'rgba(239, 68, 68, 0.3)'
      ],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const reflectionVariants: Variants = {
    idle: { x: initialX, opacity: 0, skewX: -20 },
    hover: { 
      x: hoverX, 
      opacity: 1, 
      skewX: -20,
      transition: { x: { duration: 0.6, ease: "easeInOut" }, opacity: { duration: 0.2 } }
    }
  };

  return (
    <motion.button
      initial="idle"
      whileHover={!disabled ? "hover" : "idle"}
      whileTap={!disabled ? { scale: 0.98 } : "idle"}
      variants={variant !== 'ghost' ? rgbVariants : {}}
      animate={variant !== 'ghost' ? "animate" : undefined}
      onClick={(e) => !disabled && onClick(e)}
      className={`
        relative overflow-hidden
        px-8 py-4
        font-display tracking-[0.1em] uppercase font-bold text-xs md:text-sm
        flex items-center justify-center
        transition-all duration-300
        backdrop-blur-md
        rounded-xl /* RECTANGLE WITH CURVNESS */
        border
        ${variant === 'ghost' ? 'border-transparent text-gray-400 hover:text-white hover:bg-white/5' : 'text-white border-white/10'}
        ${className}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
    >
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
        {text}
      </span>
      
      {/* Mirror Sweep Overlay */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${reflectionColor} pointer-events-none z-20`} 
        variants={reflectionVariants}
      />
      
      {/* Inner Glow Border */}
      <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none" />
    </motion.button>
  );
};

export default MirrorButton;
