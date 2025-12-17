
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import MirrorButton from '../UI/MirrorButton';
import { supabase } from '../../lib/supabaseClient';
import { audioManager } from '../../utils/audioManager';
import { UserProfile } from '../../types';
import { useNotification } from '../UI/NotificationProvider';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

const OnboardingSequence: React.FC<OnboardingProps> = ({ userId, onComplete }) => {
  const { addToast } = useNotification();
  const [step, setStep] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    username: '',
    gender: 'MALE',
    dob: '',
    height: '',
    weight: '',
    age: '',
  });

  // --- BACKGROUND SPIKES EFFECT (From SystemOnline) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const spikes: {x: number, h: number, speed: number, maxH: number}[] = [];
    const spikeCount = Math.floor(w / 15);
    
    for (let i = 0; i < spikeCount; i++) {
        spikes.push({
            x: i * 20,
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
            s.h += Math.sin(time * 0.05 * s.speed) * 2;
            if(s.h < 0) s.h = 0;
            ctx.moveTo(s.x, h);
            ctx.lineTo(s.x + 10, h - s.h);
            ctx.lineTo(s.x + 20, h);
        });
        ctx.fill();

        // Stronger foreground spikes
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

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleChange('dob', val);
    handleChange('age', calculateAge(val));
  };

  const handlePhase1Next = () => {
      // -----------------------------------------------------
      // VALIDATION: PHASE 1 (IDENTITY)
      // -----------------------------------------------------
      if(!formData.username?.trim()) {
          addToast("CODENAME REQUIRED", "error");
          audioManager.playSfx('ERROR');
          return;
      }
      if(!formData.gender) {
          addToast("BIOLOGICAL FRAME REQUIRED", "error");
          audioManager.playSfx('ERROR');
          return;
      }
      audioManager.playSfx('LEVEL_UP');
      setStep(2);
  };

  const handleSubmit = async () => {
    // -----------------------------------------------------
    // STRICT VALIDATION: PHASE 2 (BIOMETRICS)
    // -----------------------------------------------------
    if (!formData.dob) { addToast("DATE OF BIRTH REQUIRED", "error"); return; }
    if (!formData.height || Number(formData.height) <= 0) { addToast("VALID HEIGHT REQUIRED", "error"); return; }
    if (!formData.weight || Number(formData.weight) <= 0) { addToast("VALID WEIGHT REQUIRED", "error"); return; }

    // PREPARE PROFILE DATA
    const profile: UserProfile = {
      id: userId,
      email: 'user@nova.system', // Fallback, real email comes from Auth if needed
      username: formData.username!.toUpperCase(),
      gender: formData.gender as 'MALE' | 'FEMALE' | 'OTHER',
      dob: formData.dob,
      age: formData.age || '0',
      height: formData.height,
      weight: formData.weight,
      bio: 'Initiate ready for ascension.',
      avatar_url: ''
    };

    // SAVE TO SUPABASE & LOCAL
    try {
      await supabase.from('profiles').upsert(profile);
    } catch (e) {
      console.warn('Remote profile sync failed, using local fallback.');
    }

    localStorage.setItem(`nova_profile_${userId}`, JSON.stringify(profile));
    audioManager.playSfx('LEVEL_UP');
    onComplete();
  };

  // Phase Transition Variants
  const phaseVariants: Variants = {
      initial: { opacity: 0, x: 100, scale: 0.95 },
      animate: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", bounce: 0.2, duration: 0.6 } },
      exit: { opacity: 0, x: -100, scale: 0.95, transition: { duration: 0.4 } }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#050000] relative overflow-hidden">
      
      {/* 1. Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-50 pointer-events-none" />
      
      {/* 2. Atmosphere Overlays */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-t from-red-950/20 via-transparent to-black/80" />
      
      <div className="relative z-10 w-full max-w-3xl p-6">
        {/* Main Card Container */}
        <motion.div 
          layout
          className="
            relative bg-black/60 backdrop-blur-2xl 
            border border-red-900/40 
            rounded-[3rem] 
            p-8 md:p-16 
            shadow-[0_0_60px_rgba(220,38,38,0.15),inset_0_0_20px_rgba(0,0,0,0.8)]
            overflow-hidden
          "
        >
          {/* Header Progress */}
          <div className="mb-10 flex justify-between items-end border-b border-red-500/20 pb-6 relative">
             <div>
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={step}
                    className="text-3xl md:text-4xl font-display font-black text-white italic tracking-tighter drop-shadow-md"
                >
                    IDENTITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">CONFIG</span>
                </motion.h2>
                <p className="text-red-400/60 font-mono text-xs tracking-[0.4em] mt-1 uppercase">Phase 0{step} // Initialization</p>
             </div>
             
             {/* Progress Dots */}
             <div className="flex gap-3">
               {[1, 2].map(i => (
                 <motion.div 
                    key={i}
                    animate={{ 
                        backgroundColor: step >= i ? '#ef4444' : '#1f2937',
                        scale: step === i ? 1.2 : 1,
                        boxShadow: step >= i ? '0 0 10px #ef4444' : 'none'
                    }}
                    className="w-2 h-2 rounded-full" 
                 />
               ))}
             </div>
             
             {/* Decorative Scan Line */}
             <motion.div 
                className="absolute bottom-[-1px] left-0 h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444]"
                initial={{ width: "0%" }}
                animate={{ width: step === 1 ? "50%" : "100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
             />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
               <motion.div 
                 key="phase1"
                 variants={phaseVariants}
                 initial="initial"
                 animate="animate"
                 exit="exit"
                 className="space-y-10"
               >
                  {/* Codename Input */}
                  <div className="space-y-3 group">
                     <label className="text-xs font-mono text-gray-500 uppercase tracking-widest group-focus-within:text-red-400 transition-colors">
                        Codename / Username <span className="text-red-500">*</span>
                     </label>
                     <input 
                        autoFocus
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        placeholder="ENTER HUNTER NAME..."
                        className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-6 text-2xl text-white placeholder-white/10 outline-none font-display tracking-wider transition-all duration-300 focus:border-red-500 focus:bg-red-950/10 focus:shadow-[0_0_30px_rgba(220,38,38,0.2)]"
                     />
                  </div>

                  {/* Biological Frame */}
                  <div className="space-y-3">
                     <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Biological Frame <span className="text-red-500">*</span></label>
                     <div className="grid grid-cols-3 gap-4">
                        {['MALE', 'FEMALE', 'OTHER'].map(g => (
                           <motion.button 
                             key={g}
                             whileHover={{ scale: 1.05, borderColor: 'rgba(239,68,68,0.8)' }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => {
                                 handleChange('gender', g);
                                 audioManager.playSfx('CLICK');
                             }}
                             className={`
                                relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-300
                                ${formData.gender === g 
                                    ? 'bg-red-600/20 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                                    : 'bg-black/40 border-white/5 text-gray-600 hover:text-white hover:bg-white/5'
                                }
                             `}
                           >
                              <span className="relative z-10 font-bold tracking-widest text-sm">{g}</span>
                              {formData.gender === g && (
                                <motion.div 
                                    layoutId="gender-glow"
                                    className="absolute inset-0 bg-red-500/10 blur-sm"
                                />
                              )}
                           </motion.button>
                        ))}
                     </div>
                  </div>

                  <div className="pt-8 flex justify-end">
                     <MirrorButton 
                       text="NEXT PHASE" 
                       shape="octagonal"
                       variant="primary"
                       className="!px-10 !py-5 border-red-500/50 hover:border-red-500 text-lg shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                       reflectionDirection="rtl"
                       reflectionColor="from-transparent via-red-500/60 to-transparent"
                       onClick={handlePhase1Next} 
                     />
                  </div>
               </motion.div>
            )}

            {step === 2 && (
               <motion.div 
                 key="phase2"
                 variants={phaseVariants}
                 initial="initial"
                 animate="animate"
                 exit="exit"
                 className="space-y-8"
               >
                  {/* Date & Age */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3 group">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest group-focus-within:text-red-400">Date of Birth <span className="text-red-500">*</span></label>
                        <input 
                           type="date"
                           value={formData.dob}
                           onChange={handleDobChange}
                           className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all"
                        />
                     </div>
                     <div className="space-y-3 opacity-50">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Calculated Age</label>
                        <input 
                           disabled
                           value={formData.age}
                           className="w-full bg-transparent border-b border-white/10 p-5 text-red-500 font-mono text-xl"
                        />
                     </div>
                  </div>

                  {/* Biometrics */}
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3 group">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest group-focus-within:text-red-400">Height (CM) <span className="text-red-500">*</span></label>
                        <input 
                           type="number"
                           value={formData.height}
                           onChange={(e) => handleChange('height', e.target.value)}
                           placeholder="180"
                           className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all"
                        />
                     </div>
                     <div className="space-y-3 group">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest group-focus-within:text-red-400">Weight (KG) <span className="text-red-500">*</span></label>
                        <input 
                           type="number"
                           value={formData.weight}
                           onChange={(e) => handleChange('weight', e.target.value)}
                           placeholder="75"
                           className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all"
                        />
                     </div>
                  </div>

                  <div className="pt-8 flex gap-6 items-center">
                     <MirrorButton 
                       text="BACK" 
                       shape="rect"
                       variant="ghost"
                       onClick={() => {
                           audioManager.playSfx('CLICK');
                           setStep(1);
                       }} 
                       className="flex-1 opacity-50 hover:opacity-100"
                     />
                     <MirrorButton 
                       text="INITIALIZE SOUL" 
                       shape="octagonal"
                       onClick={handleSubmit} 
                       className="flex-[2] !py-5 border-red-500/50 hover:border-white text-lg shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                       reflectionDirection="rtl"
                       reflectionColor="from-transparent via-red-500 to-transparent"
                     />
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Decorative elements behind card */}
        <div className="absolute -z-10 top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-[80px]" />
        <div className="absolute -z-10 bottom-0 left-0 w-64 h-64 bg-red-900/10 rounded-full blur-[80px]" />
      </div>
    </div>
  );
};

export default OnboardingSequence;
