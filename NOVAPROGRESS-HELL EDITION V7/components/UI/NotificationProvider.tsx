/* RESPONSIVE NOTES:
   - Toasts appear top-right on desktop, top-center on mobile.
   - Auto-dismiss after 3s.
*/
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '../../utils/audioManager';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addToast: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Play sound based on type
    if (type === 'error') audioManager.playSfx('ERROR');
    else if (type === 'success') audioManager.playSfx('LEVEL_UP'); // Or a dedicated success sound
    else audioManager.playSfx('HOVER');

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-0 left-0 md:left-auto md:right-4 z-[9999] flex flex-col items-center md:items-end gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              layout
              className={`
                pointer-events-auto
                min-w-[300px] max-w-sm
                p-4 rounded-[16px]
                backdrop-blur-xl border
                shadow-[0_0_20px_rgba(0,0,0,0.5)]
                flex items-center justify-between
                ${toast.type === 'success' ? 'bg-green-900/40 border-green-500/50 text-green-100' : 
                  toast.type === 'error' ? 'bg-red-900/40 border-red-500/50 text-red-100' : 
                  'bg-gray-900/80 border-white/20 text-white'}
              `}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]" />}
                {toast.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />}
                <span className="font-display tracking-wide text-sm">{toast.message}</span>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="ml-4 text-white/40 hover:text-white"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
